import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateCoachReply } from '../services/coach';

const prisma = new PrismaClient();
export const coachRouter = Router();

coachRouter.use(authMiddleware);

// GET /api/reviews/:reviewId/coach-messages
coachRouter.get('/:reviewId/coach-messages', async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;

  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  const messages = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  return res.json({
    success: true,
    data: messages.map(m => ({
      id: m.id,
      reviewId: m.reviewId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

// POST /api/reviews/:reviewId/coach-messages
coachRouter.post('/:reviewId/coach-messages', async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ success: false, error: '消息内容不能为空' });
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  await prisma.coachMessage.create({
    data: { reviewId, role: 'USER', content: content.trim() },
  });

  const history = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  const [user, goals, insights] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.annualGoal.findMany({ where: { userId: req.userId, status: 'ACTIVE' } }),
    prisma.userInsight.findMany({
      where: { userId: req.userId },
      orderBy: { confidence: 'desc' },
      take: 10,
    }),
  ]);

  const coachReply = await generateCoachReply(content.trim(), {
    userProfile: user?.profile ? JSON.stringify(user.profile) : undefined,
    annualGoals: goals.map(g => `- ${g.title}（${g.progress}%）`).join('\n'),
    recentPatterns: insights.map(i => `[${i.category}] ${i.insight}`).join('\n'),
    gdrrContent: `目标: ${review.gdrrGoal}\n结果: ${review.gdrrResult}\n差异: ${review.gdrrDifference}\n根因: ${review.gdrrReason}`,
    conversationHistory: history.map(h => ({ role: h.role.toLowerCase(), content: h.content })),
  });

  const saved = await prisma.coachMessage.create({
    data: { reviewId, role: 'COACH', content: coachReply },
  });

  return res.status(201).json({
    success: true,
    data: { id: saved.id, reviewId, role: 'COACH', content: saved.content, createdAt: saved.createdAt.toISOString() },
  });
});
