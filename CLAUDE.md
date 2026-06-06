# ReviewMaster（复盘神器）— 项目 CLAUDE.md

## 项目定位

个人每日复盘应用。用户设定年度四维度目标（工作/关系/个人状态/个人生活），通过语音/文字记录每日反思，AI 按 GDRR 框架（Goal-Result-Difference-Reason）结构化输出，配备 Coach Agent 追问。

## 技术栈

| 层 | 技术 |
|-----|------|
| 前端 | React Native (Expo SDK 54), TypeScript |
| 后端 | Node.js, Express, TypeScript |
| 数据库 | PostgreSQL 16 (本地 Homebrew) + Prisma ORM |
| AI | DeepSeek API (chat + function calling + embeddings) |
| 语音 | 腾讯云 ASR（实时语音转文字） |
| 短信 | 腾讯云 SMS（登录验证码） |
| 部署目标 | Render (后端) + Neon (数据库) + EAS Build (App) |

## 项目结构

```
吾日三省吾身/
├── expo-app/          # React Native 前端
├── server/            # Express 后端
├── shared/            # 共享类型
├── docs/              # 文档
├── render.yaml        # Render 部署配置
└── CLAUDE.md          # 本文件
```

## 关键约定

- **语音交互**: 点击开始录音（Typeless 风格），非按住说话
- **ASR 纠错**: 腾讯云识别结果经 DeepSeek 纠错后再展示
- **目标管理**: 用户自定维度 + 目标，AI 只做分类不做评判
- **GDRR 框架**: Goal（目标回顾）→ Result（实际结果）→ Difference（差距分析）→ Reason（原因洞察）
- **Coach Agent**: 6 个工具（getGoal/saveReflection/checkProgress 等），tool-use 架构
- **色彩主题**: 暖色调纸质手帐风（#FFF8F0 / #C4724B / #3C2E26）
- **无复盘次数限制**: 用户想记多少记多少

## GitHub

- 仓库: `github.com/2023liushuya-lab/daily-self-reflection`
- 分支: `main`

## 当前开发阶段

- ✅ Device ID 自动登录（无 SMS，无感）
- ✅ 年度目标 CRUD + AI 分类 + 自然语言解析
- ✅ Typeless 复盘输入（语音 + 文字）
- ✅ 腾讯云 ASR + DeepSeek 纠错
- ✅ GDRR AI 结构化展示
- ✅ Coach Agent（6 工具，function calling，记忆系统 + OpenClaw 支持）
- ✅ 多轮教练对话（气泡式 UI）
- ✅ 周/月/季报（AI 生成 + 图表）
- ✅ 历史列表（搜索/筛选/标签）
- ✅ 定时提醒
- ✅ 首页仪表盘（连续天数、本周统计）
- ✅ 品牌：吾日三省吾身（自定义图标）
- ✅ GSAP 风格动效（入场、弹簧反馈、展开收起）
- ✅ OTA 热更新（EAS Update）
- ✅ 后端部署（Render + Neon）
- ✅ Android APK 构建（EAS Build）
