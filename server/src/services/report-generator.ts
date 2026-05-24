import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

interface ReportInput {
  type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  date: string;
  userId: string;
}

export function getPeriod(type: string, dateStr: string) {
  const date = new Date(dateStr);
  const start = new Date(date);
  const end = new Date(date);

  if (type === 'WEEKLY') {
    const day = date.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(date.getDate() - mondayOffset);
    end.setDate(start.getDate() + 6);
  } else if (type === 'MONTHLY') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  } else {
    // QUARTERLY
    const quarterStart = Math.floor(date.getMonth() / 3) * 3;
    start.setMonth(quarterStart, 1);
    end.setMonth(quarterStart + 3, 0);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function generateReport(input: ReportInput) {
  const { start, end } = getPeriod(input.type, input.date);

  const [reviews, insights, goals] = await Promise.all([
    prisma.review.findMany({
      where: { userId: input.userId, createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.userInsight.findMany({
      where: { userId: input.userId, createdAt: { gte: start, lte: end } },
    }),
    prisma.annualGoal.findMany({ where: { userId: input.userId } }),
  ]);

  // Calculate streak
  const reviewDays = new Set(reviews.map(r => new Date(r.createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const checkDate = new Date(today);
  while (reviewDays.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Scope distribution
  const scopeCounts: Record<string, number> = {};
  reviews.forEach(r => { scopeCounts[r.scopeArea] = (scopeCounts[r.scopeArea] || 0) + 1; });

  // All tags
  const allTags: string[] = [];
  reviews.forEach(r => {
    const t = r.tags as string[];
    if (Array.isArray(t)) allTags.push(...t);
  });

  // Build context for AI
  const reviewsSummary = reviews.map(r => ({
    rawText: r.rawText.slice(0, 200),
    gdrr: { goal: r.gdrrGoal, result: r.gdrrResult, difference: r.gdrrDifference, reason: r.gdrrReason },
    tags: r.tags,
    createdAt: r.createdAt.toISOString(),
  }));

  const goalsSummary = goals.map(g => ({ title: g.title, progress: g.progress, category: g.category }));
  const insightsSummary = insights.map(i => ({ category: i.category, insight: i.insight, confidence: i.confidence }));

  const prompt = `你是个人成长教练。根据用户过去一个周期的复盘数据生成报告。

## 复盘数据
${JSON.stringify(reviewsSummary, null, 2)}

## 年度目标
${JSON.stringify(goalsSummary, null, 2)}

## 洞察
${JSON.stringify(insightsSummary, null, 2)}

## 任务
生成一份${input.type === 'WEEKLY' ? '周' : input.type === 'MONTHLY' ? '月' : '季'}度报告。用教练口吻写叙事总结（2-3段）。输出纯JSON，不要markdown包裹。

## JSON Schema
{
  "narrative": "2-3段教练口吻叙事总结",
  "growthSignals": {
    "skillsObserved": ["技能"],
    "patternsContinuing": ["模式"],
    "breakthroughs": ["突破"]
  },
  "goalAssessment": [{"goalTitle": "目标名", "reviewCount": 关联次数, "alignmentNote": "对齐评估", "suggestion": "建议"}],
  "nextPeriodSuggestions": ["下周期建议"]
}`;

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.deepseek.apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是个人成长教练。输出纯JSON，不要markdown包裹。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) throw new Error(`DeepSeek API error: ${response.status}`);

  const data = await response.json();
  if (!data.choices?.length || !data.choices[0].message?.content) {
    throw new Error('DeepSeek returned empty response');
  }

  let aiContent: any;
  try {
    aiContent = JSON.parse(data.choices[0].message.content);
  } catch {
    throw new Error('Failed to parse DeepSeek response as JSON');
  }

  const reportContent = {
    stats: { reviewCount: reviews.length, streak, scopeCounts, topTags: [...new Set(allTags)].slice(0, 10) },
    ...aiContent,
  };

  // Upsert: check existing first
  const existing = await prisma.report.findFirst({
    where: { userId: input.userId, type: input.type, periodStart: start, periodEnd: end },
  });

  if (existing) {
    return prisma.report.update({ where: { id: existing.id }, data: { content: reportContent } });
  }

  return prisma.report.create({
    data: { userId: input.userId, type: input.type, periodStart: start, periodEnd: end, content: reportContent },
  });
}
