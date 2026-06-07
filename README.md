# 吾日三省吾身

> 设定目标，每天说几句，AI 帮你结构化反思，追踪你的成长轨迹。

"吾日三省吾身"（ReviewMaster）是一款**零摩擦**的个人复盘工具。定好年度目标，每天语音或文字随便说几句今天发生了什么，AI 自动按 GDRR 框架（目标-结果-差异-根因）结构化整理，还能像教练一样跟你深入对话、生成周/月/季报。

## 为什么不一样

| 传统日记 | 吾日三省吾身 |
|---------|-------------|
| 得自己打字整理 | 语音 / 文字随便说，AI 自动结构化成 GDRR |
| 孤立的一条条记录 | 每条复盘自动关联年度目标，追踪进度 |
| 写完了就完了 | AI 教练能追问你的盲区，给真建议 |
| 需要登录注册 | 装好即用，Device ID 无感自动登录 |
| 自己找 API Key | 后端托管，打开直接用 |

## 技术栈

| 层 | 选型 |
|---|------|
| 前端 | React Native (Expo SDK 54) + TypeScript |
| 后端 | Node.js + Express + TypeScript（Render 部署） |
| 数据库 | PostgreSQL 16 + Prisma ORM（Neon） |
| AI | DeepSeek API（GDRR 结构化 + Coach Agent function calling） |
| 语音 | 腾讯云 ASR（语音转文字） |
| 推送 | 本地通知（每日复盘提醒） |
| 更新 | EAS Update（OTA 热更新，不用重装 APK） |

## 核心功能

### 1. 无感登录
第一次打开 App 自动用设备 ID 创建账号，零交互。没装 SIM 卡也能用。

### 2. 年度目标管理
设四维度目标（工作/关系/个人状态/个人生活），支持自然语言输入（比如"我要学会写 React"），AI 自动解析填充。

### 3. Typeless 复盘
点击录音按钮直接说，说完了提交，2-3 秒 AI 整理成 GDRR 结构化卡片：

| GDRR | 说明 |
|------|------|
| Goal（目标） | 当时想达成什么 |
| Result（结果） | 实际发生了什么 |
| Difference（差异） | 目标 vs 结果的落差 |
| Reason（根因） | 背后的深层原因 |

语音记录支持腾讯云 ASR + DeepSeek 纠错，识别不准的自动修正。

### 4. AI 教练对话
每条复盘都能跟 AI 教练深入聊。教练是 Tool-use Agent，能自主调用 6 个工具：

- `searchReviews` — 翻你的历史复盘
- `getGoalProgress` — 看目标进度
- `getUserInsights` — 读取洞察
- `getRecentPatterns` — 分析近期模式
- `getReviewStats` — 查统计
- `updateUserProfile` — 更新画像

聊完后自动提取洞察，形成长期记忆。也支持接入本地 [OpenClaw](https://github.com/2023liushuya-lab/openclaw) 实例。

### 5. AI 周期报告
自动生成周报 / 月报 / 季报，包含：
- 复盘统计（次数、连续天数、话题分布）
- AI 叙事总结（教练口吻写你的变化）
- 成长信号（技能、模式、突破）
- 目标对齐评估 + 下阶段建议

### 6. 更多
- **首页仪表盘**：连续天数、本周次数、今日复盘状态、目标进度
- **历史列表**：关键词搜索、话题筛选、标签过滤，支持分页
- **每日提醒**：选个时间，每天推送通知提醒你复盘
- **GSAP 风格动效**：入场动画、弹簧按钮反馈、展开收起动效
- **OTA 热更新**：代码变更直接推送到手机，不用重新打包

## 快速体验

Android APK 通过 EAS Build 构建。联系作者获取。

### 本地开发

```bash
# 后端
cd server
cp .env.example .env   # 填入 DeepSeek API Key + 腾讯云密钥（可选）
npm install
npx prisma migrate dev --name init
npm run dev

# 前端
cd expo-app
npm install
npx expo start
```

环境变量说明见 [server/.env.example](server/.env.example)。

## 项目结构

```
吾日三省吾身/
├── expo-app/          # React Native 前端
│   ├── src/
│   │   ├── screens/   # 页面（首页、复盘、详情、目标、历史、报告、教练、设置）
│   │   ├── components/# 可复用组件（录音、GDRR卡片、教练气泡、目标卡片、图表）
│   │   ├── hooks/     # useAuth
│   │   ├── navigation/# 导航栈
│   │   ├── theme/     # 暖色纸质手帐风主题
│   │   └── utils/     # 动画、通知助手
│   └── App.tsx
├── server/            # Express 后端
│   ├── prisma/        # 数据模型 + 迁移
│   ├── src/
│   │   ├── routes/    # auth / goals / reviews / coach / user / reports
│   │   ├── services/  # DeepSeek / ASR / SMS / Coach / 报告生成
│   │   ├── agents/    # Coach Agent（工具 + 记忆 + DeepSeek/OpenClaw 后端）
│   │   └── middleware/ # JWT 鉴权 + 错误处理
│   └── config.ts
├── shared/            # 共享 TypeScript 类型
├── docs/              # 产品文档
│   ├── product-prd.md
│   └── coach-design.md
└── render.yaml        # Render 部署配置
```

## 部署

- **后端**：Render（[wurisanxingwushen.onrender.com](https://wurisanxingwushen.onrender.com)）
- **数据库**：Neon（PostgreSQL）
- **前端更新**：EAS Update（Expo 托管）
- **APK 构建**：EAS Build

## License

MIT
