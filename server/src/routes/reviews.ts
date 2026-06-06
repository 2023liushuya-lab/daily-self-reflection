import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { structureReview, cleanASRText } from '../services/deepseek';
import { recognizeAudio } from '../services/asr';
import { analyzeGoalProgress } from '../services/goal-tracker';

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
    const rawText = await recognizeAudio(audioBase64, req.file.buffer.length);
    console.log('[ASR] Raw text:', rawText.slice(0, 100));

    // Clean and correct the ASR text
    const cleanedText = await cleanASRText(rawText);
    console.log('[ASR] Cleaned text:', cleanedText.slice(0, 100));

    return res.json({ success: true, data: { rawText, text: cleanedText } });
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
      tags: structured.tags as any,
      coachQuestions: structured.coachQuestions as any,
      insightCandidates: structured.insightCandidates as any,
      growthSignals: structured.growthSignals as any,
      relatedGoals: structured.relatedGoals as any,
    },
  });

  // ---- Async: track goal progress from this review ----
  if (goals.length > 0) {
    analyzeGoalProgress(
      rawText,
      structured.gdrr,
      goals.map(g => ({
        id: g.id,
        title: g.title,
        category: g.category,
        keyResults: (g.keyResults as any[]) || [],
      }))
    ).then(async (updates) => {
      for (const update of updates) {
        try {
          const goal = goals.find(g => g.id === update.goalId);
          if (!goal) continue;

          // Update key result current values
          const existingKRs = (goal.keyResults as any[]) || [];
          const updatedKRs = existingKRs.map((kr: any) => {
            const match = update.keyResultUpdates.find((u: any) => u.id === kr.id);
            if (match) {
              return { ...kr, current: Math.min(match.newCurrent, kr.target) };
            }
            return kr;
          });

          // Calculate overall progress (direction-aware)
          const overallProgress = updatedKRs.length > 0
            ? Math.round(
                updatedKRs.reduce((sum: number, kr: any) => {
                  if (kr.direction === 'down' && kr.startValue != null) {
                    const total = kr.startValue - kr.target;
                    if (total <= 0) return sum;
                    const done = kr.startValue - kr.current;
                    return sum + Math.min(Math.max((done / total) * 100, 0), 100);
                  }
                  return sum + (kr.target > 0 ? (kr.current / kr.target) * 100 : 0);
                }, 0) / updatedKRs.length
              )
            : update.overallProgress || 0;

          await prisma.annualGoal.update({
            where: { id: update.goalId },
            data: {
              keyResults: updatedKRs,
              progress: Math.min(overallProgress, 100),
            },
          });

          console.log(`[GoalTracker] Updated goal "${goal.title}": progress ${overallProgress}% — ${update.summary}`);
        } catch (err: any) {
          console.error('[GoalTracker] Failed to update goal:', err.message);
        }
      }
    }).catch(err => {
      console.error('[GoalTracker] Analysis failed:', err.message);
    });
  }

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

// GET /api/reviews/stats — streak and weekly stats
reviewsRouter.get('/stats', async (req: AuthRequest, res: Response) => {
  const allReviews = await prisma.review.findMany({
    where: { userId: req.userId },
    select: { createdAt: true },
    orderBy: { createdAt: 'desc' },
  });

  const reviewDays = new Set(allReviews.map(r => new Date(r.createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const checkDate = new Date(today);
  while (reviewDays.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const now = new Date();
  const weekStart = new Date(now);
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  weekStart.setDate(now.getDate() - mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const weekCount = allReviews.filter(r => new Date(r.createdAt) >= weekStart).length;
  const totalCount = allReviews.length;

  return res.json({
    success: true,
    data: { streak, weekCount, totalCount, todayChecked: reviewDays.has(today) },
  });
});

// GET /api/reviews
reviewsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const scopeArea = req.query.scopeArea as string | undefined;
  const search = req.query.search as string | undefined;
  const tag = req.query.tag as string | undefined;

  const where: any = { userId: req.userId };
  if (scopeArea) where.scopeArea = scopeArea;
  if (search) {
    where.rawText = { contains: search, mode: 'insensitive' };
  }
  if (tag) {
    // Filter by tag in JSON array (PostgreSQL supports array_contains on JSON)
    try {
      where.tags = { array_contains: [tag] };
    } catch { /* ignore if not supported */ }
  }

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
