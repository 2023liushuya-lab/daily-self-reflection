import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getUserInsights(params: { category?: string; limit?: number }, userId: string): Promise<string> {
  try {
    const limit = Math.min(params.limit || 10, 30);

    const where: any = { userId };

    if (params.category) {
      const validCategories = ['blind_spot', 'strength', 'pattern', 'skill'];
      if (validCategories.includes(params.category)) {
        where.category = params.category;
      }
    }

    const insights = await prisma.userInsight.findMany({
      where,
      orderBy: { confidence: 'desc' },
      take: limit,
    });

    if (insights.length === 0) {
      return '暂无已存储的用户洞察。';
    }

    const lines = insights.map((ins, i) => {
      return `${i + 1}. [${ins.category}] ${ins.insight}（置信度: ${Math.round(ins.confidence * 100)}%）`;
    });

    const categoryLabel = params.category ? `（类别: ${params.category}）` : '';
    return `共 ${insights.length} 条用户洞察${categoryLabel}：\n${lines.join('\n')}`;
  } catch (err: any) {
    console.error('[getUserInsights] error:', err?.message || err);
    return '获取用户洞察时发生错误，请稍后重试。';
  }
}
