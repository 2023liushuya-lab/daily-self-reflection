import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function updateUserProfile(
  params: { field: string; value: string },
  userId: string,
): Promise<string> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return '用户不存在';

    const profile = (user.profile as Record<string, any>) || {};

    // Allowed fields: role, focusAreas, personality, workStyle, preferences
    const allowedFields = ['role', 'focusAreas', 'personality', 'workStyle', 'preferences'];
    if (!allowedFields.includes(params.field)) {
      return `不允许更新字段 "${params.field}"。可更新字段: ${allowedFields.join(', ')}`;
    }

    profile[params.field] = params.value;

    await prisma.user.update({
      where: { id: userId },
      data: { profile },
    });

    return `已更新用户画像: ${params.field} = ${params.value}`;
  } catch (err: any) {
    console.error('[updateUserProfile] error:', err?.message || err);
    return '更新用户画像时发生错误';
  }
}
