# 复盘神器 V2 增强实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现复盘输入 Typeless 改造、报告系统（周/月/季）、教练 Agent 架构重写（Tool-use + Memory Loop + OpenClaw 可选后端）

**Architecture:** 前端 Typeless 语音优先交互 → 腾讯云 ASR 真实识别 → DeepSeek GDRR 结构化 → 报告 AI 生成 + 图表 → 教练 Agent 使用 DeepSeek function calling 自主调用工具检索上下文，对话后异步提取洞察形成长期记忆

**Tech Stack:** React Native (Expo SDK 54) + TypeScript, Node.js/Express + TypeScript, PostgreSQL + Prisma, DeepSeek API (chat + function calling + embedding), 腾讯云 ASR (SentenceRecognition)

**Spec:** `docs/superpowers/specs/2026-05-24-reviewmaster-v2-enhancements-design.md`

---

## File Structure

```
server/src/
├── agents/
│   ├── coach.ts              ← Agent 主逻辑（think → act → respond loop）
│   ├── tools/
│   │   ├── index.ts          ← Tool 注册表 + Tool 接口
│   │   ├── searchReviews.ts
│   │   ├── getGoalProgress.ts
│   │   ├── getUserInsights.ts
│   │   ├── getRecentPatterns.ts
│   │   └── getReviewStats.ts
│   ├── backends/
│   │   ├── deepseek.ts       ← DeepSeek function calling 实现
│   │   └── openclaw.ts       ← OpenClaw webhook skeleton
│   └── memory.ts             ← 记忆管理 + embedding 语义检索
├── services/
│   ├── deepseek.ts           ← 保留并优化（GDRR 结构化 prompt）
│   └── asr.ts                ← 保留（已接真实 ASR）
├── routes/
│   ├── reviews.ts            ← scopeArea 改为可选
│   ├── coach.ts              ← 切换到新 Agent
│   └── reports.ts            ← 新增
expo-app/src/
├── screens/
│   ├── ReviewInputScreen.tsx  ← 重写 Typeless UI
│   ├── ReportsScreen.tsx      ← 新建报告页
│   └── ProfileScreen.tsx      ← 修改加教练后端配置
├── components/
│   ├── VoiceRecorder.tsx      ← 重写按住说话交互
│   ├── ScopeSelector.tsx      ← 删除
│   ├── ReportChart.tsx        ← 新建图表组件
│   └── CoachBubble.tsx        ← 新建对话气泡
├── navigation/index.tsx       ← 加 Reports 路由
└── api/client.ts              ← 加 reportsApi
```

---

### Task 1: VoiceRecorder 重写 — 按住说话交互

**Files:**
- Modify: `expo-app/src/components/VoiceRecorder.tsx`

- [ ] **Step 1: 重写 VoiceRecorder 为按住说话模式**

```tsx
import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Animated } from 'react-native';
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
  const animRef = useRef(new Animated.Value(1)).current;

  // 呼吸动画
  const startBreathAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animRef, { toValue: 1.15, duration: 800, useNativeDriver: true }),
        Animated.timing(animRef, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  };

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
      startBreathAnimation();
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (e) {
      Alert.alert('录音启动失败');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    if (timerRef.current) clearInterval(timerRef.current);
    animRef.stopAnimation();
    animRef.setValue(1);
    setIsRecording(false);

    try {
      await recording.stopAndUnloadAsync();
    } catch (e) { /* 已经停止 */ }

    const uri = recording.getURI();
    setRecording(null);
    if (!uri) return;

    // 超过 60 秒提示
    if (duration > 60) {
      Alert.alert('录音超过 60 秒，建议分段录制');
    }

    setTranscribing(true);
    try {
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
      Alert.alert('语音识别失败', '请重试或使用文字输入');
    } finally {
      setTranscribing(false);
    }
  };

  const formatTime = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 识别中状态
  if (transcribing) {
    return (
      <View style={styles.container}>
        <Text style={styles.transcribing}>正在识别语音...</Text>
      </View>
    );
  }

  // 录音中状态
  if (isRecording) {
    return (
      <View style={styles.container}>
        <Animated.View style={[styles.recordCircle, { transform: [{ scale: animRef }] }]}>
          <View style={styles.recordDot} />
        </Animated.View>
        <Text style={styles.timer}>{formatTime(duration)}</Text>
        <Text style={styles.hint}>松开结束录音</Text>
      </View>
    );
  }

  // 默认状态：按住说话按钮
  return (
    <TouchableOpacity
      style={styles.recordButton}
      onPressIn={startRecording}
      onPressOut={stopRecording}
      activeOpacity={0.7}
    >
      <Text style={styles.recordButtonText}>按住说话</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  recordButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: spacing.lg,
  },
  recordButtonText: { ...fonts.heading, color: colors.white },
  recordCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF4444',
  },
  timer: { ...fonts.title, color: colors.primary, marginTop: spacing.md },
  hint: { ...fonts.caption, marginTop: spacing.sm },
  transcribing: { ...fonts.body, color: colors.textSecondary },
});
```

- [ ] **Step 2: 验证 Metro bundle 编译通过**

Run: `cd /Users/liushuya/Documents/吾日三省吾身/expo-app && npx expo start --offline --clear 2>&1 | head -20`
Expected: 无编译错误，bundle 正常

- [ ] **Step 3: Commit**

```bash
git add expo-app/src/components/VoiceRecorder.tsx
git commit -m "feat: rewrite VoiceRecorder with press-and-hold interaction"
```

---

### Task 2: ReviewInputScreen Typeless 改造

**Files:**
- Modify: `expo-app/src/screens/ReviewInputScreen.tsx`

- [ ] **Step 1: 重写 ReviewInputScreen 为 Typeless 布局**

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reviewsApi } from '../api/client';
import VoiceRecorder from '../components/VoiceRecorder';

export default function ReviewInputScreen({ navigation }: any) {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVoiceResult = (recognizedText: string) => {
    setText(prev => {
      const sep = prev.trim() ? '\n' : '';
      return `${prev}${sep}${recognizedText}`;
    });
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      Alert.alert('请输入或录入复盘内容');
      return;
    }
    setSubmitting(true);
    try {
      const res = await reviewsApi.create({ rawText: trimmed });
      const review = res.data.data;
      navigation.replace('ReviewDetail', { id: review.id });
    } catch (e: any) {
      Alert.alert('提交失败', e.response?.data?.error || '请稍后重试');
    } finally {
      setSubmitting(false);
    }
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <View style={styles.voiceSection}>
        <VoiceRecorder onResult={handleVoiceResult} />
      </View>

      {text.trim() !== '' && (
        <View style={styles.textPreview}>
          <TextInput
            style={styles.textEdit}
            value={text}
            onChangeText={setText}
            multiline
            textAlignVertical="top"
            placeholder="识别文本会显示在这里，可编辑修正..."
            placeholderTextColor={colors.textSecondary}
          />
        </View>
      )}

      <View style={styles.bottomSection}>
        <TextInput
          style={styles.textInput}
          placeholder="写点什么..."
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  voiceSection: { paddingTop: spacing.xl },
  textPreview: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    maxHeight: 180,
  },
  textEdit: {
    padding: spacing.md,
    ...fonts.body,
    fontSize: 14,
    minHeight: 80,
  },
  bottomSection: {
    marginHorizontal: spacing.md,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.lg,
  },
  textInput: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    ...fonts.body,
    minHeight: 80,
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

