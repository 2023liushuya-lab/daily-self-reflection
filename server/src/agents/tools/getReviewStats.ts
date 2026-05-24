import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getReviewStats(params: { days?: number }, userId: string): Promise<string> {
  try {
    const days = Math.min(params.days || 30, 365);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const reviews = await prisma.review.findMany({
      where: {
        userId,
        createdAt: { gte: since },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        scopeArea: true,
        createdAt: true,
      },
    });

    if (reviews.length === 0) {
      return `过去 ${days} 天内暂无复盘记录。`;
    }

    // Frequency: reviews per week
    const weeks = Math.max(days / 7, 1);
    const freqPerWeek = (reviews.length / weeks).toFixed(1);

    // Streak: consecutive days with at least one review
    const daySet = new Set<string>();
    for (const r of reviews) {
      daySet.add(r.createdAt.toISOString().slice(0, 10));
    }
    const sortedDays = Array.from(daySet).sort().reverse();

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    // Check if most recent review day is today or yesterday to start streak count
    let checkDate: Date | null = null;
    if (sortedDays.length > 0) {
      const mostRecent = sortedDays[0];
      if (mostRecent === today || mostRecent === yesterday) {
        checkDate = new Date(mostRecent);
      }
    }

    if (checkDate) {
      for (const day of sortedDays) {
        const expected = checkDate.toISOString().slice(0, 10);
        if (day === expected) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else if (day < expected) {
          break;
        }
      }
    }

    // Scope distribution
    const scopeCount: Record<string, number> = {};
    for (const r of reviews) {
      const scope = r.scopeArea || '未分类';
      scopeCount[scope] = (scopeCount[scope] || 0) + 1;
    }
    const scopeLines = Object.entries(scopeCount)
      .sort((a, b) => b[1] - a[1])
      .map(([scope, count]) => `  - ${scope}: ${count}次`)
      .join('\n');

    return [
      `过去 ${days} 天复盘统计：`,
      `- 总复盘数: ${reviews.length}`,
      `- 频率: 约 ${freqPerWeek} 次/周`,
      `- 连续打卡天数: ${streak} 天`,
      `- 维度分布:`,
      scopeLines || '  - 无数据',
    ].join('\n');
  } catch (err: any) {
    console.error('[getReviewStats] error:', err?.message || err);
    return '获取复盘统计时发生错误，请稍后重试。';
  }
}
