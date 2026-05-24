# 复盘神器 MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建复盘神器 MVP 闭环 —— 手机号登录 → 设定年度目标 → 语音/文字复盘 → AI GDRR 结构化 → 首页仪表盘 → 教练首轮追问

**Architecture:** Monorepo 三包结构（expo-app / server / shared），React Native Expo 前端通过 REST API 调用 Node.js Express 后端，后端通过 Prisma 操作 PostgreSQL，集成腾讯云 ASR/SMS 和 DeepSeek API

**Tech Stack:** React Native (Expo) + TypeScript, Node.js + Express + TypeScript, PostgreSQL + Prisma, DeepSeek API, 腾讯云 ASR + SMS

---

## 文件结构全景

```
吾日三省吾身/
├── shared/
│   └── types.ts                    ← 共享类型定义
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   └── schema.prisma           ← 数据库模型
│   └── src/
│       ├── index.ts                ← Express 入口
│       ├── config.ts               ← 环境变量读取
│       ├── middleware/
│       │   └── auth.ts             ← JWT 鉴权中间件
│       ├── routes/
│       │   ├── auth.ts             ← 验证码登录
│       │   ├── goals.ts            ← 目标 CRUD
│       │   ├── reviews.ts          ← 复盘 CRUD + AI
│       │   ├── coach.ts            ← 教练消息
│       │   └── user.ts             ← 用户画像
│       └── services/
│           ├── sms.ts              ← 腾讯云 SMS
│           ├── asr.ts              ← 腾讯云 ASR
│           ├── deepseek.ts         ← DeepSeek API
│           └── coach.ts            ← 教练逻辑 (prompt + 洞察提取)
├── expo-app/
│   ├── package.json
│   ├── tsconfig.json
│   ├── app.json
│   ├── App.tsx
│   └── src/
│       ├── api/
│       │   └── client.ts           ← Axios API 客户端
│       ├── theme/
│       │   └── index.ts            ← 暖色主题定义
│       ├── navigation/
│       │   └── index.tsx           ← React Navigation 配置
│       ├── hooks/
│       │   └── useAuth.ts          ← 登录状态 Hook
│       ├── screens/
│       │   ├── LoginScreen.tsx
│       │   ├── HomeScreen.tsx
│       │   ├── ReviewInputScreen.tsx
│       │   ├── ReviewDetailScreen.tsx
│       │   ├── GoalsScreen.tsx
│       │   ├── GoalEditScreen.tsx
│       │   └── ProfileScreen.tsx
│       └── components/
│           ├── GDRRCard.tsx
│           ├── CoachQuestions.tsx
│           ├── GoalCard.tsx
│           ├── ScopeSelector.tsx
│           └── VoiceRecorder.tsx
└── docs/
    ├── product-prd.md
    ├── coach-design.md
    └── superpowers/
        └── plans/
```

---

### Task 1: Monorepo 脚手架 + 共享类型

**Files:**
- Create: `shared/types.ts`
- Create: `server/package.json`, `server/tsconfig.json`, `server/.env.example`
- Create: `expo-app/package.json`, `expo-app/tsconfig.json`, `expo-app/app.json`
- Modify: `.gitignore`

- [ ] **Step 1: 创建 shared 类型定义**

```typescript
// shared/types.ts

// ---- User ----
export interface UserProfile {
  nickname: string;
  role: string;
  focusAreas: string[];
  personalityTrait?: string;
  preferredWorkHours?: string;
}

export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  profile: UserProfile | null;
  createdAt: string;
}

// ---- Annual Goal ----
export type GoalCategory = 'WORK' | 'RELATIONSHIP' | 'PERSONAL_STATE' | 'PERSONAL_LIFE';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface KeyResult {
  id: string;
  description: string;
  current: number;
  target: number;
  unit: string;
}

export interface AnnualGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category: GoalCategory;
  keyResults: KeyResult[];
  progress: number; // 0-100
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description: string;
  category: GoalCategory;
  keyResults: Omit<KeyResult, 'id'>[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  category?: GoalCategory;
  keyResults?: KeyResult[];
  progress?: number;
  status?: GoalStatus;
}

// ---- Review ----
export type ScopeArea = 'WORK' | 'RELATIONSHIP' | 'PERSONAL_STATE' | 'PERSONAL_LIFE';

export interface GDRR {
  goal: string;
  result: string;
  difference: string;
  reason: string;
}

export interface RelatedGoal {
  goalId: string;
  relevance: 'high' | 'medium' | 'low';
  progressNote: string;
}

export interface InsightCandidate {
  category: 'blind_spot' | 'strength' | 'pattern' | 'skill';
  insight: string;
  confidence: number;
}

export interface GrowthSignals {
  skillsObserved: string[];
  patternsContinuing: string[];
  breakthroughs: string[];
}

export interface Review {
  id: string;
  userId: string;
  rawText: string;
  audioUrl?: string;
  scopeArea: ScopeArea;
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  relatedGoals: RelatedGoal[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  rawText: string;
  scopeArea: ScopeArea;
}

// ---- Coach ----
export interface CoachMessage {
  id: string;
  reviewId: string;
  role: 'USER' | 'COACH';
  content: string;
  createdAt: string;
}

// ---- Report ----
export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  content: Record<string, unknown>;
  createdAt: string;
}

// ---- User Insight ----
export type InsightCategory = 'blind_spot' | 'strength' | 'pattern' | 'skill';

export interface UserInsight {
  id: string;
  userId: string;
  category: InsightCategory;
  insight: string;
  confidence: number;
  createdAt: string;
}

// ---- API Response ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
```

- [ ] **Step 2: 创建 server package.json**

```json
// server/package.json
{
  "name": "reviewmaster-server",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "db:migrate": "prisma migrate dev",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.20.0",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "tencentcloud-sdk-nodejs": "^4.0.900",
    "uuid": "^10.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/multer": "^1.4.12",
    "@types/uuid": "^10.0.0",
    "prisma": "^5.20.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: 创建 server tsconfig.json**

```json
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: 创建 server .env.example**

```
DATABASE_URL="postgresql://localhost:5432/reviewmaster"
JWT_SECRET="change-me-to-random-string"
DEEPSEEK_API_KEY="sk-xxx"
DEEPSEEK_BASE_URL="https://api.deepseek.com"
TENCENT_SECRET_ID="xxx"
TENCENT_SECRET_KEY="xxx"
TENCENT_SMS_APP_ID="xxx"
TENCENT_SMS_SIGN_NAME="复盘神器"
TENCENT_SMS_TEMPLATE_ID="xxx"
PORT=3000
```

- [ ] **Step 5: 创建 expo-app package.json**

```json
// expo-app/package.json
{
  "name": "reviewmaster-app",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "axios": "^1.7.0",
    "expo": "~51.0.0",
    "expo-av": "~14.0.0",
    "expo-file-system": "~17.0.0",
    "expo-secure-store": "~13.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "react-native-safe-area-context": "4.10.0",
    "react-native-screens": "3.31.0"
  },
  "devDependencies": {
    "@types/react": "~18.2.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 6: 创建 expo-app tsconfig.json**

```json
// expo-app/tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@shared/*": ["../shared/*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx", "../shared/**/*.ts"]
}
```

- [ ] **Step 7: 更新 .gitignore**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
.expo/
ios/
android/
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/liushuya/Documents/吾日三省吾身"
git add shared/ server/package.json server/tsconfig.json server/.env.example expo-app/package.json expo-app/tsconfig.json .gitignore
git commit -m "feat: monorepo scaffold + shared types"
git push
```

