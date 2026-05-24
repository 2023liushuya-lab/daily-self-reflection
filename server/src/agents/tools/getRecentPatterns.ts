import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getRecentPatterns(params: { days?: number }, userId: string): Promise<string> {
  try {
    const days = Math.min(params.days || 30, 90);
    const since = new Date();
    since.setDate(since.getDate() - days);

    const patterns = await prisma.userInsight.findMany({
      where: {
        userId,
        category: 'pattern',
        createdAt: { gte: since },
      },
      orderBy: { confidence: 'desc' },
      take: 10,
    });

    if (patterns.length === 0) {
      return `过去 ${days} 天内暂无行为模式记录。`;
    }

    const lines = patterns.map((p, i) => {
      const date = p.createdAt.toISOString().slice(0, 10);
      return `${i + 1}. [${date}] ${p.insight}（置信度: ${Math.round(p.confidence * 100)}%）`;
    });

    return `过去 ${days} 天内的 ${patterns.length} 条行为模式：\n${lines.join('\n')}`;
  } catch (err: any) {
    console.error('[getRecentPatterns] error:', err?.message || err);
    return '获取行为模式时发生错误，请稍后重试。';
  }
}
