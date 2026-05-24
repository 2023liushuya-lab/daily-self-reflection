import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getGoalProgress(params: { goalId?: string }, userId: string): Promise<string> {
  try {
    const where: any = {
      userId,
      status: 'ACTIVE',
    };

    if (params.goalId) {
      where.id = params.goalId;
    }

    const goals = await prisma.annualGoal.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    if (goals.length === 0) {
      return '暂无进行中的年度目标。';
    }

    const lines = goals.map((g, i) => {
      return `${i + 1}. ${g.title}（${g.category}）进度: ${g.progress}% - ${g.description}`;
    });

    return `共 ${goals.length} 个进行中的目标：\n${lines.join('\n')}`;
  } catch (err: any) {
    console.error('[getGoalProgress] error:', err?.message || err);
    return '获取目标进度时发生错误，请稍后重试。';
  }
}