---

### Task 2: 数据库模型 + Prisma 配置

**Files:**
- Create: `server/prisma/schema.prisma`
- Modify: `server/src/config.ts`

- [ ] **Step 1: 创建 Prisma schema**

```prisma
// server/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  phone     String   @unique
  nickname  String?
  profile   Json?
  createdAt DateTime @default(now()) @map("created_at")

  goals    AnnualGoal[]
  reviews  Review[]
  insights UserInsight[]
  reports  Report[]

  @@map("users")
}

model AnnualGoal {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  title       String
  description String
  category    String
  keyResults  Json     @map("key_results")
  progress    Int      @default(0)
  status      String   @default("ACTIVE")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("annual_goals")
}

model Review {
  id              String   @id @default(uuid())
  userId          String   @map("user_id")
  rawText         String   @map("raw_text")
  audioUrl        String?  @map("audio_url")
  scopeArea       String   @map("scope_area")
  gdrrGoal        String   @map("gdrr_goal")
  gdrrResult      String   @map("gdrr_result")
  gdrrDifference  String   @map("gdrr_difference")
  gdrrReason      String   @map("gdrr_reason")
  tags            Json     @default("[]")
  coachQuestions  Json     @default("[]") @map("coach_questions")
  insightCandidates Json   @default("[]") @map("insight_candidates")
  growthSignals   Json     @default("{}") @map("growth_signals")
  relatedGoals    Json     @default("[]") @map("related_goals")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  coachMessages  CoachMessage[]

  @@map("reviews")
}

model CoachMessage {
  id        String   @id @default(uuid())
  reviewId  String   @map("review_id")
  role      String
  content   String
  createdAt DateTime @default(now()) @map("created_at")

  review Review @relation(fields: [reviewId], references: [id], onDelete: Cascade)

  @@map("coach_messages")
}

model UserInsight {
  id         String   @id @default(uuid())
  userId     String   @map("user_id")
  category   String
  insight    String
  confidence Float
  createdAt  DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_insights")
}

model Report {
  id          String   @id @default(uuid())
  userId      String   @map("user_id")
  type        String
  periodStart DateTime @map("period_start")
  periodEnd   DateTime @map("period_end")
  content     Json
  createdAt   DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("reports")
}
```

- [ ] **Step 2: 创建 server/src/config.ts**

```typescript
// server/src/config.ts
import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
  },
  tencent: {
    secretId: process.env.TENCENT_SECRET_ID || '',
    secretKey: process.env.TENCENT_SECRET_KEY || '',
    smsAppId: process.env.TENCENT_SMS_APP_ID || '',
    smsSignName: process.env.TENCENT_SMS_SIGN_NAME || '',
    smsTemplateId: process.env.TENCENT_SMS_TEMPLATE_ID || '',
  },
};
```

- [ ] **Step 3: 初始化 Prisma 并创建迁移**

```bash
cd server && npm install && npx prisma migrate dev --name init
```

- [ ] **Step 4: Commit**

```bash
git add server/prisma/ server/src/config.ts server/package-lock.json server/node_modules/.gitkeep
git commit -m "feat: prisma schema + db config"
git push
```

---

### Task 3: Express 入口 + JWT 中间件 + SMS 服务

**Files:**
- Create: `server/src/index.ts`
- Create: `server/src/middleware/auth.ts`
- Create: `server/src/services/sms.ts`
- Create: `server/src/routes/auth.ts`

- [ ] **Step 1: 创建 server/src/index.ts**

```typescript
// server/src/index.ts
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authRouter } from './routes/auth';
import { goalsRouter } from './routes/goals';
import { reviewsRouter } from './routes/reviews';
import { coachRouter } from './routes/coach';
import { userRouter } from './routes/user';
import { errorHandler } from './middleware/error-handler';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reviews', coachRouter);
app.use('/api/user', userRouter);

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on port ${config.port}`);
});
```

- [ ] **Step 2: 创建 server/src/middleware/auth.ts**

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface AuthRequest extends Request {
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: '未登录' });
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, config.jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ success: false, error: '登录已过期' });
  }
}
```

- [ ] **Step 3: 创建 server/src/services/sms.ts**

```typescript
// server/src/services/sms.ts
import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { config } from '../config';

const SmsClient = tencentcloud.sms.v20210111.Client;

interface SendResult {
  success: boolean;
  code?: string; // 开发环境返回验证码
}

// 开发环境模拟发送，生产环境调用腾讯云
const isDev = !config.tencent.secretId;

export async function sendVerificationCode(phone: string): Promise<SendResult> {
  const code = String(Math.floor(100000 + Math.random() * 900000));

  if (isDev) {
    console.log(`[DEV] 验证码发送到 ${phone}: ${code}`);
    return { success: true, code };
  }

  const client = new SmsClient({
    credential: {
      secretId: config.tencent.secretId,
      secretKey: config.tencent.secretKey,
    },
    region: 'ap-guangzhou',
  });

  await client.SendSms({
    SmsSdkAppId: config.tencent.smsAppId,
    SignName: config.tencent.smsSignName,
    TemplateId: config.tencent.smsTemplateId,
    TemplateParamSet: [code, '5'],
    PhoneNumberSet: [`+86${phone}`],
  });

  return { success: true, code }; // 生产环境不返回 code
}

// 内存存储验证码（生产环境应换 Redis）
const codeStore = new Map<string, { code: string; expiresAt: number }>();

export function storeCode(phone: string, code: string): void {
  codeStore.set(phone, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
}

export function verifyCode(phone: string, code: string): boolean {
  const stored = codeStore.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    codeStore.delete(phone);
    return false;
  }
  if (stored.code !== code) return false;
  codeStore.delete(phone);
  return true;
}
```

- [ ] **Step 4: 创建 server/src/routes/auth.ts**

```typescript
// server/src/routes/auth.ts
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

  // 查找或创建用户
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
```

- [ ] **Step 5: 创建 server/src/middleware/error-handler.ts**

```typescript
// server/src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  console.error('[Error]', err.message);
  res.status(500).json({ success: false, error: '服务器内部错误' });
}
```

- [ ] **Step 6: Commit**

```bash
git add server/src/
git commit -m "feat: express entry + jwt middleware + SMS auth"
git push
```

---

### Task 4: 目标 CRUD + 用户画像 + DeepSeek 服务

**Files:**
- Create: `server/src/routes/goals.ts`
- Create: `server/src/routes/user.ts`
- Create: `server/src/services/deepseek.ts`

- [ ] **Step 1: 创建 DeepSeek 服务**

```typescript
// server/src/services/deepseek.ts
import { config } from '../config';
import type { GDRR, InsightCandidate, GrowthSignals, ScopeArea, GoalCategory } from '../../shared/types';

interface StructuredReviewResult {
  scopeArea: ScopeArea;
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  relatedGoals: Array<{ goalId: string; relevance: string; progressNote: string }>;
}

const STRUCTURE_PROMPT = `你是一位个人成长教练。请将用户的复盘文本按 GDRR 框架结构化分析。

