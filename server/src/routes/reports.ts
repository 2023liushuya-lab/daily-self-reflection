import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateReport, getPeriod } from '../services/report-generator';

const prisma = new PrismaClient();
export const reportsRouter = Router();

reportsRouter.use(authMiddleware);

// GET /api/reports - generate or get cached report
reportsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const { type, date } = req.query;

  if (!type || !date || typeof type !== 'string' || typeof date !== 'string') {
    return res.status(400).json({ success: false, error: 'type 和 date 为必填查询参数' });
  }

  if (!['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(type)) {
    return res.status(400).json({ success: false, error: 'type 必须为 WEEKLY、MONTHLY 或 QUARTERLY' });
  }

  try {
    // Check for cached report first
    const { start, end } = getPeriod(type, date);
    const cached = await prisma.report.findFirst({
      where: { userId: req.userId!, type: type as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY', periodStart: start, periodEnd: end },
    });

    if (cached) {
      const content = cached.content as any;
      return res.json({
        success: true,
        data: {
          id: cached.id,
          type: cached.type,
          periodStart: cached.periodStart.toISOString(),
          periodEnd: cached.periodEnd.toISOString(),
          stats: content.stats,
          narrative: content.narrative,
          growthSignals: content.growthSignals,
          goalAssessment: content.goalAssessment,
          nextPeriodSuggestions: content.nextPeriodSuggestions,
          createdAt: cached.createdAt.toISOString(),
        },
      });
    }

    const report = await generateReport({ type: type as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY', date, userId: req.userId! });

    const content = report.content as any;
    return res.json({
      success: true,
      data: {
        id: report.id,
        type: report.type,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        stats: content.stats,
        narrative: content.narrative,
        growthSignals: content.growthSignals,
        goalAssessment: content.goalAssessment,
        nextPeriodSuggestions: content.nextPeriodSuggestions,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Reports] Generation error:', err.message);
    return res.status(500).json({ success: false, error: '报告生成失败' });
  }
});

// POST /api/reports/generate - force regenerate
reportsRouter.post('/generate', async (req: AuthRequest, res: Response) => {
  const { type, date } = req.body;

  if (!type || !date || typeof type !== 'string' || typeof date !== 'string') {
    return res.status(400).json({ success: false, error: 'type 和 date 为必填字段' });
  }

  if (!['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(type)) {
    return res.status(400).json({ success: false, error: 'type 必须为 WEEKLY、MONTHLY 或 QUARTERLY' });
  }

  try {
    const report = await generateReport({ type: type as 'WEEKLY' | 'MONTHLY' | 'QUARTERLY', date, userId: req.userId! });

    const content = report.content as any;
    return res.status(201).json({
      success: true,
      data: {
        id: report.id,
        type: report.type,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        stats: content.stats,
        narrative: content.narrative,
        growthSignals: content.growthSignals,
        goalAssessment: content.goalAssessment,
        nextPeriodSuggestions: content.nextPeriodSuggestions,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Reports] Force regenerate error:', err.message);
    return res.status(500).json({ success: false, error: '报告重新生成失败' });
  }
});

// GET /api/reports/:id - get historical report by ID
reportsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const report = await prisma.report.findFirst({
      where: { id, userId: req.userId },
    });

    if (!report) {
      return res.status(404).json({ success: false, error: '报告不存在' });
    }

    const content = report.content as any;
    return res.json({
      success: true,
      data: {
        id: report.id,
        type: report.type,
        periodStart: report.periodStart.toISOString(),
        periodEnd: report.periodEnd.toISOString(),
        stats: content.stats,
        narrative: content.narrative,
        growthSignals: content.growthSignals,
        goalAssessment: content.goalAssessment,
        nextPeriodSuggestions: content.nextPeriodSuggestions,
        createdAt: report.createdAt.toISOString(),
      },
    });
  } catch (err: any) {
    console.error('[Reports] Get by ID error:', err.message);
    return res.status(500).json({ success: false, error: '获取报告失败' });
  }
});
