import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const prisma = new PrismaClient();
export const goalsRouter = Router();

goalsRouter.use(authMiddleware);

// POST /api/goals/parse — AI 解析自然语言目标
goalsRouter.post('/parse', async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: '请输入目标描述' });
  }

  try {
    const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个目标管理助手。用户会用自然语言描述他们的年度目标，你需要将其结构化。

类别必须是以下之一：WORK（工作）、RELATIONSHIP（人际）、PERSONAL_STATE（个人状态）、PERSONAL_LIFE（个人生活）

关键结果（keyResults）应包含可衡量的指标，每个有 description（描述）、target（目标值，数字）、unit（单位，如 %、次、个、小时等）、current（当前值，默认 0）。

输出纯 JSON（不要 markdown 包裹）：
{
  "title": "精简的目标标题（20字以内）",
  "description": "展开的目标描述",
  "category": "WORK|RELATIONSHIP|PERSONAL_STATE|PERSONAL_LIFE",
  "keyResults": [
    { "description": "可衡量的关键结果", "target": 100, "unit": "%", "current": 0 }
  ]
}`,
          },
          { role: 'user', content: text.trim() },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI 解析失败' });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(500).json({ success: false, error: 'AI 返回格式异常，请重试' });
    }

    // Validate category
    const validCategories = ['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE'];
    if (!validCategories.includes(parsed.category)) {
      parsed.category = 'WORK';
    }

    return res.json({
      success: true,
      data: {
        title: parsed.title || text.trim().slice(0, 100),
        description: parsed.description || '',
        category: parsed.category,
        keyResults: (parsed.keyResults || []).map((kr: any, i: number) => ({
          id: `kr-${Date.now()}-${i}`,
          description: kr.description || '',
          current: kr.current || 0,
          target: kr.target || 100,
          unit: kr.unit || '%',
        })),
      },
    });
  } catch (err: any) {
    console.error('[Goal Parse Error]', err.message);
    return res.status(500).json({ success: false, error: '解析失败，请稍后重试' });
  }
});

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