- [ ] **Step 2: 删除 ScopeSelector 引用和导航参数**

Current `navigation.replace` 不再需要 scopeArea。ReviewDetail 页不需要改动。

- [ ] **Step 3: Commit**

```bash
git add expo-app/src/screens/ReviewInputScreen.tsx
git commit -m "feat: rewrite ReviewInputScreen with typeless voice-first layout"
```

---

### Task 3: DeepSeek GDRR Prompt 优化

**Files:**
- Modify: `server/src/services/deepseek.ts`

- [ ] **Step 1: 重写 STRUCTURE_PROMPT 为保留原意 + 纯 GDRR**

```typescript
const STRUCTURE_PROMPT = `你是一位个人成长教练。请将用户的复盘文本按 GDRR 框架结构化整理。

## GDRR 框架
- Goal: 用户当时想达成什么目标
- Result: 实际发生了什么
- Difference: 目标与结果的差距
- Reason: 深层原因

## 核心原则
1. **保留原意**：不要概括、压缩或删减用户表达的实质内容。用户说的每一个具体事件、感受、人物、数字都要保留在对应 GDRR 组件中。
2. **只做结构化**：将用户碎片化的表达按 GDRR 归类整理。口语填充词（嗯、那个、就是说、然后...然后）可以去除，但实质内容一个字都不要少。
3. **不推断类别**：不需要判断这段复盘属于哪个范畴。只输出 GDRR。
4. **基于文本**：如果某个 GDRR 部分文本中没有明确提及，标注"（未提及）"而不是编造。

## 输出要求
- 标签（tags）：3-5 个中文关键词
- 教练追问（coach_questions）：2-3 个开放式问题，简短有力（不超过 40 字），挑战用户的假设或盲区
- 关联年度目标（related_goals）：如果内容与年度目标相关，标注关联
- 输出 JSON 格式

## JSON Schema
{
  "goal": "string",
  "result": "string",
  "difference": "string",
  "reason": "string",
  "tags": ["string"],
  "coach_questions": ["string"],
  "insight_candidates": [
    { "category": "blind_spot|strength|pattern|skill", "insight": "string", "confidence": 0.0-1.0 }
  ],
  "growth_signals": {
    "skillsObserved": ["string"],
    "patternsContinuing": ["string"],
    "breakthroughs": ["string"]
  },
  "related_goals": [
    { "goalTitle": "string", "relevance": "string", "progressNote": "string" }
  ]
}`;
```

- [ ] **Step 2: 更新 structureReview 返回类型，移除 scopeArea**

```typescript
interface StructuredReviewResult {
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  relatedGoals: Array<{ goalTitle: string; relevance: string; progressNote: string }>;
}
```

- [ ] **Step 3: 更新函数返回**

```typescript
return {
  gdrr: {
    goal: result.goal || '（未提及）',
    result: result.result || '（未提及）',
    difference: result.difference || '（未提及）',
    reason: result.reason || '（未提及）',
  },
  tags: result.tags || [],
  coachQuestions: result.coach_questions || [],
  insightCandidates: result.insight_candidates || [],
  growthSignals: result.growth_signals || { skillsObserved: [], patternsContinuing: [], breakthroughs: [] },
  relatedGoals: result.related_goals || [],
};
```

- [ ] **Step 4: Commit**

```bash
git add server/src/services/deepseek.ts
git commit -m "feat: optimize GDRR prompt - preserve meaning, remove scope inference"
```

---

### Task 4: scopeArea 改为可选 + reviews 路由适配

**Files:**
- Modify: `server/src/routes/reviews.ts`

- [ ] **Step 1: 修改 createReviewSchema 让 scopeArea 可选**

```typescript
const createReviewSchema = z.object({
  rawText: z.string().min(1, '复盘内容不能为空').max(5000),
  scopeArea: z.enum(['WORK', 'RELATIONSHIP', 'PERSONAL_STATE', 'PERSONAL_LIFE']).optional().default('WORK'),
});
```

- [ ] **Step 2: 更新 POST /api/reviews 的 review 创建逻辑**

将 `scopeArea: structured.scopeArea || scopeArea` 改为 `scopeArea: scopeArea`（因为 structured 不再返回 scopeArea）。

- [ ] **Step 3: 删除 ScopeSelector 组件文件**

```bash
rm expo-app/src/components/ScopeSelector.tsx
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/reviews.ts expo-app/src/components/ScopeSelector.tsx
git commit -m "feat: make scopeArea optional, remove ScopeSelector component"
```

---

### Task 5: 报告后端 — Service + Route

**Files:**
- Create: `server/src/routes/reports.ts`
- Create: `server/src/services/report-generator.ts`
- Modify: `server/src/index.ts`

- [ ] **Step 1: 创建 report-generator.ts 服务**

