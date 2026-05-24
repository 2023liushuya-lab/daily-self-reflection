# 复盘神器 V2 增强设计

> 版本：V1.0 | 日期：2026-05-24
>
> 覆盖：复盘输入 Typeless 改造 / 报告系统 / 教练 Agent 架构重写

---

## 1. 复盘输入 Typeless 改造

### 1.1 目标

将复盘输入页从"表单式"改为"Typeless 语音优先"体验——打开即录音，零摩擦输入。去掉 Scope 选择器，AI 只输出 GDRR 结构，保留用户原意。

### 1.2 UI 交互

单页面，三要素纵向排列：

1. **录音大按钮**（主交互）：圆形，按住说话松开结束。录音时有呼吸动画 + 计时器。松开后自动上传 ASR 识别，结果追加到文本 buffer。
2. **文本展示/编辑区**：显示 ASR 识别结果，可点击编辑修正。可追加多次录音内容。
3. **文本输入框**（备选）：底部常驻，"写点什么..."placeholder，作为纯打字入口。与录音内容汇入同一 buffer。

提交按钮在内容非空时激活，点击后 loading 动画（"AI 正在分析你的复盘..."），完成后跳转详情页。

### 1.3 ASR 流程

- 使用腾讯云「一句话识别」API（SentenceRecognition）
- 免费额度：5000 次/月，60 秒/次上限
- 录音时长超过 60 秒提示分段录制
- 流程：按住录音 → 松开 → base64 上传 → POST /api/reviews/upload-audio → 返回原始文本 → 前端展示可编辑
- 不再使用 mock，走真实 ASR

### 1.4 AI 结构化 Prompt

提交后调 DeepSeek，Prompt 要点：

- 只输出 GDRR（Goal/Result/Difference/Reason），不推断 scope_area
- **保留原意**：不概括、不压缩实质内容，只做结构化整理
- 清除口语填充词（嗯、那个、就是说、然后...然后）但不删减内容
- 输出 3-5 个中文标签 + 2-3 个教练追问
- 关联年度目标的发现
- 输出 JSON 格式

### 1.5 数据流

```
录音/打字 → 文本 buffer → 提交
→ POST /api/reviews { rawText }
→ DeepSeek 结构化 → 写入 Review 表
→ 返回 GDRR JSON → 跳转详情页
```

### 1.6 API 变更

- `POST /api/reviews` 的 `scopeArea` 字段改为可选，后端不再要求前端传
- 其余不变

---

## 2. 报告系统

### 2.1 目标

新增周报/月报/季报页面，AI 实时生成叙事报告 + 图表 + 年度目标进度。

### 2.2 UI 布局

新增「报告」导航页面，顶部 SegmentedControl 切换周/月/季，纵向滚动展示：

1. **周期选择器**：周/月/季，默认当前周期，可左右滑动切换
2. **统计数据卡片**：复盘次数、连续打卡天数、维度分布（饼图/条形图）
3. **AI 叙事总结**：教练口吻 2-3 段，回顾关键事件和变化
4. **成长信号**：技能观察 / 模式延续 / 关键突破
5. **年度目标进度**：每个目标的复盘关联次数 + 进度条 + 建议
6. **下周期建议**：AI 生成的 actionable 建议

### 2.3 后端 API

```
GET  /api/reports?type=weekly&date=2026-05-24
POST /api/reports/generate  { type, date }   → 触发生成/重新生成
GET  /api/reports/:id                          → 查看历史报告
```

### 2.4 生成逻辑

1. `type` + `date` 计算时间窗口
2. 查询该时段 Review（GDRR + tags + growthSignals）
3. 查询该时段 UserInsight 洞察
4. 查询年度目标当前进度
5. 统计复盘次数、连续打卡、维度分布
6. 组装 context → DeepSeek 生成 JSON 报告（含叙事总结、成长信号、建议）
7. 写入 Report 表缓存
8. 返回报告

### 2.5 缓存策略

- 周报缓存 1 天，月报 3 天，季报 7 天
- 用户可主动「重新生成」
- 同一周期有新复盘时自动失效

### 2.6 图表

- 维度分布：饼图（用 react-native-chart-kit 或 victory-native）
- 复盘频率：柱状图（每周每日复盘次数）
- 年度目标关联度：进度条 + 数字

### 2.7 年度目标进度总结

报告底部按目标维度汇总：
- 每个目标的复盘关联次数（本周/月/季关联到该目标的复盘数）
- 进度条（用户手动进度 + AI 建议进度）
- AI 根据复盘内容评估对齐度 + 建议

---

## 3. 教练 Agent 架构重写

### 3.1 目标

从简单 prompt→reply 管道升级为 Tool-use Agent + Memory Loop。教练可自主调用工具检索上下文，对话后异步提取洞察形成长期记忆。可选接入用户本地 OpenClaw 实例作为教练后端。

### 3.2 架构概览

```
POST /api/reviews/:id/coach-messages
  → CoachRouter（不变）
  → CoachService.resolveBackend(userId)
    → DeepSeekBackend（内置）
    → OpenClawBackend（用户配置后切换）
```

### 3.3 DeepSeek Backend：Tool-use Agent

**Agent 循环**：

```
User Message
  → 构建上下文（画像+目标+洞察+对话历史+当前GDRR）
  → DeepSeek function calling API
  → Agent 决定：
    ├─ respond()：直接回复（上下文足够时）
    └─ act()：调用工具获取更多数据 → 再决策 → respond()
  → 保存回复
  → (异步) 对话≥2轮 → 提取新洞察 → 写入 UserInsight
```

