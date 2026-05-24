import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const userRouter = Router();

userRouter.use(authMiddleware);

// GET /api/user/profile
userRouter.get('/profile', async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  return res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      profile: user.profile,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// PUT /api/user/profile
userRouter.put('/profile', async (req: AuthRequest, res: Response) => {
  const { nickname, profile } = req.body;

  const data: any = {};
  if (nickname !== undefined) data.nickname = nickname;
  if (profile !== undefined) data.profile = profile;

  const user = await prisma.user.update({
    where: { id: req.userId },
    data,
  });

  return res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      nickname: user.nickname,
      profile: user.profile,
      createdAt: user.createdAt.toISOString(),
    },
  });
});