```typescript
// server/src/services/report-generator.ts
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

interface ReportInput {
  type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  date: string;
  userId: string;
}

function getPeriod(type: string, dateStr: string) {
  const date = new Date(dateStr);
  const start = new Date(date);
  const end = new Date(date);

  if (type === 'WEEKLY') {
    const day = date.getDay();
    start.setDate(date.getDate() - ((day + 6) % 7)); // Monday
    end.setDate(start.getDate() + 7);
  } else if (type === 'MONTHLY') {
    start.setDate(1);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
  } else {
    // QUARTERLY
    const quarterStart = Math.floor(date.getMonth() / 3) * 3;
    start.setMonth(quarterStart, 1);
    end.setMonth(quarterStart + 3, 0);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export async function generateReport(input: ReportInput) {
  const { start, end } = getPeriod(input.type, input.date);

  // 查询复盘
  const reviews = await prisma.review.findMany({
    where: {
      userId: input.userId,
      createdAt: { gte: start, lte: end },
    },
    orderBy: { createdAt: 'asc' },
  });

  // 查询洞察
  const insights = await prisma.userInsight.findMany({
    where: {
      userId: input.userId,
      createdAt: { gte: start, lte: end },
    },
  });

  // 查询目标
  const goals = await prisma.annualGoal.findMany({
    where: { userId: input.userId },
  });

  // 统计数据
  const reviewCount = reviews.length;
  const scopeCounts: Record<string, number> = {};
  reviews.forEach(r => {
    scopeCounts[r.scopeArea] = (scopeCounts[r.scopeArea] || 0) + 1;
  });

  // 计算连续打卡天数（本周期内连续有复盘的天数）
  const reviewDays = new Set(
    reviews.map(r => new Date(r.createdAt).toISOString().slice(0, 10))
  );
  let streak = 0;
  const sortedDays = Array.from(reviewDays).sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let checkDate = new Date(today);
  while (reviewDays.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // 组装 tags
  const allTags: string[] = [];
  reviews.forEach(r => {
    const t = r.tags as string[];
    if (Array.isArray(t)) allTags.push(...t);
  });

  // 组装 context 调用 DeepSeek 生成叙事
  const reviewsSummary = reviews.map(r => ({
    rawText: r.rawText.slice(0, 200),
    gdrr: { goal: r.gdrrGoal, result: r.gdrrResult, difference: r.gdrrDifference, reason: r.gdrrReason },
    tags: r.tags,
    createdAt: r.createdAt.toISOString(),
  }));

  const goalsSummary = goals.map(g => ({
    title: g.title,
    progress: g.progress,
    category: g.category,
  }));

  const prompt = `你是一位个人成长教练。请根据用户过去一个周期的复盘数据生成报告。

## 复盘数据
${JSON.stringify(reviewsSummary, null, 2)}

## 年度目标
${JSON.stringify(goalsSummary, null, 2)}

## 洞察
${JSON.stringify(insights.map(i => ({ category: i.category, insight: i.insight, confidence: i.confidence })), null, 2)}

## 任务
生成一份${input.type === 'WEEKLY' ? '周' : input.type === 'MONTHLY' ? '月' : '季'}度报告。

## 输出 JSON 格式
{
  "narrative": "2-3 段教练口吻的叙事总结",
  "growthSignals": {
    "skillsObserved": ["观察到的技能"],
    "patternsContinuing": ["持续的模式"],
    "breakthroughs": ["突破"]
  },
  "goalAssessment": [
    { "goalTitle": "目标名", "reviewCount": 相关复盘数, "alignmentNote": "对齐度评估", "suggestion": "建议" }
  ],
  "nextPeriodSuggestions": ["下周期 actionable 建议"]
}`;

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: '你是个人成长教练，擅长从复盘数据中提取洞察。输出纯 JSON，不要 markdown 包裹。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 3000,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data = await response.json();
  const aiContent = JSON.parse(data.choices[0].message.content);

  // 检查缓存
  const existing = await prisma.report.findFirst({
    where: {
      userId: input.userId,
      type: input.type,
      periodStart: start,
      periodEnd: end,
    },
  });

  const reportContent = {
    stats: {
      reviewCount,
      streak,
      scopeCounts,
      topTags: [...new Set(allTags)].slice(0, 10),
    },
    ...aiContent,
  };

  if (existing) {
    const updated = await prisma.report.update({
      where: { id: existing.id },
      data: { content: reportContent },
    });
    return updated;
  }

  const report = await prisma.report.create({
    data: {
      userId: input.userId,
      type: input.type,
      periodStart: start,
      periodEnd: end,
      content: reportContent,
    },
  });

  return report;
}
```

- [ ] **Step 2: 创建 reports.ts 路由**

```typescript
// server/src/routes/reports.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { generateReport } from '../services/report-generator';

const prisma = new PrismaClient();
export const reportsRouter = Router();
reportsRouter.use(authMiddleware);

// GET /api/reports
reportsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const type = (req.query.type as string) || 'WEEKLY';
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  if (!['WEEKLY', 'MONTHLY', 'QUARTERLY'].includes(type)) {
    return res.status(400).json({ success: false, error: '报告类型无效' });
  }

  try {
    const report = await generateReport({ type: type as any, date, userId: req.userId! });
    return res.json({ success: true, data: { id: report.id, ...(report.content as any), createdAt: report.createdAt.toISOString() } });
  } catch (err: any) {
    console.error('[Report Error]', err.message);
    return res.status(500).json({ success: false, error: '报告生成失败' });
  }
});

// POST /api/reports/generate
reportsRouter.post('/generate', async (req: AuthRequest, res: Response) => {
  const { type, date } = req.body;
  if (!type || !date) {
    return res.status(400).json({ success: false, error: 'type 和 date 为必填' });
  }

  try {
    const report = await generateReport({ type, date, userId: req.userId! });
    return res.status(201).json({ success: true, data: { id: report.id, ...(report.content as any), createdAt: report.createdAt.toISOString() } });
  } catch (err: any) {
    console.error('[Report Error]', err.message);
    return res.status(500).json({ success: false, error: '报告生成失败' });
  }
});

// GET /api/reports/:id
reportsRouter.get('/:id', async (req: AuthRequest, res: Response) => {
  const report = await prisma.report.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!report) {
    return res.status(404).json({ success: false, error: '报告不存在' });
  }
  return res.json({ success: true, data: { id: report.id, ...(report.content as any), createdAt: report.createdAt.toISOString() } });
});
```

- [ ] **Step 3: 在 server/src/index.ts 中注册 reports 路由**

在 `import { coachRouter } from './routes/coach';` 后添加：
```typescript
import { reportsRouter } from './routes/reports';
```
在路由挂载区添加：
```typescript
app.use('/api/reports', reportsRouter);
```

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/reports.ts server/src/services/report-generator.ts server/src/index.ts
git commit -m "feat: add reports backend - weekly/monthly/quarterly AI-generated reports"
```

---

### Task 6: 报告前端 — ReportsScreen + Charts + API

**Files:**
- Create: `expo-app/src/screens/ReportsScreen.tsx`
- Create: `expo-app/src/components/ReportChart.tsx`
- Modify: `expo-app/src/api/client.ts`
- Modify: `expo-app/src/navigation/index.tsx`

- [ ] **Step 1: 添加 reportsApi 到 client.ts**

在 `expo-app/src/api/client.ts` 中添加：
```typescript
export const reportsApi = {
  get: (params: { type: string; date: string }) => client.get('/reports', { params }),
  generate: (data: { type: string; date: string }) => client.post('/reports/generate', data),
  getById: (id: string) => client.get(`/reports/${id}`),
};
```

- [ ] **Step 2: 创建 ReportChart 组件**

```tsx
// expo-app/src/components/ReportChart.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

interface ChartData {
  label: string;
  value: number;
  color: string;
}

