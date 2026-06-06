# 吾日三省吾身 — 产品需求文档

> 版本：V2.1 | 日期：2026-06-06 | 作者：shuya
>
> 状态：MVP 开发完成，部署上线，APK 已发布

---

## 1. 产品概述

### 1.1 产品定位

**吾日三省吾身**（原名"复盘神器"）是一款 Android 端个人复盘工具。用户设定年度目标后，每天通过语音或文字自由输入经历和反思，AI 自动按 GDRR 框架（Goal-Result-Difference-Reason / 目标-结果-差异-根因）结构化整理，并结合年度目标以教练角色追问盲区、提供对齐目标的建议。

### 1.2 一句话描述

"设定目标，每天说几句，AI 帮你结构化反思，追踪你的成长轨迹。"

### 1.3 核心差异化

| 传统日记/复盘工具 | 吾日三省吾身 |
|------------------|-------------|
| 手动打字整理 | 语音/文字随意输入，AI 自动结构化 |
| 独立记录，无关联 | 每条复盘自动关联年度目标，追踪进度 |
| 被动记录 | AI 教练主动追问盲区，给出成长建议 |
| 用户配置 API Key | 后端托管，打开即用 |
| 需要登录注册 | 无感自动登录，装好即用 |

---

## 2. 目标用户

### 2.1 核心用户画像

- **知识工作者 / 职场人**：有年度目标，需要定期反思和调整
- **自我成长践行者**：习惯记录但缺乏结构化方法
- **忙碌的个体**：需要极低摩擦的输入方式（语音 > 打字）

### 2.2 用户场景

| 场景 | 描述 | 输入方式 |
|------|------|---------|
| 每日复盘 | 下班后回顾今天，说说做了什么、遇到什么问题 | 语音为主 |
| 项目复盘 | 一个项目结束，总结成败得失 | 语音/文字 |
| 周度回顾 | AI 自动聚合一周的复盘，生成周报 | 自动生成 |
| 目标检视 | 查看年度目标进展，看看是否偏离方向 | 阅读报告 |
| 教练对话 | 针对某条复盘深入追问 | 文字对话 |

---

## 3. 功能模块

### 3.1 首页仪表盘 (M4)

**描述**：进入 App 后的仪表盘。

**功能要点**：
- 今日复盘状态卡片（连续天数、本周复盘数、今日是否完成）
- 年度目标进度（横向滑动，显示完成百分比）
- 最近复盘列表（GDRR 摘要，长按可删除）
- 快捷入口：开始复盘、查看报告、历史复盘、教练对话
- 下拉刷新
- 全部带有 GSAP 风格入场动画（渐变 + 上移 + 弹簧缩放）

**优先级**：P0 — MVP 必需 ✅

### 3.2 复盘输入 (M1)

**描述**：核心交互入口。Typeless 语音优先体验——点击按钮开始录音，零摩擦输入。

**功能要点**：
- **语音输入（主）**：圆形录音按钮，点击开始/停止。调用腾讯云 ASR（一句话识别，5000 次/月免费额度）实时转写，结果可编辑修正
- **文字输入（辅）**：底部常驻文本输入框，作为备选入口
- **无 Scope 选择器**：AI 自动从内容理解范畴，不强制用户分类
- **Typeless 式体验**：打开就说，提交后 2-3 秒 AI 结构化处理
- **ASR 纠错**：腾讯云识别结果经 DeepSeek 纠错后再展示
- **提交后**：自动跳转详情页，展示 GDRR 结构化结果

**优先级**：P0 — MVP 必需 ✅

### 3.3 GDRR 结构化展示 (M2)

**描述**：AI 将碎片化的复盘文本按 GDRR 框架结构化，卡片式展示。

**GDRR 框架**：

| 组件 | 中文 | 说明 |
|------|------|------|
| Goal | 目标 | 当时想达成什么 |
| Result | 结果 | 实际发生了什么 |
| Difference | 差异 | 目标与结果的差距分析 |
| Reason | 根因 | 背后深层原因 |

**功能要点**：
- 四段卡片分层展示，每段独立可折叠（带动画展开/收起）
- 关联的年度目标标注
- AI 生成标签 chips
- 教练追问问题自动生成（2-3 个）
- 可选"深入聊聊"进入教练对话
- 编辑/删除操作
- 详情页顶部可删除复盘

**优先级**：P0 — MVP 必需 ✅

### 3.4 AI 教练对话 (M3)

**描述**：教练是 Tool-use Agent，可自主调用工具检索上下文（搜索历史复盘、查询目标进度、读取用户洞察）。对话后异步提取新洞察形成长期记忆。可选接入用户本地 OpenClaw 实例作为教练后端。

**Agent 工具**（6 个）：
- `searchReviews` — 搜索历史复盘
- `getGoalProgress` — 查询目标进度
- `getUserInsights` — 读取用户洞察
- `getRecentPatterns` — 获取近期模式
- `getReviewStats` — 获取复盘统计
- `updateUserProfile` — 更新用户画像

