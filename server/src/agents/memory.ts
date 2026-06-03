import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CoachMemoryContext {
  userProfile?: string;
  annualGoals?: string;
  relevantInsights?: string;
  recentGDRRSummary?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  gdrrContent: string;
}

export async function buildMemoryContext(
  userId: string,
  reviewId: string,
): Promise<CoachMemoryContext> {
  const [user, goals, review, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.annualGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
    prisma.review.findFirst({ where: { id: reviewId, userId } }),
    prisma.coachMessage.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  const insights = await prisma.userInsight.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' },
    take: 20,
  });

  const topInsights = insights.slice(0, 10);

  const recentReviews = await prisma.review.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      id: { not: reviewId },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    userProfile: user?.profile ? JSON.stringify(user.profile) : undefined,
    annualGoals: goals.length > 0
      ? goals.map(g => `- ${g.title}（${g.progress}%）`).join('\n')
      : undefined,
    relevantInsights: topInsights.length > 0
      ? topInsights.map(i => `[${i.category}] ${i.insight}`).join('\n')
      : undefined,
    recentGDRRSummary: recentReviews.length > 0
      ? recentReviews.map(r => `${new Date(r.createdAt).toLocaleDateString('zh-CN')}: 目标=${r.gdrrGoal.slice(0, 50)} 差异=${r.gdrrDifference.slice(0, 50)}`).join('\n')
      : undefined,
    conversationHistory: messages.map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    })),
    gdrrContent: review
      ? `目标: ${review.gdrrGoal}\n结果: ${review.gdrrResult}\n差异: ${review.gdrrDifference}\n根因: ${review.gdrrReason}`
      : '',
  };
}

export async function extractInsights(userId: string, reviewId: string, messageCount: number): Promise<void> {
  if (messageCount < 4) return; // 4 messages = 2 rounds (user+coach x 2)

  const messages = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const existingInsights = await prisma.userInsight.findMany({
    where: { userId },
  });

  const { config } = await import('../config');

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
          content: `你是行为分析师。从对话中提取用户洞察。
输出 JSON: { "insights": [{ "category": "blind_spot|strength|pattern|skill", "insight": "一句话描述(50字内)", "confidence": 0.0-1.0 }] }
要求：只提取有明确证据的洞察，confidence < 0.6 不输出，最多 3 条。已有洞察: ${JSON.stringify(existingInsights.map(i => i.insight))}`,
        },
        { role: 'user', content: conversationText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) return;

  const data: any = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return;

  let result: any;
  try {
    result = JSON.parse(content);
  } catch {
    return;
  }

  for (const ins of (result.insights || [])) {
    if (!ins.confidence || ins.confidence < 0.6) continue;
    if (!['blind_spot', 'strength', 'pattern', 'skill'].includes(ins.category)) continue;

    // Conflict detection: check for similar existing insights
    const similar = existingInsights.find(
      e => e.category === ins.category && e.insight === ins.insight
    );
    if (!similar) {
      await prisma.userInsight.create({
        data: {
          userId,
          category: ins.category,
          insight: ins.insight,
          confidence: ins.confidence,
        },
      });
    }
  }
}