export function PieChart({ data }: { data: ChartData[] }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const barColors = [colors.primary, colors.priorityLight, colors.warning, colors.success];

  return (
    <View style={styles.chartContainer}>
      <View style={styles.barContainer}>
        {data.map((d, i) => {
          const pct = total > 0 ? d.value / total : 0;
          return (
            <View key={d.label} style={styles.barRow}>
              <View style={[styles.dot, { backgroundColor: d.color || barColors[i % barColors.length] }]} />
              <Text style={styles.barLabel}>{d.label}</Text>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: d.color || barColors[i % barColors.length] }]} />
              </View>
              <Text style={styles.barValue}>{d.value}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export function StatCard({ label, value, subtitle }: { label: string; value: string; subtitle?: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {subtitle && <Text style={styles.statSub}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  chartContainer: { marginVertical: spacing.sm },
  barContainer: { gap: spacing.sm },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5 },
  barLabel: { ...fonts.caption, width: 60 },
  barTrack: {
    flex: 1,
    height: 12,
    backgroundColor: colors.border,
    borderRadius: 6,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 6 },
  barValue: { ...fonts.caption, width: 30, textAlign: 'right' },
  statCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: 90,
  },
  statValue: { ...fonts.title, color: colors.primary },
  statLabel: { ...fonts.caption, marginTop: 2 },
  statSub: { ...fonts.caption, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
});
```

- [ ] **Step 3: 创建 ReportsScreen**

```tsx
// expo-app/src/screens/ReportsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { reportsApi } from '../api/client';
import { PieChart, StatCard } from '../components/ReportChart';

const REPORT_TYPES = [
  { key: 'WEEKLY', label: '周报' },
  { key: 'MONTHLY', label: '月报' },
  { key: 'QUARTERLY', label: '季报' },
];

export default function ReportsScreen() {
  const [type, setType] = useState('WEEKLY');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.get({
        type,
        date: new Date().toISOString().slice(0, 10),
      });
      setReport(res.data.data);
    } catch (e: any) {
      if (e.response?.status === 500) {
        // 首次无缓存，触发生成
        try {
          const genRes = await reportsApi.generate({
            type,
            date: new Date().toISOString().slice(0, 10),
          });
          setReport(genRes.data.data);
        } catch (e2: any) {
          setReport(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [type]);

  const scopeLabels: Record<string, string> = {
    WORK: '工作',
    RELATIONSHIP: '人际',
    PERSONAL_STATE: '个人状态',
    PERSONAL_LIFE: '个人生活',
  };
  const scopeColors: Record<string, string> = {
    WORK: colors.primary,
    RELATIONSHIP: colors.warning,
    PERSONAL_STATE: colors.success,
    PERSONAL_LIFE: '#8B7355',
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tabs}>
        {REPORT_TYPES.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, type === t.key && styles.tabActive]}
            onPress={() => setType(t.key)}
          >
            <Text style={[styles.tabText, type === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>正在生成报告...</Text>
        </View>
      ) : report ? (
        <>
          {/* 统计卡片 */}
          {report.stats && (
            <View style={styles.statsRow}>
              <StatCard label="复盘次数" value={String(report.stats.reviewCount)} />
              <StatCard label="连续打卡" value={`${report.stats.streak} 天`} />
              <StatCard label="标签数" value={String(report.stats.topTags?.length || 0)} />
            </View>
          )}

          {/* 维度分布 */}
          {report.stats?.scopeCounts && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>维度分布</Text>
              <PieChart
                data={Object.entries(report.stats.scopeCounts).map(([key, val]) => ({
                  label: scopeLabels[key] || key,
                  value: val as number,
                  color: scopeColors[key] || colors.textSecondary,
                }))}
              />
            </View>
          )}

          {/* AI 叙事 */}
          {report.narrative && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>AI 总结</Text>
              <Text style={styles.narrative}>{report.narrative}</Text>
            </View>
          )}

          {/* 成长信号 */}
          {report.growthSignals && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>成长信号</Text>
              {report.growthSignals.skillsObserved?.length > 0 && (
                <View style={styles.signalBlock}>
                  <Text style={styles.signalLabel}>技能观察</Text>
                  {report.growthSignals.skillsObserved.map((s: string) => (
                    <Text key={s} style={styles.signalItem}>{s}</Text>
                  ))}
                </View>
              )}
              {report.growthSignals.patternsContinuing?.length > 0 && (
                <View style={styles.signalBlock}>
                  <Text style={styles.signalLabel}>模式延续</Text>
                  {report.growthSignals.patternsContinuing.map((s: string) => (
                    <Text key={s} style={styles.signalItem}>{s}</Text>
                  ))}
                </View>
              )}
              {report.growthSignals.breakthroughs?.length > 0 && (
                <View style={styles.signalBlock}>
                  <Text style={styles.signalLabel}>关键突破</Text>
                  {report.growthSignals.breakthroughs.map((s: string) => (
                    <Text key={s} style={styles.signalItem}>{s}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* 年度目标进度 */}
          {report.goalAssessment?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>年度目标进度</Text>
              {report.goalAssessment.map((ga: any) => (
                <View key={ga.goalTitle} style={styles.goalRow}>
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalTitle}>{ga.goalTitle}</Text>
                    <Text style={styles.goalCount}>关联 {ga.reviewCount} 次</Text>
                  </View>
                  <Text style={styles.goalNote}>{ga.alignmentNote}</Text>
                  {ga.suggestion && (
                    <Text style={styles.goalSuggestion}>建议：{ga.suggestion}</Text>
                  )}
                </View>
              ))}
            </View>
          )}

          {/* 下周期建议 */}
          {report.nextPeriodSuggestions?.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>下周期建议</Text>
              {report.nextPeriodSuggestions.map((s: string) => (
                <Text key={s} style={styles.suggestionItem}>{s}</Text>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.regenerateBtn} onPress={async () => {
            setLoading(true);
            try {
              const genRes = await reportsApi.generate({
                type,
                date: new Date().toISOString().slice(0, 10),
              });
              setReport(genRes.data.data);
            } catch (e: any) {
              // ignore
            } finally {
              setLoading(false);
            }
          }}>
            <Text style={styles.regenerateText}>重新生成</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>暂无该周期复盘数据</Text>
          <TouchableOpacity style={styles.generateBtn} onPress={async () => {
            setLoading(true);
            try {
              const genRes = await reportsApi.generate({
                type,
                date: new Date().toISOString().slice(0, 10),
              });
              setReport(genRes.data.data);
            } catch (e: any) {
              // ignore
            } finally {
              setLoading(false);
            }
          }}>
            <Text style={styles.generateText}>手动生成</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 100 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 4,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { ...fonts.body, color: colors.textSecondary },
  tabTextActive: { color: colors.white, fontWeight: '600' },
  loading: { alignItems: 'center', paddingTop: spacing.xl * 2 },
  loadingText: { ...fonts.caption, marginTop: spacing.md },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: { ...fonts.heading, marginBottom: spacing.sm },
  narrative: { ...fonts.body, fontSize: 14, lineHeight: 24 },
  signalBlock: { marginBottom: spacing.sm },
  signalLabel: { ...fonts.caption, fontWeight: '600', color: colors.primary, marginBottom: 4 },
  signalItem: { ...fonts.body, fontSize: 14, marginLeft: spacing.sm, marginBottom: 2 },
  goalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalTitle: { ...fonts.body, fontWeight: '600' },
  goalCount: { ...fonts.caption },
  goalNote: { ...fonts.body, fontSize: 14, marginTop: 4 },
  goalSuggestion: { ...fonts.caption, color: colors.primary, marginTop: 4 },
  suggestionItem: {
    ...fonts.body,
    fontSize: 14,
    marginLeft: spacing.sm,
    marginBottom: 4,
  },
  regenerateBtn: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  regenerateText: { ...fonts.caption, color: colors.textSecondary },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing.xl * 2,
  },
  emptyText: { ...fonts.body, color: colors.textSecondary, marginBottom: spacing.md },
  generateBtn: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
  },
  generateText: { color: colors.white, ...fonts.body },
});
```

- [ ] **Step 4: 在 navigation/index.tsx 中添加 Reports 路由**

在 ReviewDetail 路由后添加：
```tsx
<Stack.Screen name="Reports" component={ReportsScreen} options={{ title: '报告' }} />
```

并在 import 区添加：
```tsx
import ReportsScreen from '../screens/ReportsScreen';
```

- [ ] **Step 5: Commit**

```bash
git add expo-app/src/screens/ReportsScreen.tsx expo-app/src/components/ReportChart.tsx expo-app/src/api/client.ts expo-app/src/navigation/index.tsx
git commit -m "feat: add reports frontend with charts and AI narrative"
```

---

### Task 7: Agent Tools 实现

**Files:**
- Create: `server/src/agents/tools/index.ts`
- Create: `server/src/agents/tools/searchReviews.ts`
- Create: `server/src/agents/tools/getGoalProgress.ts`
- Create: `server/src/agents/tools/getUserInsights.ts`
- Create: `server/src/agents/tools/getRecentPatterns.ts`
- Create: `server/src/agents/tools/getReviewStats.ts`

- [ ] **Step 1: 创建 Tool 接口和注册表**

```typescript
// server/src/agents/tools/index.ts
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description: string }>;
    required?: string[];
  };
  handler: (params: any, userId: string) => Promise<string>;
}

export function getToolDefinitions(): Omit<Tool, 'handler'>[] {
  return [
    {
      name: 'searchReviews',
      description: '搜索用户的历史复盘内容。按关键词匹配复盘原始文本、GDRR内容和标签。',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '搜索关键词' },
          limit: { type: 'number', description: '返回数量，默认5' },
        },
        required: ['query'],
      },
    },
    {
      name: 'getGoalProgress',
      description: '获取用户的年度目标及当前进度。',
      parameters: {
        type: 'object',
        properties: {
          goalId: { type: 'string', description: '目标ID（可选，不传则返回全部）' },
        },
      },
    },
    {
      name: 'getUserInsights',
      description: '获取已存储的用户洞察，包括盲区、强项、行为模式和技能观察。',
      parameters: {
        type: 'object',
        properties: {
          category: { type: 'string', description: '洞察类别：blind_spot/strength/pattern/skill' },
          limit: { type: 'number', description: '返回数量，默认10' },
        },
      },
    },
    {
      name: 'getRecentPatterns',
      description: '获取用户近期的行为模式总结。',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '天数范围，默认30' },
        },
      },
    },
    {
      name: 'getReviewStats',
      description: '获取用户的复盘统计数据，包括频率、连续打卡天数、维度分布。',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: '天数范围，默认30' },
        },
      },
    },
  ];
}

