import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const goalsRouter = Router();

goalsRouter.use(authMiddleware);

const createGoalSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  description: z.string().max(500).default(''),
  category: z.enum(['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE']),
  keyResults: z.array(z.object({
    description: z.string(),
    current: z.number().default(0),
    target: z.number(),
    unit: z.string().default('%'),
  })).default([]),
});

// GET /api/goals
goalsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const goals = await prisma.annualGoal.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = goals.map(g => ({
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    category: g.category,
    keyResults: g.keyResults,
    progress: g.progress,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return res.json({ success: true, data: mapped });
});

// POST /api/goals
goalsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { title, description, category, keyResults } = parsed.data;

  const krs = keyResults.map((kr: any, i: number) => ({
    id: `kr-${Date.now()}-${i}`,
    description: kr.description,
    current: kr.current || 0,
    target: kr.target,
    unit: kr.unit || '%',
  }));

  const goal = await prisma.annualGoal.create({
    data: {
      userId: req.userId!,
      title,
      description,
      category,
      keyResults: krs,
      progress: 0,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      ...goal,
      keyResults: goal.keyResults,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    },
  });
});

// PUT /api/goals/:id
goalsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  const data: any = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.category !== undefined) data.category = req.body.category;
  if (req.body.keyResults !== undefined) data.keyResults = req.body.keyResults;
  if (req.body.progress !== undefined) data.progress = req.body.progress;
  if (req.body.status !== undefined) data.status = req.body.status;

  const updated = await prisma.annualGoal.update({
    where: { id: req.params.id },
    data,
  });

  return res.json({
    success: true,
    data: {
      ...updated,
      keyResults: updated.keyResults,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/goals/:id
goalsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  await prisma.annualGoal.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});