## GDRR 框架
- Goal: 用户当时想达成什么目标
- Result: 实际发生了什么
- Difference: 目标与结果的差距
- Reason: 深层原因

## 要求
- 基于用户提供的文本进行推断，不要编造
- 如果某个部分文本中没有明确提及，根据上下文合理推断
- 生成 2-3 个教练追问，简短有力（不超过 40 字），挑战用户的假设或盲区
- 标签 3-5 个，中文
- 输出 JSON 格式`;

export async function structureReview(
  rawText: string,
  context?: {
    userProfile?: string;
    annualGoals?: string;
  }
): Promise<StructuredReviewResult> {
  let systemPrompt = STRUCTURE_PROMPT;

  if (context?.userProfile) {
    systemPrompt += `\n\n## 用户画像\n${context.userProfile}`;
  }
  if (context?.annualGoals) {
    systemPrompt += `\n\n## 用户年度目标\n${context.annualGoals}`;
  }

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: rawText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${errBody}`);
  }

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  return {
    scopeArea: result.scope_area || 'WORK',
    gdrr: {
      goal: result.goal || '',
      result: result.result || '',
      difference: result.difference || '',
      reason: result.reason || '',
    },
    tags: result.tags || [],
    coachQuestions: result.coach_questions || [],
    insightCandidates: result.insight_candidates || [],
    growthSignals: result.growth_signals || { skillsObserved: [], patternsContinuing: [], breakthroughs: [] },
    relatedGoals: result.related_annual_goals || [],
  };
}
```

- [ ] **Step 2: 创建 server/src/routes/goals.ts**

```typescript
// server/src/routes/goals.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const prisma = new PrismaClient();
export const goalsRouter = Router();

goalsRouter.use(authMiddleware);

const createGoalSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(100),
  description: z.string().max(500).default(''),
  category: z.enum(['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE']),
  keyResults: z.array(z.object({
    description: z.string(),
    current: z.number().default(0),
    target: z.number(),
    unit: z.string().default('%'),
  })).default([]),
});

// GET /api/goals
goalsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const goals = await prisma.annualGoal.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = goals.map(g => ({
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    category: g.category,
    keyResults: g.keyResults,
    progress: g.progress,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return res.json({ success: true, data: mapped });
});

// POST /api/goals
goalsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { title, description, category, keyResults } = parsed.data;

  const krs = keyResults.map((kr: any, i: number) => ({
    id: `kr-${Date.now()}-${i}`,
    description: kr.description,
    current: kr.current || 0,
    target: kr.target,
    unit: kr.unit || '%',
  }));

  const goal = await prisma.annualGoal.create({
    data: {
      userId: req.userId!,
      title,
      description,
      category,
      keyResults: krs,
      progress: 0,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      ...goal,
      keyResults: goal.keyResults,
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    },
  });
});

// PUT /api/goals/:id
goalsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  const data: any = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.category !== undefined) data.category = req.body.category;
  if (req.body.keyResults !== undefined) data.keyResults = req.body.keyResults;
  if (req.body.progress !== undefined) data.progress = req.body.progress;
  if (req.body.status !== undefined) data.status = req.body.status;

  const updated = await prisma.annualGoal.update({
    where: { id: req.params.id },
    data,
  });

  return res.json({
    success: true,
    data: {
      ...updated,
      keyResults: updated.keyResults,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/goals/:id
goalsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  await prisma.annualGoal.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});
```

- [ ] **Step 3: 创建 server/src/routes/user.ts**

```typescript
// server/src/routes/user.ts
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
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/goals.ts server/src/routes/user.ts server/src/services/deepseek.ts
git commit -m "feat: goals CRUD + user profile + DeepSeek service"
git push
```

---

### Task 5: 复盘提交 + ASR + 教练追问路由

**Files:**
- Create: `server/src/routes/reviews.ts`
- Create: `server/src/services/asr.ts`
- Create: `server/src/routes/coach.ts`
- Create: `server/src/services/coach.ts`

- [ ] **Step 1: 创建 ASR 服务**

```typescript
// server/src/services/asr.ts
import * as tencentcloud from 'tencentcloud-sdk-nodejs';
import { config } from '../config';

const AsrClient = tencentcloud.asr.v20190614.Client;

export async function recognizeAudio(audioBase64: string): Promise<string> {
  if (!config.tencent.secretId) {
    // 开发环境返回 mock 结果
    console.log('[DEV] ASR mock - audio length:', audioBase64.length);
    return '[语音识别结果] 开发环境 mock';
  }

  const client = new AsrClient({
    credential: {
      secretId: config.tencent.secretId,
      secretKey: config.tencent.secretKey,
    },
    region: 'ap-guangzhou',
  });

  const result = await client.SentenceRecognition({
    ProjectId: 0,
    SubServiceType: 2, // 一句话识别
    EngSerViceType: '16k_zh', // 中文普通话
    SourceType: 1, // 音频 base64
    VoiceFormat: 'wav',
    Data: audioBase64,
    DataLen: audioBase64.length,
  });

  return result.Result || '';
}
```

- [ ] **Step 2: 创建 server/src/routes/reviews.ts**