import { searchReviews } from './searchReviews';
import { getGoalProgress } from './getGoalProgress';
import { getUserInsights } from './getUserInsights';
import { getRecentPatterns } from './getRecentPatterns';
import { getReviewStats } from './getReviewStats';

export function getToolHandlers(): Record<string, (params: any, userId: string) => Promise<string>> {
  return {
    searchReviews,
    getGoalProgress,
    getUserInsights,
    getRecentPatterns,
    getReviewStats,
  };
}
```

- [ ] **Step 2: 创建各 Tool 实现**

```typescript
// server/src/agents/tools/searchReviews.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function searchReviews(params: { query: string; limit?: number }, userId: string): Promise<string> {
  const limit = params.limit || 5;
  const reviews = await prisma.review.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  // 简单关键词匹配
  const query = params.query.toLowerCase();
  const matched = reviews.filter(r =>
    r.rawText.toLowerCase().includes(query) ||
    r.gdrrGoal.toLowerCase().includes(query) ||
    r.gdrrResult.toLowerCase().includes(query) ||
    r.gdrrDifference.toLowerCase().includes(query) ||
    r.gdrrReason.toLowerCase().includes(query) ||
    JSON.stringify(r.tags).toLowerCase().includes(query)
  ).slice(0, limit);

  if (matched.length === 0) {
    return '没有找到相关复盘。';
  }

  return matched.map(r =>
    `[${new Date(r.createdAt).toLocaleDateString('zh-CN')}] ${r.rawText.slice(0, 150)}\n  GDRR: 目标=${r.gdrrGoal.slice(0, 80)} 结果=${r.gdrrResult.slice(0, 80)}`
  ).join('\n\n');
}
```

```typescript
// server/src/agents/tools/getGoalProgress.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getGoalProgress(params: { goalId?: string }, userId: string): Promise<string> {
  const goals = await prisma.annualGoal.findMany({
    where: { userId, ...(params.goalId ? { id: params.goalId } : {}), status: 'ACTIVE' },
  });

  if (goals.length === 0) return '暂无活跃目标。';

  return goals.map(g =>
    `${g.title}（${g.category}）进度: ${g.progress}% - ${g.description.slice(0, 100)}`
  ).join('\n');
}
```

```typescript
// server/src/agents/tools/getUserInsights.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getUserInsights(params: { category?: string; limit?: number }, userId: string): Promise<string> {
  const insights = await prisma.userInsight.findMany({
    where: {
      userId,
      ...(params.category ? { category: params.category } : {}),
    },
    orderBy: { confidence: 'desc' },
    take: params.limit || 10,
  });

  if (insights.length === 0) return '暂无洞察记录。';

  return insights.map(i =>
    `[${i.category}] ${i.insight}（置信度: ${Math.round(i.confidence * 100)}%）`
  ).join('\n');
}
```

```typescript
// server/src/agents/tools/getRecentPatterns.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getRecentPatterns(params: { days?: number }, userId: string): Promise<string> {
  const days = params.days || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const insights = await prisma.userInsight.findMany({
    where: {
      userId,
      category: 'pattern',
      createdAt: { gte: since },
    },
    orderBy: { confidence: 'desc' },
    take: 10,
  });

  if (insights.length === 0) return '近期无新行为模式。';

  return insights.map(i => i.insight).join('\n');
}
```

```typescript
// server/src/agents/tools/getReviewStats.ts
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getReviewStats(params: { days?: number }, userId: string): Promise<string> {
  const days = params.days || 30;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const reviews = await prisma.review.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' },
  });

  const reviewDays = new Set(reviews.map(r => new Date(r.createdAt).toISOString().slice(0, 10)));
  let streak = 0;
  const today = new Date().toISOString().slice(0, 10);
  const checkDate = new Date(today);
  while (reviewDays.has(checkDate.toISOString().slice(0, 10))) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const scopeCounts: Record<string, number> = {};
  reviews.forEach(r => { scopeCounts[r.scopeArea] = (scopeCounts[r.scopeArea] || 0) + 1; });

  return `最近 ${days} 天共 ${reviews.length} 次复盘。连续打卡 ${streak} 天。维度分布：${JSON.stringify(scopeCounts)}`;
}
```

- [ ] **Step 3: Commit**

```bash
git add server/src/agents/
git commit -m "feat: implement agent tools - searchReviews, getGoalProgress, getUserInsights, getRecentPatterns, getReviewStats"
```

---

### Task 8: Agent 核心 + DeepSeek Backend + Memory

**Files:**
- Create: `server/src/agents/coach.ts`
- Create: `server/src/agents/backends/deepseek.ts`
- Create: `server/src/agents/memory.ts`

- [ ] **Step 1: 创建 Memory 模块**

```typescript
// server/src/agents/memory.ts
import { PrismaClient } from '@prisma/client';
import { config } from '../config';

