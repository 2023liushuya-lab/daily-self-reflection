import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { config } from '../config';
import { sendVerificationCode, storeCode, verifyCode } from '../services/sms';

const prisma = new PrismaClient();
export const authRouter = Router();

const sendCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/, '手机号格式不正确'),
});

const verifyCodeSchema = z.object({
  phone: z.string().regex(/^1[3-9]\d{9}$/),
  code: z.string().length(6, '验证码为 6 位数字'),
});

authRouter.post('/send-code', async (req: Request, res: Response) => {
  const parsed = sendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { phone } = parsed.data;
  const result = await sendVerificationCode(phone);

  if (!result.success) {
    return res.status(500).json({ success: false, error: '发送失败，请稍后重试' });
  }

  storeCode(phone, result.code!);
  return res.json({ success: true });
});

authRouter.post('/verify-code', async (req: Request, res: Response) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { phone, code } = parsed.data;

  if (!verifyCode(phone, code)) {
    return res.status(400).json({ success: false, error: '验证码错误或已过期' });
  }

  let user = await prisma.user.findUnique({ where: { phone } });
  if (!user) {
    user = await prisma.user.create({ data: { phone } });
  }

  const token = jwt.sign({ userId: user.id }, config.jwtSecret, { expiresIn: '30d' });

  return res.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        profile: user.profile,
        createdAt: user.createdAt.toISOString(),
      },
    },
  });
});