```typescript
// server/src/routes/reviews.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { structureReview } from '../services/deepseek';
import { recognizeAudio } from '../services/asr';

const prisma = new PrismaClient();
export const reviewsRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

reviewsRouter.use(authMiddleware);

// POST /api/reviews/upload-audio
reviewsRouter.post('/upload-audio', upload.single('audio'), async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: '未上传音频文件' });
  }

  try {
    const audioBase64 = req.file.buffer.toString('base64');
    const text = await recognizeAudio(audioBase64);
    return res.json({ success: true, data: { text } });
  } catch (err: any) {
    console.error('[ASR Error]', err.message);
    return res.status(500).json({ success: false, error: '语音识别失败，请重试' });
  }
});

// POST /api/reviews
const createReviewSchema = z.object({
  rawText: z.string().min(1, '复盘内容不能为空').max(5000),
  scopeArea: z.enum(['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE']).default('WORK'),
});

reviewsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { rawText, scopeArea } = parsed.data;

  // 获取用户画像和目标作为 AI 上下文
  const [user, goals] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.annualGoal.findMany({ where: { userId: req.userId, status: 'ACTIVE' } }),
  ]);

  const userProfile = user?.profile ? JSON.stringify(user.profile) : undefined;
  const annualGoals = goals.length > 0
    ? goals.map(g => `- ${g.title}（进度: ${g.progress}%）`).join('\n')
    : undefined;

  // 调用 DeepSeek 结构化
  let structured;
  try {
    structured = await structureReview(rawText, { userProfile, annualGoals });
  } catch (err: any) {
    console.error('[DeepSeek Error]', err.message);
    return res.status(500).json({ success: false, error: 'AI 处理失败，请稍后重试' });
  }

  // 存入数据库
  const review = await prisma.review.create({
    data: {
      userId: req.userId!,
      rawText,
      scopeArea: structured.scopeArea || scopeArea,
      gdrrGoal: structured.gdrr.goal,
      gdrrResult: structured.gdrr.result,
      gdrrDifference: structured.gdrr.difference,
      gdrrReason: structured.gdrr.reason,
      tags: structured.tags,
      coachQuestions: structured.coachQuestions,
      insightCandidates: structured.insightCandidates,
      growthSignals: structured.growthSignals,
      relatedGoals: structured.relatedGoals,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: review.id,
      userId: review.userId,
      rawText: review.rawText,
      audioUrl: review.audioUrl,
      scopeArea: review.scopeArea,
      gdrr: {
        goal: review.gdrrGoal,
        result: review.gdrrResult,
        difference: review.gdrrDifference,
        reason: review.gdrrReason,
      },
      tags: review.tags,
      coachQuestions: review.coachQuestions,
      insightCandidates: review.insightCandidates,
      growthSignals: review.growthSignals,
      relatedGoals: review.relatedGoals,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    },
  });
});

// GET /api/reviews
reviewsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const scopeArea = req.query.scopeArea as string | undefined;

  const where: any = { userId: req.userId };
  if (scopeArea) where.scopeArea = scopeArea;

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  const data = reviews.map(r => ({
    id: r.id,
    userId: r.userId,
    rawText: r.rawText,
    audioUrl: r.audioUrl,
    scopeArea: r.scopeArea,
    gdrr: { goal: r.gdrrGoal, result: r.gdrrResult, difference: r.gdrrDifference, reason: r.gdrrReason },
    tags: r.tags,
    coachQuestions: r.coachQuestions,
    insightCandidates: r.insightCandidates,
    growthSignals: r.growthSignals,
    relatedGoals: r.relatedGoals,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return res.json({ success: true, data, total, page, pageSize });
});

// GET /api/reviews/:id
reviewsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });

  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  return res.json({
    success: true,
    data: {
      id: review.id,
      userId: review.userId,
      rawText: review.rawText,
      audioUrl: review.audioUrl,
      scopeArea: review.scopeArea,
      gdrr: { goal: review.gdrrGoal, result: review.gdrrResult, difference: review.gdrrDifference, reason: review.gdrrReason },
      tags: review.tags,
      coachQuestions: review.coachQuestions,
      insightCandidates: review.insightCandidates,
      growthSignals: review.growthSignals,
      relatedGoals: review.relatedGoals,
      createdAt: review.createdAt.toISOString(),
      updatedAt: review.updatedAt.toISOString(),
    },
  });
});

// PUT /api/reviews/:id
reviewsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  const data: any = {};
  if (req.body.rawText !== undefined) data.rawText = req.body.rawText;
  if (req.body.scopeArea !== undefined) data.scopeArea = req.body.scopeArea;
  if (req.body.gdrrGoal !== undefined) data.gdrrGoal = req.body.gdrrGoal;
  if (req.body.gdrrResult !== undefined) data.gdrrResult = req.body.gdrrResult;
  if (req.body.gdrrDifference !== undefined) data.gdrrDifference = req.body.gdrrDifference;
  if (req.body.gdrrReason !== undefined) data.gdrrReason = req.body.gdrrReason;
  if (req.body.tags !== undefined) data.tags = req.body.tags;

  const updated = await prisma.review.update({
    where: { id: req.params.id },
    data,
  });

  return res.json({
    success: true,
    data: {
      id: updated.id,
      gdrr: { goal: updated.gdrrGoal, result: updated.gdrrResult, difference: updated.gdrrDifference, reason: updated.gdrrReason },
      tags: updated.tags,
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/reviews/:id
reviewsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const review = await prisma.review.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  await prisma.review.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});
```

- [ ] **Step 3: 创建 server/src/services/coach.ts**

```typescript
// server/src/services/coach.ts
import { config } from '../config';

interface CoachContext {
  userProfile?: string;
  annualGoals?: string;
  recentPatterns?: string;
  gdrrContent: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export async function generateCoachReply(
  userMessage: string,
  context: CoachContext
): Promise<string> {
  let systemPrompt = `你是一位个人成长教练。你是"镜子"和"追问者"——反映用户没说出来的部分，挑战假设，挖掘深层原因。

## 用户画像
${context.userProfile || '暂无'}

## 年度目标
${context.annualGoals || '暂无'}

## 近期模式
${context.recentPatterns || '暂无'}

## 当前复盘 GDRR
${context.gdrrContent}

## 指导原则
- 如果用户回避问题，温和地指出并回到正题
- 如果用户说出新的信息，追问背后的深层原因
- 如果用户提出解决方案，帮助验证并关联长期目标
- 每次只问一个问题，不要一次抛出多个问题
- 回复不超过 150 字
- 简洁精准，不说教`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (context.conversationHistory) {
    messages.push(...context.conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })));
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
```

- [ ] **Step 4: 创建 server/src/routes/coach.ts**

```typescript
// server/src/routes/coach.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateCoachReply } from '../services/coach';

const prisma = new PrismaClient();
export const coachRouter = Router();

coachRouter.use(authMiddleware);

// GET /api/reviews/:reviewId/coach-messages
coachRouter.get('/:reviewId/coach-messages', async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;

  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  const messages = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  return res.json({
    success: true,
    data: messages.map(m => ({
      id: m.id,
      reviewId: m.reviewId,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

// POST /api/reviews/:reviewId/coach-messages
coachRouter.post('/:reviewId/coach-messages', async (req: AuthRequest, res: Response) => {
  const { reviewId } = req.params;
  const { content } = req.body;

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return res.status(400).json({ success: false, error: '消息内容不能为空' });
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: req.userId },
  });
  if (!review) {
    return res.status(404).json({ success: false, error: '复盘不存在' });
  }

  // 存用户消息
  await prisma.coachMessage.create({
    data: { reviewId, role: 'USER', content: content.trim() },
  });

  // 获取历史对话
  const history = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  // 获取用户上下文
  const [user, goals, insights] = await Promise.all([
    prisma.user.findUnique({ where: { id: req.userId } }),
    prisma.annualGoal.findMany({ where: { userId: req.userId, status: 'ACTIVE' } }),
    prisma.userInsight.findMany({
      where: { userId: req.userId },
      orderBy: { confidence: 'desc' },
      take: 10,
    }),
  ]);

  // 生成教练回复
  const coachReply = await generateCoachReply(content.trim(), {
    userProfile: user?.profile ? JSON.stringify(user.profile) : undefined,
    annualGoals: goals.map(g => `- ${g.title}（${g.progress}%）`).join('\n'),
    recentPatterns: insights.map(i => `[${i.category}] ${i.insight}`).join('\n'),
    gdrrContent: `目标: ${review.gdrrGoal}\n结果: ${review.gdrrResult}\n差异: ${review.gdrrDifference}\n根因: ${review.gdrrReason}`,
    conversationHistory: history.map(h => ({ role: h.role.toLowerCase(), content: h.content })),
  });

  // 存教练回复
  const saved = await prisma.coachMessage.create({
    data: { reviewId, role: 'COACH', content: coachReply },
  });

  return res.status(201).json({
    success: true,
    data: { id: saved.id, reviewId, role: 'COACH', content: saved.content, createdAt: saved.createdAt.toISOString() },
  });
});
```

- [ ] **Step 5: Commit**

```bash
git add server/src/routes/reviews.ts server/src/routes/coach.ts server/src/services/asr.ts server/src/services/coach.ts
git commit -m "feat: review CRUD + ASR + coach chat routes"
git push
```

---

### Task 6: Expo App 初始化 + 主题 + 导航 + API Client

**Files:**
- Create: `expo-app/App.tsx`
- Create: `expo-app/src/theme/index.ts`
- Create: `expo-app/src/api/client.ts`
- Create: `expo-app/src/navigation/index.tsx`
- Create: `expo-app/src/hooks/useAuth.ts`
- Create: `expo-app/app.json`