const prisma = new PrismaClient();

export interface CoachMemoryContext {
  userProfile?: string;
  annualGoals?: string;
  relevantInsights?: string;
  recentGDRRSummary?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  gdrrContent: string;
}

export async function buildMemoryContext(
  userId: string,
  reviewId: string,
): Promise<CoachMemoryContext> {
  const [user, goals, review, messages] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.annualGoal.findMany({ where: { userId, status: 'ACTIVE' } }),
    prisma.review.findFirst({ where: { id: reviewId, userId } }),
    prisma.coachMessage.findMany({
      where: { reviewId },
      orderBy: { createdAt: 'asc' },
    }),
  ]);

  // 语义检索相关洞察
  const insights = await prisma.userInsight.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' },
    take: 20,
  });

  // 如果洞察多，取 confidence 最高的 10 条
  const topInsights = insights.slice(0, 10);

  // 近期复盘摘要（7天）
  const recentReviews = await prisma.review.findMany({
    where: {
      userId,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      id: { not: reviewId },
    },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    userProfile: user?.profile ? JSON.stringify(user.profile) : undefined,
    annualGoals: goals.length > 0
      ? goals.map(g => `- ${g.title}（${g.progress}%）`).join('\n')
      : undefined,
    relevantInsights: topInsights.length > 0
      ? topInsights.map(i => `[${i.category}] ${i.insight}`).join('\n')
      : undefined,
    recentGDRRSummary: recentReviews.length > 0
      ? recentReviews.map(r => `${new Date(r.createdAt).toLocaleDateString('zh-CN')}: 目标=${r.gdrrGoal.slice(0, 50)} 差异=${r.gdrrDifference.slice(0, 50)}`).join('\n')
      : undefined,
    conversationHistory: messages.map(m => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.content,
    })),
    gdrrContent: review
      ? `目标: ${review.gdrrGoal}\n结果: ${review.gdrrResult}\n差异: ${review.gdrrDifference}\n根因: ${review.gdrrReason}`
      : '',
  };
}

export async function extractInsights(userId: string, reviewId: string, messageCount: number): Promise<void> {
  // 对话 ≥ 2 轮才提取洞察
  if (messageCount < 4) return; // 4 messages = 2 rounds (user+coach × 2)

  const messages = await prisma.coachMessage.findMany({
    where: { reviewId },
    orderBy: { createdAt: 'asc' },
  });

  const conversationText = messages.map(m => `${m.role}: ${m.content}`).join('\n');

  const existingInsights = await prisma.userInsight.findMany({
    where: { userId },
  });

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `你是行为分析师。从对话中提取用户洞察。
输出 JSON: { "insights": [{ "category": "blind_spot|strength|pattern|skill", "insight": "一句话描述(50字内)", "confidence": 0.0-1.0 }] }
要求：只提取有明确证据的洞察，confidence < 0.6 不输出，最多 3 条。已有洞察: ${JSON.stringify(existingInsights.map(i => i.insight))}`,
        },
        { role: 'user', content: conversationText },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) return;

  const data = await response.json();
  const result = JSON.parse(data.choices[0].message.content);

  for (const ins of (result.insights || [])) {
    if (ins.confidence < 0.6) continue;
    await prisma.userInsight.create({
      data: {
        userId,
        category: ins.category,
        insight: ins.insight,
        confidence: ins.confidence,
      },
    });
  }
}
```

- [ ] **Step 2: 创建 DeepSeek Agent Backend**

```typescript
// server/src/agents/backends/deepseek.ts
import { config } from '../../config';
import { getToolDefinitions, getToolHandlers } from '../tools';
import type { CoachMemoryContext } from '../memory';

interface AgentMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
}