**Tool 清单（首批）**：

| Tool | 描述 | 参数 |
|------|------|------|
| `searchReviews` | 按关键词搜索历史复盘 | query, limit |
| `getGoalProgress` | 查询年度目标进度 | goalId? |
| `getUserInsights` | 查询已存洞察 | category?, limit |
| `getRecentPatterns` | 获取近期行为模式 | days |
| `getReviewStats` | 获取复盘统计 | days |

**扩展 Tool 入口**：

```typescript
// server/src/agents/tools/
interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: (params: any, userId: string) => Promise<string>;
}

// 未来飞书 Tool 示例
const readFeishuDocTool: Tool = {
  name: 'readFeishuDoc',
  description: '读取飞书文档内容用于复盘参考',
  parameters: { docUrl: { type: 'string' } },
  handler: async (params, userId) => { /* 飞书 API */ },
};
```

### 3.4 OpenClaw Backend

用户可在设置中配置 OpenClaw 实例：

- **端点**：OpenClaw webhook URL（如 `http://localhost:8787`）
- **API Key**：OpenClaw API key
- **测试连接**：发送 ping 验证连通性

OpenClaw 模式下：
- App 把对话上下文（GDRR + 历史消息）POST 到 OpenClaw
- OpenClaw 用自己的 SOUL.md + MEMORY.md + 本地工具做推理
- 返回回复，存入 CoachMessage 表
- OpenClaw 的长期记忆由 OpenClaw 自行管理

优先级：Phase 2。先保证 DeepSeek 后端完整可用。

### 3.5 记忆系统增强

保留现有四层记忆，增强：

- **语义检索**：用 DeepSeek embedding 做相似洞察匹配，不只取最近 10 条，而是语义最相关的 10 条
- **洞察提取放宽**：触发条件从 ≥3 轮降低到 ≥2 轮
- **冲突检测**：新洞察如与旧洞察矛盾（相似度 > 0.8 但结论相反），标记而非覆盖

### 3.6 文件结构

```
server/src/
├── agents/
│   ├── coach.ts              ← Agent 主逻辑（think → act → respond）
│   ├── tools/
│   │   ├── index.ts          ← Tool 注册表
│   │   ├── searchReviews.ts
│   │   ├── getGoalProgress.ts
│   │   ├── getUserInsights.ts
│   │   ├── getRecentPatterns.ts
│   │   └── getReviewStats.ts
│   ├── backends/
│   │   ├── deepseek.ts       ← DeepSeek function calling 实现
│   │   └── openclaw.ts       ← OpenClaw webhook 实现
│   └── memory.ts             ← 记忆管理 + embedding 检索
├── services/
│   ├── deepseek.ts           ← 保留（GDRR 结构化）
│   └── asr.ts                ← 保留
└── routes/
    ├── reviews.ts            ← 改造 scopeArea 可选
    ├── coach.ts              ← 切换到新 Agent
    └── reports.ts            ← 新增
```

### 3.7 API 接口（对外不变）

```
GET  /api/reviews/:id/coach-messages     ← 对话历史
POST /api/reviews/:id/coach-messages     ← 发消息，Agent 回复
```

---

## 4. 前端新增/改造文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `expo-app/src/screens/ReviewInputScreen.tsx` | 重写 | Typeless 改造 |
| `expo-app/src/components/VoiceRecorder.tsx` | 重写 | 按住说话交互 |
| `expo-app/src/components/ScopeSelector.tsx` | 删除 | 不再需要 |
| `expo-app/src/screens/ReportsScreen.tsx` | 新建 | 报告页 |
| `expo-app/src/components/ReportChart.tsx` | 新建 | 图表组件 |
| `expo-app/src/screens/CoachChatScreen.tsx` | 新建 | 教练对话页（Phase 2） |
| `expo-app/src/components/CoachBubble.tsx` | 新建 | 对话气泡 |
| `expo-app/src/screens/ProfileScreen.tsx` | 修改 | 加教练后端配置 |
| `expo-app/src/navigation/index.tsx` | 修改 | 加 Reports、CoachChat 路由 |
| `expo-app/src/api/client.ts` | 修改 | 加 reportsApi |

## 5. 数据库变更

无需 schema 变更。现有表已覆盖：

- `Review`：scopeArea 改为 nullable
- `Report` 表已存在，直接使用
- `CoachMessage` 表已存在
- `UserInsight` 表已存在

唯一可选变更：`Review.scopeArea` 改为 `nullable`。

## 6. 测试要点

- ASR 真实识别准确率（中文口语场景）
- DeepSeek GDRR 结构化质量（保留原意 vs 过度概括）
- 报告生成完整性（统计数字准确 + AI 叙事合理）
- Agent function calling 决策正确性（何时调工具、何时直接回复）
- 洞察提取质量（confidence 阈值 + 冲突检测）
- OpenClaw 连通性和错误处理

## 7. 优先级

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 复盘输入 Typeless | P0 | 核心体验，立即做 |
| GDRR Prompt 优化 | P0 | 保留原意 + 去口语词 |
| ASR 真实接入 | P0 | 替换 mock |
| 周报/月报/季报 | P0 | 用户明确需要 |
| Agent Tool-use | P0 | 教练核心能力 |
| Agent Memory 增强 | P0 | embedding 检索 + 冲突检测 |
| 教练对话 UI | P1 | 气泡式多轮对话 |
| OpenClaw 集成 | P1 | Phase 2 |
| 飞书 Tool | P2 | Phase 3 |
| 图表组件 | P1 | 报告可视化 |