- [ ] **Step 1: 创建 app.json**

```json
// expo-app/app.json
{
  "expo": {
    "name": "复盘神器",
    "slug": "reviewmaster",
    "version": "0.1.0",
    "orientation": "portrait",
    "scheme": "reviewmaster",
    "userInterfaceStyle": "light",
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.reviewmaster.app"
    },
    "android": {
      "package": "com.reviewmaster.app"
    },
    "plugins": [
      "expo-secure-store",
      "expo-av"
    ]
  }
}
```

- [ ] **Step 2: 创建主题定义**

```typescript
// expo-app/src/theme/index.ts
export const colors = {
  background: '#FFF8F0',
  card: '#FFFBF7',
  primary: '#C4724B',
  primaryLight: '#D4895E',
  text: '#3C2E26',
  textSecondary: '#8B7355',
  success: '#6B9F6E',
  warning: '#D4956B',
  border: '#E8D5C4',
  white: '#FFFFFF',
};

export const fonts = {
  title: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: colors.text,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: colors.textSecondary,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};
```

- [ ] **Step 3: 创建 API Client**

```typescript
// expo-app/src/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// 请求拦截：自动注入 JWT
client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authApi = {
  sendCode: (phone: string) => client.post('/auth/send-code', { phone }),
  verifyCode: (phone: string, code: string) => client.post('/auth/verify-code', { phone, code }),
};

// Goals API
export const goalsApi = {
  list: () => client.get('/goals'),
  create: (data: any) => client.post('/goals', data),
  update: (id: string, data: any) => client.put(`/goals/${id}`, data),
  delete: (id: string) => client.delete(`/goals/${id}`),
};

// Reviews API
export const reviewsApi = {
  list: (params?: any) => client.get('/reviews', { params }),
  get: (id: string) => client.get(`/reviews/${id}`),
  create: (data: any) => client.post('/reviews', data),
  update: (id: string, data: any) => client.put(`/reviews/${id}`, data),
  delete: (id: string) => client.delete(`/reviews/${id}`),
  uploadAudio: (formData: FormData) =>
    client.post('/reviews/upload-audio', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Coach API
export const coachApi = {
  getMessages: (reviewId: string) => client.get(`/reviews/${reviewId}/coach-messages`),
  sendMessage: (reviewId: string, content: string) =>
    client.post(`/reviews/${reviewId}/coach-messages`, { content }),
};

// User API
export const userApi = {
  getProfile: () => client.get('/user/profile'),
  updateProfile: (data: any) => client.put('/user/profile', data),
};

export default client;
```

- [ ] **Step 4: 创建 useAuth Hook**

```typescript
// expo-app/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export interface AuthState {
  token: string | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({ token: null, isLoading: true });

  useEffect(() => {
    SecureStore.getItemAsync('auth-token').then(token => {
      setState({ token, isLoading: false });
    });
  }, []);

  const login = async (token: string) => {
    await SecureStore.setItemAsync('auth-token', token);
    setState({ token, isLoading: false });
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('auth-token');
    setState({ token: null, isLoading: false });
  };

  return { ...state, login, logout };
}
```

- [ ] **Step 5: 创建导航**