export async function deepseekAgentReply(
  userMessage: string,
  context: CoachMemoryContext,
  userId: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(context);
  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  // 注入对话历史
  if (context.conversationHistory) {
    for (const m of context.conversationHistory) {
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const toolDefs = getToolDefinitions();
  const toolHandlers = getToolHandlers();

  // Agent loop: up to 3 iterations
  for (let i = 0; i < 3; i++) {
    const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseek.apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        tools: toolDefs.map(t => ({
          type: 'function',
          function: {
            name: t.name,
            description: t.description,
            parameters: t.parameters,
          },
        })),
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0].message;

    // 如果 AI 要调用工具
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: choice.content || '',
        tool_calls: choice.tool_calls,
      });

      for (const tc of choice.tool_calls) {
        const fnName = tc.function.name;
        const fnArgs = JSON.parse(tc.function.arguments);
        const handler = toolHandlers[fnName];

        if (handler) {
          try {
            const result = await handler(fnArgs, userId);
            messages.push({
              role: 'tool',
              content: result,
              tool_call_id: tc.id,
            });
          } catch (e: any) {
            messages.push({
              role: 'tool',
              content: `工具调用失败: ${e.message}`,
              tool_call_id: tc.id,
            });
          }
        }
      }
      continue; // 继续循环让 AI 基于工具结果回复
    }

    // 没有 tool_calls，直接返回回复
    return choice.content || '我听到了。要不要再聊聊？';
  }

  // 超过最大循环次数，强制生成最终回复
  messages.push({ role: 'system', content: '请基于已获取的信息给出最终回复。不超过150字。' });
  const finalRes = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 400,
    }),
  });
  const finalData = await finalRes.json();
  return finalData.choices[0].message.content || '好的，今天就到这里吧。';
}

function buildSystemPrompt(context: CoachMemoryContext): string {
  return `你是一位个人成长教练。你是"镜子"和"追问者"——反映用户没说出来的部分，挑战假设，挖掘深层原因。

## 用户画像
${context.userProfile || '暂无'}

## 年度目标
${context.annualGoals || '暂无'}

## 已知洞察
${context.relevantInsights || '暂无'}

## 近期复盘
${context.recentGDRRSummary || '暂无'}

## 当前复盘 GDRR
${context.gdrrContent}

## 可用工具
你可以调用工具来获取更多上下文。不需要每次都调用——当现有上下文足够回答时直接回复即可。

## 指导原则
- 如果用户回避问题，温和地指出并回到正题
- 如果用户说出新信息，追问深层原因
- 如果用户提出解决方案，帮助验证并关联长期目标
- 每次只问一个问题
- 回复不超过 150 字
- 简洁精准，不说教`;
}
```

- [ ] **Step 3: 创建 Agent 主入口**

```typescript
// server/src/agents/coach.ts
import { deepseekAgentReply } from './backends/deepseek';
import { buildMemoryContext, extractInsights } from './memory';
import type { CoachMemoryContext } from './memory';

export interface CoachReplyInput {
  userId: string;
  reviewId: string;
  userMessage: string;
}

export async function getCoachReply(input: CoachReplyInput): Promise<string> {
  const context = await buildMemoryContext(input.userId, input.reviewId);
  const reply = await deepseekAgentReply(input.userMessage, context, input.userId);

  // 异步提取洞察（不阻塞回复）
  const prisma = (await import('@prisma/client')).PrismaClient;
  const client = new (prisma as any)();
  const msgCount = await client.coachMessage.count({
    where: { reviewId: input.reviewId },
  });
  extractInsights(input.userId, input.reviewId, msgCount + 2).catch(e =>
    console.error('[Insight Extract Error]', e)
  );

  return reply;
}
```

- [ ] **Step 4: Commit**

```bash
git add server/src/agents/
git commit -m "feat: implement agent core with DeepSeek function calling backend and memory system"
```

---

### Task 9: Coach Route 切换到新 Agent

**Files:**
- Modify: `server/src/routes/coach.ts`

- [ ] **Step 1: 更新 coach.ts 使用新 Agent**

```typescript
// server/src/routes/coach.ts
import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getCoachReply } from '../agents/coach';

const prisma = new PrismaClient();
export const coachRouter = Router();

coachRouter.use(authMiddleware);

// GET /api/reviews/:reviewId/coach-messages (不变)
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

  // 保存用户消息
  await prisma.coachMessage.create({
    data: { reviewId, role: 'USER', content: content.trim() },
  });

  // 调用新 Agent
  const coachReply = await getCoachReply({
    userId: req.userId!,
    reviewId,
    userMessage: content.trim(),
  });

  const saved = await prisma.coachMessage.create({
    data: { reviewId, role: 'COACH', content: coachReply },
  });

  return res.status(201).json({
    success: true,
    data: {
      id: saved.id,
      reviewId,
      role: 'COACH',
      content: saved.content,
      createdAt: saved.createdAt.toISOString(),
    },
  });
});
```

- [ ] **Step 2: Commit**

```bash
git add server/src/routes/coach.ts
git commit -m "feat: switch coach route to new tool-use agent"
```

---

### Task 10: OpenClaw Backend Skeleton（Phase 2 预备）

**Files:**
- Create: `server/src/agents/backends/openclaw.ts`

- [ ] **Step 1: 创建 OpenClaw backend skeleton**

```typescript
// server/src/agents/backends/openclaw.ts
import type { CoachMemoryContext } from '../memory';

export async function openclawAgentReply(
  userMessage: string,
  context: CoachMemoryContext,
  _userId: string,
  openclawConfig?: { endpoint: string; apiKey: string },
): Promise<string> {
  if (!openclawConfig?.endpoint) {
    throw new Error('OpenClaw 未配置');
  }

  const response = await fetch(openclawConfig.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openclawConfig.apiKey || ''}`,
    },
    body: JSON.stringify({
      message: userMessage,
      context: {
        gdrr: context.gdrrContent,
        goals: context.annualGoals,
        insights: context.relevantInsights,
        recentReviews: context.recentGDRRSummary,
        conversationHistory: context.conversationHistory,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenClaw API error: ${response.status}`);
  }

  const data = await response.json();
  return data.reply || data.message || '（OpenClaw 无响应）';
}
```

- [ ] **Step 2: Commit**

```bash
git add server/src/agents/backends/openclaw.ts
git commit -m "feat: add OpenClaw backend skeleton for Phase 2"
```

---

### Task 11: CoachChatScreen 多轮对话 UI（P1）

**Files:**
- Create: `expo-app/src/screens/CoachChatScreen.tsx`
- Create: `expo-app/src/components/CoachBubble.tsx`
- Modify: `expo-app/src/navigation/index.tsx`

- [ ] **Step 1: 创建 CoachBubble 对话气泡组件**

```tsx
// expo-app/src/components/CoachBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '../theme';

export default function CoachBubble({ role, content }: { role: 'USER' | 'COACH'; content: string }) {
  const isCoach = role === 'COACH';
  return (
    <View style={[styles.row, isCoach ? styles.coachRow : styles.userRow]}>
      <View style={[styles.bubble, isCoach ? styles.coachBubble : styles.userBubble]}>
        <Text style={[styles.text, isCoach ? styles.coachText : styles.userText]}>
          {content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.sm },
  coachRow: { alignItems: 'flex-start' },
  userRow: { alignItems: 'flex-end' },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: spacing.md },
  coachBubble: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  userBubble: { backgroundColor: colors.primary },
  text: { ...fonts.body, fontSize: 14 },
  coachText: { color: colors.text },
  userText: { color: colors.white },
});
```

- [ ] **Step 2: 创建 CoachChatScreen**

```tsx
// expo-app/src/screens/CoachChatScreen.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  FlatList, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { colors, fonts, spacing } from '../theme';
import { coachApi, reviewsApi } from '../api/client';
import CoachBubble from '../components/CoachBubble';

