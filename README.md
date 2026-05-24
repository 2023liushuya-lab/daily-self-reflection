# 复盘神器 (ReviewMaster)

每日自省日记应用 — 设定目标，每天说几句，AI 帮你结构化反思。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React Native (Expo) + TypeScript |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL + Prisma ORM |
| AI | DeepSeek API（GDRR 结构化 + 教练对话） |
| 语音 | 腾讯云 ASR（语音转文字） |
| 短信 | 腾讯云 SMS（验证码登录） |

## 项目结构

```
吾日三省吾身/
├── shared/           # 共享 TypeScript 类型定义
│   └── types.ts
├── server/           # 后端 API 服务
│   ├── prisma/
│   │   └── schema.prisma   # 数据库模型
│   ├── src/
│   │   ├── index.ts        # Express 入口
│   │   ├── config.ts       # 环境变量配置
│   │   ├── middleware/      # JWT 鉴权 + 错误处理
│   │   ├── routes/          # 路由（auth/goals/reviews/coach/user）
│   │   └── services/        # 服务（DeepSeek/ASR/SMS/Coach）
│   └── package.json
├── expo-app/         # React Native 前端
│   ├── src/
│   │   ├── api/         # API Client
│   │   ├── components/  # 可复用组件
│   │   ├── hooks/       # useAuth 等 hooks
│   │   ├── navigation/  # 导航配置
│   │   ├── screens/     # 页面
│   │   └── theme/       # 主题定义
│   ├── App.tsx
│   └── package.json
└── docs/             # 产品文档
    ├── product-prd.md
    ├── coach-design.md
    └── superpowers/plans/
```

## 快速启动

### 1. 环境准备

需要：Node.js 18+, PostgreSQL 数据库

### 2. 启动后端

```bash
cd server

# 复制并编辑环境变量
cp .env.example .env
# 编辑 .env 填入你的 API Key

# 安装依赖
npm install

# 创建数据库（需要本地 PostgreSQL 运行）
npx prisma migrate dev --name init

# 启动开发服务器
npm run dev
```

### 3. 启动前端

```bash
cd expo-app

npm install
npm start
# 用 Expo Go 扫码或连接模拟器
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 服务端口 | 3000 |
| `DATABASE_URL` | PostgreSQL 连接 URL | - |
| `JWT_SECRET` | JWT 签名密钥 | - |
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | - |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址 | `https://api.deepseek.com` |
| `TENCENT_SECRET_ID` | 腾讯云 SecretId | - |
| `TENCENT_SECRET_KEY` | 腾讯云 SecretKey | - |
| `TENCENT_SMS_APP_ID` | 短信应用 ID | - |
| `TENCENT_SMS_SIGN_NAME` | 短信签名 | - |
| `TENCENT_SMS_TEMPLATE_ID` | 短信模板 ID | - |

> 开发环境未配置腾讯云密钥时，验证码会打印在控制台，ASR 返回 mock 结果。

## API 端点

| 方法 | 路径 | 说明 | 鉴权 |
|------|------|------|------|
| POST | `/api/auth/send-code` | 发送验证码 | 否 |
| POST | `/api/auth/verify-code` | 验证登录 | 否 |
| GET | `/api/goals` | 获取目标列表 | 是 |
| POST | `/api/goals` | 创建目标 | 是 |
| PUT | `/api/goals/:id` | 更新目标 | 是 |
| DELETE | `/api/goals/:id` | 删除目标 | 是 |
| POST | `/api/reviews/upload-audio` | 上传语音 | 是 |
| POST | `/api/reviews` | 创建复盘（AI 结构化） | 是 |
| GET | `/api/reviews` | 获取复盘列表 | 是 |
| GET | `/api/reviews/:id` | 获取复盘详情 | 是 |
| GET | `/api/reviews/:id/coach-messages` | 获取教练对话 | 是 |
| POST | `/api/reviews/:id/coach-messages` | 发送教练消息 | 是 |
| GET | `/api/user/profile` | 获取用户画像 | 是 |
| PUT | `/api/user/profile` | 更新用户画像 | 是 |

## 核心功能

1. **手机号登录** — 短信验证码自动注册/登录
2. **年度目标 CRUD** — 四维度（工作/人际/个人状态/个人生活）
3. **语音/文字复盘** — 支持录音转文字和手动输入
4. **AI GDRR 结构化** — DeepSeek 自动分析目标-结果-差异-根因
5. **首页仪表盘** — 今日状态、目标进度、最近复盘
6. **教练追问** — 首轮反思问题，引导深入思考
