import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function searchReviews(params: { query: string; limit?: number }, userId: string): Promise<string> {
  try {
    const query = params.query?.trim();
    if (!query) {
      return '请提供搜索关键词。';
    }

    const limit = Math.min(params.limit || 5, 20);

    const reviews = await prisma.review.findMany({
      where: {
        userId,
        OR: [
          { rawText: { contains: query } },
          { gdrrGoal: { contains: query } },
          { gdrrResult: { contains: query } },
          { gdrrDifference: { contains: query } },
          { gdrrReason: { contains: query } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Also check tags manually since JSON contains is DB-specific
    const allReviews = reviews.length < limit
      ? await prisma.review.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 50,
        })
      : [];

    // Filter by tags if we need more results
    const tagMatchReviews = allReviews
      .filter(r => {
        const tags = r.tags as string[];
        return Array.isArray(tags) && tags.some(tag => tag.includes(query));
      })
      .filter(r => !reviews.find(existing => existing.id === r.id))
      .slice(0, limit - reviews.length);

    const combined = [...reviews, ...tagMatchReviews].slice(0, limit);

    if (combined.length === 0) {
      return `未找到与"${query}"相关的复盘记录。`;
    }

    const lines = combined.map((r, i) => {
      const date = r.createdAt.toISOString().slice(0, 10);
      return `${i + 1}. [${date}] 目标: ${r.gdrrGoal || '（无）'} | 结果: ${r.gdrrResult || '（无）'} | 差距: ${r.gdrrDifference || '（无）'} | 原因: ${r.gdrrReason || '（无）'}`;
    });

    return `找到 ${combined.length} 条与"${query}"相关的复盘：\n${lines.join('\n')}`;
  } catch (err: any) {
    console.error('[searchReviews] error:', err?.message || err);
    return '搜索复盘时发生错误，请稍后重试。';
  }
}