export default function CoachChatScreen({ route }: any) {
  const { reviewId } = route.params;
  const [messages, setMessages] = useState<Array<{ id: string; role: 'USER' | 'COACH'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [gdrr, setGDRR] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    Promise.all([
      coachApi.getMessages(reviewId),
      reviewsApi.get(reviewId),
    ]).then(([msgRes, revRes]) => {
      setMessages(msgRes.data.data || []);
      setGDRR(revRes.data.data?.gdrr);
    }).catch(console.error).finally(() => setLoading(false));
  }, [reviewId]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setSending(true);
    try {
      const res = await coachApi.sendMessage(reviewId, text);
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'USER', content: text },
        { id: res.data.data.id, role: 'COACH', content: res.data.data.content },
      ]);
    } catch (e: any) {
      setMessages(prev => [
        ...prev,
        { id: Date.now().toString(), role: 'USER', content: text },
      ]);
    } finally {
      setSending(false);
    }
  };

  const renderItem = ({ item }: any) => (
    <CoachBubble role={item.role} content={item.content} />
  );

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {gdrr && (
        <View style={styles.gdrrBar}>
          <Text style={styles.gdrrSummary}>
            目标: {gdrr.goal?.slice(0, 50)}...
          </Text>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.msgList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyChat}>
            <Text style={styles.emptyChatText}>开始教练对话，深入反思今天的复盘</Text>
          </View>
        }
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.chatInput}
          value={input}
          onChangeText={setInput}
          placeholder="输入你的想法..."
          placeholderTextColor={colors.textSecondary}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !input.trim() && styles.sendDisabled]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.sendText}>发送</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  gdrrBar: {
    backgroundColor: colors.card,
    padding: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  gdrrSummary: { ...fonts.caption, fontSize: 12 },
  msgList: { padding: spacing.md, flexGrow: 1 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyChatText: { ...fonts.caption },
  inputRow: {
    flexDirection: 'row',
    padding: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.card,
    gap: spacing.sm,
    alignItems: 'flex-end',
  },
  chatInput: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...fonts.body,
    fontSize: 14,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: colors.primary,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.5 },
  sendText: { color: colors.white, fontWeight: '600' },
});
```

- [ ] **Step 3: 在导航中注册 CoachChat 路由**

在 `expo-app/src/navigation/index.tsx` 中添加：
```tsx
import CoachChatScreen from '../screens/CoachChatScreen';
// ...
<Stack.Screen name="CoachChat" component={CoachChatScreen} options={{ title: '教练对话' }} />
```

- [ ] **Step 4: 更新 ReviewDetailScreen 的 CoachQuestions onPress 跳转**

将 `CoachQuestions` 组件的 `onQuestionPress` 和 `onChatPress` 改为跳转 `CoachChat`：
```tsx
onQuestionPress={(q: string) => {
  navigation.navigate('CoachChat', { reviewId: review.id, initialMessage: q });
}}
onChatPress={() => {
  navigation.navigate('CoachChat', { reviewId: review.id });
}}
```

- [ ] **Step 5: Commit**

```bash
git add expo-app/src/screens/CoachChatScreen.tsx expo-app/src/components/CoachBubble.tsx expo-app/src/navigation/index.tsx expo-app/src/screens/ReviewDetailScreen.tsx
git commit -m "feat: add multi-turn coach chat UI with chat bubbles"
```

---

### Task 12: ProfileScreen 教练后端配置（P1）

**Files:**
- Modify: `expo-app/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: 在 ProfileScreen 添加教练后端配置区域**

在现有 profile 表单下方增加：
```tsx
<View style={styles.section}>
  <Text style={styles.sectionTitle}>教练后端</Text>
  <TouchableOpacity
    style={[styles.coachOption, coachBackend === 'deepseek' && styles.coachActive]}
    onPress={() => setCoachBackend('deepseek')}
  >
    <Text style={styles.coachOptionTitle}>内置教练 (DeepSeek)</Text>
    <Text style={styles.coachOptionDesc}>使用 DeepSeek API，开箱即用</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.coachOption, coachBackend === 'openclaw' && styles.coachActive]}
    onPress={() => setCoachBackend('openclaw')}
  >
    <Text style={styles.coachOptionTitle}>OpenClaw 私人教练</Text>
    <Text style={styles.coachOptionDesc}>连接本地 OpenClaw 实例，更丰富的上下文</Text>
  </TouchableOpacity>
  {coachBackend === 'openclaw' && (
    <>
      <TextInput
        style={styles.input}
        placeholder="OpenClaw 端点 (http://localhost:8787)"
        placeholderTextColor={colors.textSecondary}
        value={openclawEndpoint}
        onChangeText={setOpenclawEndpoint}
      />
      <TextInput
        style={styles.input}
        placeholder="API Key"
        placeholderTextColor={colors.textSecondary}
        value={openclawApiKey}
        onChangeText={setOpenclawApiKey}
        secureTextEntry
      />
      <TouchableOpacity style={styles.testBtn} onPress={testOpenclawConnection}>
        <Text style={styles.testBtnText}>测试连接</Text>
      </TouchableOpacity>
    </>
  )}
</View>
```

需要添加对应的 state：
```tsx
const [coachBackend, setCoachBackend] = useState<'deepseek' | 'openclaw'>('deepseek');
const [openclawEndpoint, setOpenclawEndpoint] = useState('');
const [openclawApiKey, setOpenclawApiKey] = useState('');
```

- [ ] **Step 2: Commit**

```bash
git add expo-app/src/screens/ProfileScreen.tsx
git commit -m "feat: add coach backend selector in profile settings"
```

---

## Plan Completion Checklist

- [ ] Task 1: VoiceRecorder 按住说话
- [ ] Task 2: ReviewInputScreen Typeless
- [ ] Task 3: DeepSeek GDRR Prompt 优化
- [ ] Task 4: scopeArea 可选 + 删除 ScopeSelector
- [ ] Task 5: 报告后端
- [ ] Task 6: 报告前端
- [ ] Task 7: Agent Tools
- [ ] Task 8: Agent 核心 + DeepSeek Backend + Memory
- [ ] Task 9: Coach Route 切换
- [ ] Task 10: OpenClaw Backend Skeleton
- [ ] Task 11: CoachChatScreen UI
- [ ] Task 12: ProfileScreen 教练配置