**功能要点**：
- 气泡式对话 UI，GDRR 摘要固定在顶部作为上下文
- 复盘提交后自动生成 2-3 个追问（首轮）
- 用户可点击追问快速回复，也可自由输入
- Agent 自主决定何时调用工具
- 对话 ≥2 轮后异步提取洞察 → 写入 UserInsight
- AI 回复以教练口吻：客观、建设性、略带挑战
- 对话历史持久化
- Coach 打字状态动画（三点闪烁）
- 可选：连接 OpenClaw 本地实例

**优先级**：P0 — MVP 必需 ✅

### 3.5 目标管理 (M0)

**描述**：用户管理年度目标。

**功能要点**：
- 添加/编辑/删除年度目标
- 目标字段：标题、详细描述、类别（工作/人际关系/个人状态/个人生活）
- 关键结果（KR）：每个目标可设置多个可衡量的关键结果（jsonb）
- 进度追踪：用户手动调整 + AI 根据复盘内容建议更新
- 目标状态：进行中 / 已完成 / 已放弃
- 自然语言输入：用户输入"我要学英语" → AI 自动解析并填充字段

**优先级**：P0 — MVP 必需 ✅

### 3.6 周期报告 (M6)

**描述**：用户可查看周报/月报/季报，AI 实时生成叙事报告 + 图表 + 年度目标进度总结。

**报告内容**：
- 复盘统计（次数、连续打卡天数、维度分布图表）
- AI 叙事总结（教练口吻 2-3 段回顾）
- 成长信号：技能观察 / 模式延续 / 关键突破
- 年度目标对齐度评估 + 进度总结 + 建议
- 下周期 actionable 建议
- 缓存策略：周报1天、月报3天、季报7天
- 支持手动重新生成

**优先级**：P0 — MVP 必需 ✅

### 3.7 定时提醒 (M5)

**描述**：本地推送通知，定时提醒用户复盘。

**功能要点**：
- 每日提醒时间设置（默认 21:00，可调）
- 通知栏点击打开 App

**优先级**：P1 ✅

### 3.8 历史列表 (M8)

**描述**：所有历史复盘的列表视图，支持搜索和筛选。

**功能要点**：
- 按时间倒序
- Scope 筛选
- 关键词搜索
- 标签筛选
- 长按删除
- 列表入场带动画

**优先级**：P1 ✅

### 3.9 用户画像 (M7)

**描述**：用户基础信息，注入 AI prompt 实现个性化。

**功能要点**：
- 昵称、职业/角色
- 当前关注领域
- Coach 后端选择（DeepSeek / OpenClaw）

**优先级**：P1 ✅

---

## 4. 用户核心流程

### 4.1 首次使用流程

```
下载 App → 自动创建账号（无感） → 设定年度目标（至少 1 个）
→ 进入首页 → 开始第一次复盘
```

### 4.2 每日复盘流程

```
打开 App → 首页 → 点击「开始复盘」→ 录音/打字
→ 提交 → 2-3 秒 AI 处理 → 跳转详情页 → 查看 GDRR
→ 底部展示教练追问 → 可选：深入对话
```

---

## 5. 技术方案

### 5.1 技术栈

| 层 | 选择 |
|---|------|
| 前端 | React Native (Expo SDK 54) + TypeScript |
| 后端 | Node.js + Express + TypeScript（部署在 Render） |
| 数据库 | PostgreSQL 16 + Prisma ORM |
| 语音识别 | 腾讯云 ASR |
| AI 结构化 + 教练 | DeepSeek API（chat + function calling） |
| 认证 | Device-ID 自动登录（无 SMS，无用户交互） |
| 部署 | Render（后端）+ EAS Build（APK）+ EAS Update（OTA） |
| 项目结构 | Monorepo（expo-app/ + server/ + shared/） |

### 5.2 API 设计

```
POST   /api/auth/device-login          ← Device ID 自动登录（无感）

GET    /api/goals                      ← 目标列表
POST   /api/goals                      ← 创建目标
POST   /api/goals/parse                ← 自然语言解析目标
PUT    /api/goals/:id                  ← 更新目标
DELETE /api/goals/:id                  ← 删除目标

POST   /api/reviews/upload-audio       ← 上传录音，返回 ASR 识别文本
POST   /api/reviews                    ← 提交复盘文本，触发 AI 结构化
GET    /api/reviews                    ← 历史复盘列表（分页+筛选+搜索）
GET    /api/reviews/stats              ← 复盘统计（连续天数、本周次数）
GET    /api/reviews/:id                ← 复盘详情（GDRR + 教练追问）
PUT    /api/reviews/:id                ← 修正复盘内容
DELETE /api/reviews/:id                ← 删除复盘

GET    /api/reviews/:id/coach-messages ← 教练对话历史
POST   /api/reviews/:id/coach-messages ← 发送消息，返回教练回复

GET    /api/user/profile               ← 用户画像
PUT    /api/user/profile               ← 更新画像

GET    /api/reports                    ← 周/月/季报（缓存，支持刷新）
```

### 5.3 数据库核心表

