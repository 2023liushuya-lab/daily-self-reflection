import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { structureReview } from '../services/deepseek';
import { recognizeAudio } from '../services/asr';

const prisma = new PrismaClient();
export const reviewsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

reviewsRouter.use(authMiddleware);

// POST /api/reviews/upload-audio
reviewsRouter.post('/upload-audio', upload.single('audio'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '未上传音频文件' });
  }

  try {
    const audioBase64 = req.file.buffer.toString('base64');
    const text = await recognizeAudio(audioBase64, req.file.buffer.length);
    return res.json({ success: true, data: { text } });
  } catch (err: any) {
    console.error('[ASR Error]', err.message);
    return res.status(500).json({ success: false, error: '语音识别失败，请重试' });
  }
});

// POST /api/reviews
const createReviewSchema = z.object({
  rawText: z.string().min(1, '复盘内容不能为空').max(5000),
  scopeArea: z.enum(['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE']).optional().default('WORK'),
});

reviewsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { rawText, scopeArea } = parsed.data;

  const [user, goals] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.annualGoal.findMany({ where: { userId: req.userId, status: 'ACTIVE' } }),
  ]);

  const userProfile = user?.profile ? JSON.stringify(user.profile) : undefined;
  const annualGoals = goals.length > 0
    ? goals.map(g => `- ${g.title}（进度: ${g.progress}%）`).join('\n')
    : undefined;

  let structured;
  try {
    structured = await structureReview(rawText, { userProfile, annualGoals });
  } catch (err: any) {
    console.error('[DeepSeek Error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 处理失败，请稍后重试' });
  }

  const review = await prisma.review.create({
    data: {
      userId: req.userId!,
      rawText,
      scopeArea,
      gdrrGoal: structured.gdrr.goal,
      gdrrResult: structured.gdrr.result,
      gdrrDifference: structured.gdrr.difference,
      gdrrReason: structured.gdrr.reason,
      tags: structured.tags,
      coachQuestions: structured.coachQuestions,
      insightCandidates: structured.insightCandidates,
      growthSignals: structured.growthSignals,
      relatedGoals: structured.relatedGoals,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: review.id,
      userId: review.userId,
      rawText: review.rawText,
      audioUrl: review.audioUrl,
      scopeArea: review.scopeArea,
      gdrr: {
        goal: review.gdrrGoal,
        result: review.gdrrResult,
        difference: review.gdrrDifference,
        reason: review.gdrrReason,
      },
      tags: review.tags,
      coachQuestions: review.coachQuestions,
      insightCandidates: review.insightCandidates,
      growthSignals: review.growthSignals,
      relatedGoals: review.relatedGoals,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    },
  });
});

// GET /api/reviews
reviewsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const scopeArea = req.query.scopeArea as string | undefined;

  const where: any = { userId: req.userId };
  if (scopeArea) where.scopeArea = scopeArea;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  const data = reviews.map(r => ({
    id: r.id,
    userId: r.userId,
    rawText: r.rawText,
    audioUrl: r.audioUrl,
    scopeArea: r.scopeArea,
    gdrr: { goal: r.gdrrGoal, result: r.gdrrResult, difference: r.gdrrDifference, reason: r.gdrrReason },
    tags: r.tags,
    coachQuestions: r.coachQuestions,
    insightCandidates: r.insightCandidates,
    growthSignals: r.growthSignals,
    relatedGoals: r.relatedGoals,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return res.json({ success: true, data, total, page, pageSize });
});

// GET /api/reviews/:id
reviewsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  return res.json({
    success: true,
    data: {
      id: review.id,
      userId: review.userId,
      rawText: review.rawText,
      audioUrl: review.audioUrl,
      scopeArea: review.scopeArea,
      gdrr: { goal: review.gdrrGoal, result: review.gdrrResult, difference: review.gdrrDifference, reason: review.gdrrReason },
      tags: review.tags,
      coachQuestions: review.coachQuestions,
      insightCandidates: review.insightCandidates,
      growthSignals: review.growthSignals,
      relatedGoals: review.relatedGoals,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    },
  });
});

// PUT /api/reviews/:id
reviewsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  const data: any = {};
  if (req.body.rawText !== undefined) data.rawText = req.body.rawText;
  if (req.body.scopeArea !== undefined) data.scopeArea = req.body.scopeArea;
  if (req.body.gdrrGoal !== undefined) data.gdrrGoal = req.body.gdrrGoal;
  if (req.body.gdrrResult !== undefined) data.gdrrResult = req.body.gdrrResult;
  if (req.body.gdrrDifference !== undefined) data.gdrrDifference = req.body.gdrrDifference;
  if (req.body.gdrrReason !== undefined) data.gdrrReason = req.body.gdrrReason;
  if (req.body.tags !== undefined) data.tags = req.body.tags;

  const updated = await prisma.review.update({
    where: { id: req.params.id },
    data,
  });

  return res.json({
    success: true,
    data: {
      id: updated.id,
      gdrr: { goal: updated.gdrrGoal, result: updated.gdrrResult, difference: updated.gdrrDifference, reason: updated.gdrrReason },
      tags: updated.tags,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  await prisma.review.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});
