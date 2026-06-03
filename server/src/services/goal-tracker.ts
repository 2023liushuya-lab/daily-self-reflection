import { config } from '../config';

interface KeyResult {
  id: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  direction?: 'up' | 'down';
  startValue?: number;
}

interface GoalForTracking {
  id: string;
  title: string;
  category: string;
  keyResults: KeyResult[];
}

interface ProgressUpdate {
  goalId: string;
  keyResultUpdates: { id: string; newCurrent: number; reason: string }[];
  overallProgress: number;
  summary: string;
}

/**
 * 分析复盘内容，检测与目标的关联并提取进度信号。
 * 返回需要更新的目标及其关键结果进度。
 */
export async function analyzeGoalProgress(
  reviewRawText: string,
  reviewGDRR: { goal: string; result: string; difference: string; reason: string },
  goals: GoalForTracking[]
): Promise<ProgressUpdate[]> {
  if (!goals.length) return [];

  // 只追踪有关键结果的目标
  const trackableGoals = goals.filter(g => g.keyResults && g.keyResults.length > 0);
  if (!trackableGoals.length) return [];

  const goalsContext = trackableGoals.map(g => ({
    id: g.id,
    title: g.title,
    category: g.category,
    keyResults: g.keyResults.map(kr => ({
      id: kr.id,
      description: kr.description,
      current: kr.current,
      target: kr.target,
      unit: kr.unit,
      direction: kr.direction || 'up',
      startValue: kr.startValue,
    })),
  }));

  try {
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
            content: `你是一个目标进度追踪助手。用户做完了一次复盘，你需要判断这次复盘中是否涉及任何年度目标的进展。

## 你的任务
1. 阅读复盘内容（包括 GDRR 结构），判断哪些目标（如果有）在这次复盘中被涉及
2. 对于相关的目标，检查关键结果是否有进展
3. 如果有进展，更新 keyResult 的 current 值

## 进度判断规则

⚠️ **核心概念：current = 已完成的进度量（从 0 开始累积），target = 需要完成的总量。两者使用同一量纲。**

- **直接进展**：用户明确说完成了某个里程碑（如"又读完一本书，今年第 8 本了"→ current 更新到 8）
- **累积进展**：用户说做了多少（如"这周跑了 2 次步"→ current 在原有基础上 +2）
- **部分进展**：用户说完成百分比（如"进度大约 60%"→ 如果 target 是 10，则 current 更新到 6）
- **降低型目标**（如减肥、减少开支）：用户说"从 98 减到 96 了"→ 已减 2 斤，current = 2。如果 target 是减 8 斤，current 更新为 2。
- **无关联**：复盘内容和目标毫无关系 → 不要强行关联

## 重要原则
- 只返回**确实有进展**的目标更新。没有检测到进展就返回空数组 []
- current 值不能超过 target 值
- **降低型目标**（direction='down'，如减肥）：current 跟踪实际值（如体重 96 斤），target 是目标值（90 斤），startValue 是起点（98 斤）。进度 = (startValue - current) / (startValue - target) * 100
- **增长型目标**（direction='up'，默认）：current 是已完成量，target 是总目标量。进度 = current / target * 100
- overallProgress 是 0-100 的整数，基于所有 keyResult 按上述规则计算后取平均
- reason 字段简短说明为什么更新（10字以内）

## 输出格式
纯 JSON 数组（不要 markdown 包裹）：
[
  {
    "goalId": "目标的 uuid",
    "keyResultUpdates": [
      { "id": "kr的id", "newCurrent": 95, "reason": "项目交付评分95" }
    ],
    "overallProgress": 70,
    "summary": "交付了XX项目，评分达到95分"
  }
]

如果没有检测到任何进展，返回空数组：[]`,
          },
          {
            role: 'user',
            content: `## 用户复盘内容\n${reviewRawText}\n\n## GDRR 结构化\n- 目标：${reviewGDRR.goal}\n- 结果：${reviewGDRR.result}\n- 差距：${reviewGDRR.difference}\n- 原因：${reviewGDRR.reason}\n\n## 当前活跃目标及关键结果\n${JSON.stringify(goalsContext, null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error('[GoalTracker] API error:', response.status);
      return [];
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) return [];

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error('[GoalTracker] JSON parse error');
      return [];
    }

    // AI might return { "updates": [...] } or just [...]
    const updates = Array.isArray(parsed) ? parsed : (parsed.updates || []);
    return updates.filter((u: any) => u.goalId && u.keyResultUpdates?.length > 0);
  } catch (err: any) {
    console.error('[GoalTracker] Error:', err.message);
    return [];
  }
}