- **User**：id, device_id (unique), nickname, profile_json, created_at
- **AnnualGoal**：id, user_id, title, description, category, key_results(jsonb), progress, status, created_at
- **Review**：id, user_id, raw_text, audio_url, scope_area, gdrr_goal, gdrr_result, gdrr_difference, gdrr_reason, tags(jsonb), coach_questions(jsonb), insight_candidates(jsonb), growth_signals(jsonb), related_goals(jsonb), created_at
- **CoachMessage**：id, review_id, role(user/coach), content, created_at
- **UserInsight**：id, user_id, category(blind_spot/strength/pattern/skill), insight, confidence, created_at
- **Report**：id, user_id, type(week/month/quarter), period_start, period_end, content_json(jsonb), created_at

### 5.4 项目结构

```
/Users/liushuya/Documents/吾日三省吾身/
├── expo-app/           ← React Native (Expo) 前端
├── server/             ← Node.js + Express 后端
├── shared/             ← 共享 TypeScript 类型
├── docs/
│   ├── product-prd.md   ← 本文件
│   └── coach-design.md  ← 教练设定文档
├── render.yaml          ← Render 部署配置
├── CLAUDE.md            ← 项目说明
└── README.md
```

---

## 6. 视觉设计

### 6.1 设计方向

**暖色纸质日记风** — 模拟纸质笔记本的温暖感觉，让用户有"翻开本子写日记"的熟悉感。

### 6.2 色彩系统（V2.1 更新）

| 用途 | 色值 | 说明 |
|------|------|------|
| 主背景 | `#FAFAF8` | 暖白，极简 |
| 卡片背景 | `#FFFFFF` | 纯白 |
| 主色调 | `#B1744B` | 暖棕 |
| 主色亮 | `#D4A88C` | 浅棕 |
| 主色背景 | `#F5EEE8` | 极浅棕 |
| 文字主色 | `#1A1A1A` | 深灰黑 |
| 文字辅助 | `#78716C` | 灰 |
| 成功/积极 | `#5B8C5A` | 墨绿 |
| 分割线 | `#E7E5E4` / `#F0EFED` | 浅灰 |

### 6.3 设计原则

- **像纸一样简洁**：少用卡片阴影，多用空白和层次来区分内容
- **克制动画**：过渡用 fade + spring，保持安静但精致的氛围（GSAP 风格）
- **形状优先**：圆角层级 sm/md/lg/xl/full 一致，所有 UI 统一

### 6.4 App 图标

自定义设计：暖色笔记本外形 + 5 道横线 + 绿色勾号 + 钢笔 + 星号装饰。
格式：icon.png (1024x1024) + adaptive-icon.png (Android) + icon-1024.png (iOS)。

---

## 7. 开发路线图

### Phase 1 — MVP（2026-05-24 ~ 2026-06-06）✅ 已完成

| 功能 | 说明 | 状态 |
|------|------|------|
| 项目脚手架 | Monorepo + Expo + Express + Prisma | ✅ |
| 自动登录 | Device ID 自动创建账号，无 SMS | ✅ |
| 年度目标 CRUD | 设定目标 + 自然语言解析 | ✅ |
| Typeless 复盘输入 | 语音优先，文字备选 | ✅ |
| 语音识别 ASR | 腾讯云 ASR + DeepSeek 纠错 | ✅ |
| GDRR AI 结构化 | 提交文本 → DeepSeek 输出 GDRR + 标签 + 追问 | ✅ |
| 复盘详情页 | GDRR 卡片展示 + 教练追问 | ✅ |
| 首页仪表盘 | 今日状态 + 目标进度 + 最近复盘 | ✅ |
| 周期报告 | 周报/月报/季报，AI 生成 + 图表 | ✅ |
| 教练 Agent | Tool-use Agent，6 工具，记忆系统 | ✅ |
| 多轮教练对话 | 气泡式聊天 UI，OpenClaw 支持 | ✅ |
| 定时提醒 | 每日通知 | ✅ |
| 历史列表 | 搜索/筛选/标签 | ✅ |
| 品牌名 | 更名"吾日三省吾身"，自定义图标 | ✅ |
| GSAP 风格动效 | 入场动画、弹簧按反馈、展开收起、波型录音动画 | ✅ |
| OTA 热更新 | EAS Update，代码变更免 APK 重装 | ✅ |
| 后端部署 | Render + Neon | ✅ |
| APK 构建 | EAS Build 构建 Android APK | ✅ |

### Phase 2 — 待规划

- iOS 支持（TestFlight/App Store）
- 飞书文档 Tool 集成
- 成长信号追踪
- 数据导出/导入

---

## 8. 更新日志

| 版本 | 日期 | 变更 |
|------|------|------|
| V2.0 | 2026-05-24 | 初始 PRD，基于"复盘神器"品牌 |
| V2.1 | 2026-06-06 | 全面更新：品牌更名为"吾日三省吾身"；认证改为 Device ID 无感登录；API 增加 stats/parse/device-login；增加 OTA 热更新、GSAP 动效、历史搜索、自然语言目标输入；视觉系统颜色精调；标题取消旧的 SMS 认证和 ScopeSelector 组件 |