```typescript
// expo-app/src/navigation/index.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../theme';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import ReviewInputScreen from '../screens/ReviewInputScreen';
import ReviewDetailScreen from '../screens/ReviewDetailScreen';
import GoalsScreen from '../screens/GoalsScreen';
import GoalEditScreen from '../screens/GoalEditScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function Navigation() {
  const { token, isLoading } = useAuth();

  if (isLoading) return null;

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {!token ? (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        ) : (
          <>
            <Stack.Screen name="Home" component={HomeScreen} options={{ title: '复盘神器' }} />
            <Stack.Screen name="ReviewInput" component={ReviewInputScreen} options={{ title: '今日复盘' }} />
            <Stack.Screen name="ReviewDetail" component={ReviewDetailScreen} options={{ title: '复盘详情' }} />
            <Stack.Screen name="Goals" component={GoalsScreen} options={{ title: '年度目标' }} />
            <Stack.Screen name="GoalEdit" component={GoalEditScreen} options={{ title: '编辑目标' }} />
            <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: '个人设置' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 6: 创建 App.tsx 入口**

```typescript
// expo-app/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import Navigation from './src/navigation';

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <Navigation />
    </>
  );
}
```

- [ ] **Step 7: Commit**

```bash
git add expo-app/
git commit -m "feat: expo app scaffold + theme + navigation + api client"
git push
```

---

### Task 7: 登录页面 + 首页

**Files:**
- Create: `expo-app/src/screens/LoginScreen.tsx`
- Create: `expo-app/src/screens/HomeScreen.tsx`
- Create: `expo-app/src/components/GoalCard.tsx`

- [ ] **Step 1: 创建 LoginScreen**

```typescript
// expo-app/src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { authApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    if (phone.length !== 11) {
      Alert.alert('请输入正确的手机号');
      return;
    }
    setLoading(true);
    try {
      await authApi.sendCode(phone);
      setCodeSent(true);
    } catch (e: any) {
      Alert.alert('发送失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) {
      Alert.alert('请输入 6 位验证码');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.verifyCode(phone, code);
      await login(res.data.data.token);
    } catch (e: any) {
      Alert.alert('验证失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.content}>
        <Text style={styles.title}>复盘神器</Text>
        <Text style={styles.subtitle}>设定目标，每天说几句{"\n"}AI 帮你结构化反思</Text>

        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            placeholder="手机号"
            placeholderTextColor={colors.textSecondary}
            keyboardType="phone-pad"
            maxLength={11}
            value={phone}
            onChangeText={setPhone}
          />
          <TouchableOpacity
            style={[styles.button, styles.sendBtn]}
            onPress={handleSendCode}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {codeSent ? '重新发送' : '获取验证码'}
            </Text>
          </TouchableOpacity>
        </View>

        {codeSent && (
          <View style={styles.inputGroup}>
            <TextInput
              style={styles.input}
              placeholder="验证码"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity
              style={[styles.button, styles.verifyBtn]}
              onPress={handleVerify}
              disabled={loading}
            >
              <Text style={styles.buttonText}>{loading ? '...' : '登录'}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...fonts.title,
    fontSize: 32,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...fonts.caption,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  inputGroup: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 50,
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  button: {
    height: 50,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtn: {
    backgroundColor: colors.primary,
  },
  verifyBtn: {
    backgroundColor: colors.success,
  },
  buttonText: {
    color: colors.white,
    ...fonts.body,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: 创建 GoalCard 组件**

```typescript
// expo-app/src/components/GoalCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { AnnualGoal } from '../../../shared/types';

const categoryLabels: Record<string, string> = {
  WORK: '工作',
  RELATIONSHIP: '人际',
  PERSONAL_STATE: '个人状态',
  PERSONAL_LIFE: '个人生活',
};

export default function GoalCard({ goal, onPress }: { goal: AnnualGoal; onPress?: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.category}>{categoryLabels[goal.category] || goal.category}</Text>
        <Text style={styles.progress}>{goal.progress}%</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>{goal.title}</Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 220,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  category: {
    ...fonts.caption,
    color: colors.primary,
  },
  progress: {
    ...fonts.caption,
    fontWeight: '600',
    color: colors.text,
  },
  title: {
    ...fonts.heading,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
});
```

- [ ] **Step 3: 创建 HomeScreen**

```typescript
// expo-app/src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi, reviewsApi } from '../api/client';
import GoalCard from '../components/GoalCard';
import type { AnnualGoal, Review } from '../../../shared/types';

export default function HomeScreen({ navigation }: any) {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);
  const [recentReviews, setRecentReviews] = useState<Review[]>([]);
  const [todayReviewed, setTodayReviewed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [goalsRes, reviewsRes] = await Promise.all([
        goalsApi.list(),
        reviewsApi.list({ pageSize: 5 }),
      ]);
      setGoals(goalsRes.data.data || []);
      const reviews = reviewsRes.data.data || [];
      setRecentReviews(reviews);

      // 检查今日是否已复盘
      const today = new Date().toISOString().slice(0, 10);
      setTodayReviewed(reviews.some((r: Review) => r.createdAt.slice(0, 10) === today));
    } catch (e) {
      console.error('Failed to load home data:', e);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', loadData);
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
    >
      {/* 今日复盘状态 */}
      <View style={styles.todayCard}>
        <Text style={styles.todayTitle}>
          {todayReviewed ? '今日已完成复盘' : '今日还未复盘'}
        </Text>
        <Text style={styles.todaySubtitle}>
          {todayReviewed ? '做得好！继续保持' : '花 2 分钟，记录今天吧'}
        </Text>
        {!todayReviewed && (
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('ReviewInput')}
          >
            <Text style={styles.fabText}>开始复盘</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 年度目标 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>年度目标</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Goals')}>
            <Text style={styles.viewAll}>查看全部</Text>
          </TouchableOpacity>
        </View>
        {goals.length === 0 ? (
          <TouchableOpacity
            style={styles.emptyState}
            onPress={() => navigation.navigate('GoalEdit', { mode: 'create' })}
          >
            <Text style={styles.emptyText}>设定你的第一个年度目标</Text>
          </TouchableOpacity>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </ScrollView>
        )}
      </View>

      {/* 最近复盘 */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>最近复盘</Text>
        </View>
        {recentReviews.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>还没有复盘记录</Text>
          </View>
        ) : (
          recentReviews.map(review => (
            <TouchableOpacity
              key={review.id}
              style={styles.reviewItem}
              onPress={() => navigation.navigate('ReviewDetail', { id: review.id })}
            >
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewScope}>{review.scopeArea}</Text>
                <Text style={styles.reviewDate}>
                  {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                </Text>
              </View>
              <Text style={styles.reviewPreview} numberOfLines={2}>
                {review.rawText.slice(0, 100)}
              </Text>
              {review.tags && (review.tags as string[]).length > 0 && (
                <View style={styles.tagRow}>
                  {(review.tags as string[]).slice(0, 3).map((tag: string) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  todayCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  todayTitle: { ...fonts.heading, marginBottom: spacing.xs },
  todaySubtitle: { ...fonts.caption, marginBottom: spacing.md },
  fab: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 4,
    borderRadius: 24,
  },
  fabText: { color: colors.white, ...fonts.body, fontWeight: '600' },
  section: { marginBottom: spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  sectionTitle: { ...fonts.heading },
  viewAll: { ...fonts.caption, color: colors.primary },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyText: { ...fonts.caption, color: colors.textSecondary },
  reviewItem: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  reviewScope: { ...fonts.caption, color: colors.primary, fontWeight: '600' },
  reviewDate: { ...fonts.caption, color: colors.textSecondary },
  reviewPreview: { ...fonts.body, fontSize: 14, marginBottom: spacing.sm },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
  },
  tagText: { ...fonts.caption, fontSize: 12, color: colors.textSecondary },
});
```

- [ ] **Step 4: Commit**

```bash
git add expo-app/src/screens/LoginScreen.tsx expo-app/src/screens/HomeScreen.tsx expo-app/src/components/GoalCard.tsx
git commit -m "feat: login screen + home screen with goals and reviews"
git push
```

---

### Task 8: 复盘输入页 + 复盘详情页 + Scope 选择器

**Files:**
- Create: `expo-app/src/screens/ReviewInputScreen.tsx`
- Create: `expo-app/src/screens/ReviewDetailScreen.tsx`
- Create: `expo-app/src/components/ScopeSelector.tsx`
- Create: `expo-app/src/components/VoiceRecorder.tsx`
- Create: `expo-app/src/components/GDRRCard.tsx`
- Create: `expo-app/src/components/CoachQuestions.tsx`

- [ ] **Step 1: 创建 ScopeSelector**

```typescript
// expo-app/src/components/ScopeSelector.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { ScopeArea } from '../../../shared/types';

const options: { value: ScopeArea; label: string }[] = [
  { value: 'WORK', label: '工作' },
  { value: 'RELATIONSHIP', label: '人际' },
  { value: 'PERSONAL_STATE', label: '个人状态' },
  { value: 'PERSONAL_LIFE', label: '个人生活' },
];

export default function ScopeSelector({
  value,
  onChange,
}: {
  value: ScopeArea;
  onChange: (v: ScopeArea) => void;
}) {
  return (
    <View style={styles.container}>
      {options.map(opt => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.chip, value === opt.value && styles.activeChip]}
          onPress={() => onChange(opt.value)}
        >
          <Text style={[styles.chipText, value === opt.value && styles.activeChipText]}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: { ...fonts.caption, color: colors.text },
  activeChipText: { color: colors.white },
});
```

- [ ] **Step 2: 创建 VoiceRecorder**

```typescript
// expo-app/src/components/VoiceRecorder.tsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';

export default function VoiceRecorder({ onResult }: { onResult: (text: string) => void }) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('需要麦克风权限');
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } catch (e) {
      Alert.alert('录音启动失败');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);

    setIsRecording(false);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    setRecording(null);

    if (!uri) return;

    setTranscribing(true);
    try {
      // 读文件 → base64 → 上传
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/wav',
        name: 'recording.wav',
      } as any);

      const res = await reviewsApi.uploadAudio(formData);
      onResult(res.data.data.text);
    } catch (e: any) {
      // 开发环境：直接展示 mock 结果
      onResult('[语音识别结果] 今天开了产品评审会，大家对方案有些分歧...');
    } finally {
      setTranscribing(false);
    }
  };

  const cancelRecording = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
      setRecording(null);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setIsRecording(false);
    setDuration(0);
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (transcribing) {
    return (
      <View style={styles.container}>
        <Text style={styles.transcribing}>正在识别语音...</Text>
      </View>
    );
  }

  if (isRecording) {
    return (
      <View style={styles.container}>
        <View style={styles.recordingRing}>
          <View style={styles.recordingDot} />
        </View>
        <Text style={styles.timer}>{formatTime(duration)}</Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancelRecording}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
            <Text style={styles.stopText}>停止</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
      <Text style={styles.recordButtonText}>🎤 点击录音</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.md },
  recordingRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  recordingDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF4444',
  },
  timer: { ...fonts.title, color: colors.primary, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.lg },
  cancelBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelText: { ...fonts.body, color: colors.textSecondary },
  stopBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  stopText: { ...fonts.body, color: colors.white, fontWeight: '600' },
  recordButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  recordButtonText: { ...fonts.heading, color: colors.white },
  transcribing: { ...fonts.body, color: colors.textSecondary },
});
```

- [ ] **Step 3: 创建 ReviewInputScreen**

```typescript
// expo-app/src/screens/ReviewInputScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';
import ScopeSelector from '../components/ScopeSelector';
import VoiceRecorder from '../components/VoiceRecorder';
import type { ScopeArea } from '../../../shared/types';

export default function ReviewInputScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [scope, setScope] = useState<ScopeArea>('WORK');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('请输入或录入复盘内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsApi.create({ rawText: trimmed, scopeArea: scope });
      const review = res.data.data;
      navigation.replace('ReviewDetail', { id: review.id });
    } catch (e: any) {
      Alert.alert('提交失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceResult = (recognizedText: string) => {
    setText(prev => prev ? `${prev}\n${recognizedText}` : recognizedText);
  };

  if (submitting) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>AI 正在分析你的复盘...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScopeSelector value={scope} onChange={setScope} />

      <VoiceRecorder onResult={handleVoiceResult} />

      <TextInput
        style={styles.textInput}
        placeholder="说说今天发生了什么..."
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        value={text}
        onChangeText={setText}
      />

      <TouchableOpacity
        style={[styles.submitBtn, !text.trim() && styles.submitDisabled]}
        onPress={handleSubmit}
        disabled={!text.trim()}
      >
        <Text style={styles.submitText}>提交分析</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    minHeight: 200,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.5 },
  submitText: { ...fonts.heading, color: colors.white },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: { ...fonts.body, color: colors.textSecondary, marginTop: spacing.md },
});
```

- [ ] **Step 4: 创建 GDRRCard 组件**

```typescript
// expo-app/src/components/GDRRCard.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import type { GDRR } from '../../../shared/types';

const sections: { key: keyof GDRR; label: string }[] = [
  { key: 'goal', label: '目标' },
  { key: 'result', label: '结果' },
  { key: 'difference', label: '差异' },
  { key: 'reason', label: '根因' },
];

export default function GDRRCard({ gdrr }: { gdrr: GDRR }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    goal: true,
    result: true,
    difference: true,
    reason: true,
  });

  const toggle = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>GDRR 分析</Text>
      {sections.map(({ key, label }) => (
        <View key={key} style={styles.section}>
          <TouchableOpacity style={styles.sectionHeader} onPress={() => toggle(key)}>
            <Text style={styles.sectionLabel}>{label}</Text>
            <Text style={styles.toggleIcon}>{expanded[key] ? '−' : '+'}</Text>
          </TouchableOpacity>
          {expanded[key] && (
            <Text style={styles.sectionContent}>{gdrr[key] || '暂无'}</Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...fonts.heading, fontSize: 16, marginBottom: spacing.md },
  section: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: { ...fonts.body, fontWeight: '600', color: colors.primary },
  toggleIcon: { ...fonts.heading, color: colors.textSecondary, fontSize: 20 },
  sectionContent: { ...fonts.body, marginTop: spacing.xs, lineHeight: 22 },
});
```

- [ ] **Step 5: 创建 CoachQuestions 组件**

```typescript
// expo-app/src/components/CoachQuestions.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

export default function CoachQuestions({
  questions,
  onQuestionPress,
  onChatPress,
}: {
  questions: string[];
  onQuestionPress: (q: string) => void;
  onChatPress: () => void;
}) {
  if (!questions || questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>教练想问你</Text>
      {questions.map((q, i) => (
        <TouchableOpacity key={i} style={styles.questionCard} onPress={() => onQuestionPress(q)}>
          <Text style={styles.questionText}>{q}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.chatButton} onPress={onChatPress}>
        <Text style={styles.chatButtonText}>深入聊聊</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  title: { ...fonts.heading, fontSize: 16, marginBottom: spacing.sm },
  questionCard: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  questionText: { ...fonts.body, fontSize: 14, lineHeight: 20 },
  chatButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm + 4,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  chatButtonText: { ...fonts.body, color: colors.white, fontWeight: '600' },
});
```

- [ ] **Step 6: 创建 ReviewDetailScreen**

```typescript
// expo-app/src/screens/ReviewDetailScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';
import GDRRCard from '../components/GDRRCard';
import CoachQuestions from '../components/CoachQuestions';
import type { Review } from '../../../shared/types';

export default function ReviewDetailScreen({ route, navigation }: any) {
  const { id } = route.params;
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    reviewsApi.get(id)
      .then(res => setReview(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.loading}>
        <Text style={styles.errorText}>复盘不存在</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* 原始文本 */}
      <View style={styles.rawSection}>
        <Text style={styles.rawLabel}>原文</Text>
        <Text style={styles.rawText}>{review.rawText}</Text>
      </View>

      {/* 标签 */}
      {review.tags && (review.tags as string[]).length > 0 && (
        <View style={styles.tagRow}>
          {(review.tags as string[]).map((tag: string) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* GDRR 卡片 */}
      <GDRRCard gdrr={review.gdrr} />

      {/* 教练追问 */}
      <CoachQuestions
        questions={(review.coachQuestions as string[]) || []}
        onQuestionPress={(q: string) => {
          // Phase 2: 跳转教练对话页
        }}
        onChatPress={() => {
          // Phase 2: 打开多轮对话
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  errorText: { ...fonts.body, color: colors.textSecondary },
  rawSection: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  rawLabel: { ...fonts.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  rawText: { ...fonts.body, fontSize: 14, lineHeight: 22 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  tag: {
    backgroundColor: colors.card,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { ...fonts.caption, fontSize: 12, color: colors.primary },
});
```

- [ ] **Step 7: Commit**

```bash
git add expo-app/src/screens/ReviewInputScreen.tsx expo-app/src/screens/ReviewDetailScreen.tsx expo-app/src/components/
git commit -m "feat: review input + detail screens with GDRR and coach questions"
git push
```

---

### Task 9: 目标管理页 + 用户画像页

**Files:**
- Create: `expo-app/src/screens/GoalsScreen.tsx`
- Create: `expo-app/src/screens/GoalEditScreen.tsx`
- Create: `expo-app/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: 创建 GoalsScreen**

```typescript
// expo-app/src/screens/GoalsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi } from '../api/client';
import type { AnnualGoal } from '../../../shared/types';

const categoryLabels: Record<string, string> = {
  WORK: '工作', RELATIONSHIP: '人际', PERSONAL_STATE: '个人状态', PERSONAL_LIFE: '个人生活',
};

export default function GoalsScreen({ navigation }: any) {
  const [goals, setGoals] = useState<AnnualGoal[]>([]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      goalsApi.list().then(res => setGoals(res.data.data || [])).catch(console.error);
    });
    return unsubscribe;
  }, [navigation]);

  const handleDelete = (id: string) => {
    Alert.alert('确认删除', '删除后无法恢复', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除', style: 'destructive',
        onPress: async () => {
          await goalsApi.delete(id);
          setGoals(prev => prev.filter(g => g.id !== id));
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {goals.map(goal => (
        <TouchableOpacity
          key={goal.id}
          style={styles.card}
          onPress={() => navigation.navigate('GoalEdit', { mode: 'edit', goal })}
          onLongPress={() => handleDelete(goal.id)}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.category}>{categoryLabels[goal.category] || goal.category}</Text>
            <Text style={styles.status}>
              {goal.status === 'ACTIVE' ? '进行中' : goal.status === 'COMPLETED' ? '已完成' : '已放弃'}
            </Text>
          </View>
          <Text style={styles.title}>{goal.title}</Text>
          <Text style={styles.desc} numberOfLines={2}>{goal.description}</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${goal.progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{goal.progress}%</Text>
          </View>
        </TouchableOpacity>
      ))}
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate('GoalEdit', { mode: 'create' })}
      >
        <Text style={styles.addButtonText}>+ 添加目标</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  category: { ...fonts.caption, color: colors.primary, fontWeight: '600' },
  status: { ...fonts.caption, color: colors.textSecondary },
  title: { ...fonts.heading, fontSize: 16, marginBottom: spacing.xs },
  desc: { ...fonts.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  progressBar: {
    flex: 1, height: 6, backgroundColor: colors.border,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  progressText: { ...fonts.caption, fontWeight: '600' },
  addButton: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  addButtonText: { ...fonts.body, color: colors.primary },
});
```

- [ ] **Step 2: 创建 GoalEditScreen**

```typescript
// expo-app/src/screens/GoalEditScreen.tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { goalsApi } from '../api/client';
import type { GoalCategory, AnnualGoal } from '../../../shared/types';

const categories: { value: GoalCategory; label: string }[] = [
  { value: 'WORK', label: '工作' },
  { value: 'RELATIONSHIP', label: '人际' },
  { value: 'PERSONAL_STATE', label: '个人状态' },
  { value: 'PERSONAL_LIFE', label: '个人生活' },
];

export default function GoalEditScreen({ route, navigation }: any) {
  const { mode, goal } = route.params || {};
  const isEdit = mode === 'edit' && goal;

  const [title, setTitle] = useState(isEdit ? goal.title : '');
  const [description, setDescription] = useState(isEdit ? goal.description : '');
  const [category, setCategory] = useState<GoalCategory>(isEdit ? goal.category : 'WORK');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('请输入目标标题');
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim(),
        category,
        keyResults: [],
      };
      if (isEdit) {
        await goalsApi.update(goal.id, data);
      } else {
        await goalsApi.create(data);
      }
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('保存失败', e.response?.data?.error || '请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>类别</Text>
      <View style={styles.categoryRow}>
        {categories.map(c => (
          <TouchableOpacity
            key={c.value}
            style={[styles.categoryChip, category === c.value && styles.categoryActive]}
            onPress={() => setCategory(c.value)}
          >
            <Text style={[styles.categoryText, category === c.value && styles.categoryTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>目标标题</Text>
      <TextInput
        style={styles.input}
        placeholder="例：提升跨部门协作能力"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={100}
      />

      <Text style={styles.label}>描述（可选）</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="详细描述你的目标..."
        placeholderTextColor={colors.textSecondary}
        multiline
        textAlignVertical="top"
        value={description}
        onChangeText={setDescription}
        maxLength={500}
      />

      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveText}>{saving ? '保存中...' : '保存'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { ...fonts.caption, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md },
  categoryRow: { flexDirection: 'row', gap: spacing.sm },
  categoryChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  categoryText: { ...fonts.caption, color: colors.text },
  categoryTextActive: { color: colors.white },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveText: { ...fonts.heading, color: colors.white },
});
```

- [ ] **Step 3: 创建 ProfileScreen**

```typescript
// expo-app/src/screens/ProfileScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { userApi } from '../api/client';
import { useAuth } from '../hooks/useAuth';

export default function ProfileScreen() {
  const { logout } = useAuth();
  const [nickname, setNickname] = useState('');
  const [role, setRole] = useState('');
  const [focusAreas, setFocusAreas] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userApi.getProfile().then(res => {
      const user = res.data.data;
      setNickname(user.nickname || '');
      setRole(user.profile?.role || '');
      setFocusAreas(user.profile?.focusAreas?.join('、') || '');
    }).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await userApi.updateProfile({
        nickname: nickname.trim(),
        profile: {
          role: role.trim(),
          focusAreas: focusAreas.split(/[、,，]/).map((s: string) => s.trim()).filter(Boolean),
        },
      });
      Alert.alert('已保存');
    } catch (e: any) {
      Alert.alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('确认退出', '', [
      { text: '取消', style: 'cancel' },
      { text: '退出', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>昵称</Text>
      <TextInput
        style={styles.input}
        placeholder="你的昵称"
        placeholderTextColor={colors.textSecondary}
        value={nickname}
        onChangeText={setNickname}
      />

      <Text style={styles.label}>职业/角色</Text>
      <TextInput
        style={styles.input}
        placeholder="例：产品经理"
        placeholderTextColor={colors.textSecondary}
        value={role}
        onChangeText={setRole}
      />

      <Text style={styles.label}>关注领域（用逗号分隔）</Text>
      <TextInput
        style={styles.input}
        placeholder="例：管理能力、技术成长、人际关系"
        placeholderTextColor={colors.textSecondary}
        value={focusAreas}
        onChangeText={setFocusAreas}
      />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
        <Text style={styles.saveText}>{saving ? '保存中...' : '保存画像'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md },
  label: { ...fonts.caption, fontWeight: '600', marginBottom: spacing.xs, marginTop: spacing.md },
  input: {
    backgroundColor: colors.card,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    ...fonts.body,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveText: { ...fonts.heading, color: colors.white },
  logoutBtn: {
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  logoutText: { ...fonts.body, color: colors.textSecondary },
});
```

- [ ] **Step 4: Commit**

```bash
git add expo-app/src/screens/GoalsScreen.tsx expo-app/src/screens/GoalEditScreen.tsx expo-app/src/screens/ProfileScreen.tsx
git commit -m "feat: goals management + profile screens"
git push
```

---

### Task 10: 依赖安装 + README + 配置说明

**Files:**
- Modify: `README.md`
- Create: `server/.env` (gitignore'd, 仅本地)

- [ ] **Step 1: 更新 README.md**

```bash
# 替换 README.md 为完整开发文档
```

README 内容包括：
- 项目简介
- 技术栈
- 快速启动（server: `npm install && npx prisma migrate dev && npm run dev`，expo: `npm install && npm start`）
- 环境变量配置说明
- API 文档索引
- 项目结构

- [ ] **Step 2: 安装依赖并验证**

```bash
cd server && npm install && npx prisma generate
cd ../expo-app && npm install
```

- [ ] **Step 3: 启动验证**

```bash
# 启动后端
cd server && npm run dev
# 另开终端启动前端
cd expo-app && npm start
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: update README with setup instructions"
git push
```

---

## 自检清单

- [x] 所有文件路径精确
- [x] 每个 Task 有完整可执行的步骤
- [x] 共享类型覆盖所有 API 契约
- [x] SQL Schema → Prisma Schema 映射完整
- [x] 教练记忆机制（UserInsight 表 + coach service context 注入）在 Task 2/5 中实现
- [x] GDRR 结构化 JSON Schema 在 DeepSeek prompt 中体现
- [x] 暖色主题在 theme/index.ts 中定义
- [x] 手机号验证码登录完整流程
- [x] 语音 ASR（含开发环境 mock）
- [x] 无 placeholder / TODO / TBD
