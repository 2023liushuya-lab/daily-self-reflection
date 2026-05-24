import { config } from '../config';
import type { GDRR, InsightCandidate, GrowthSignals, RelatedGoal } from '@shared/types';

interface StructuredReviewResult {
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  relatedGoals: RelatedGoal[];
}

const STRUCTURE_PROMPT = `你是一位个人成长教练。请将用户的复盘文本按 GDRR 框架结构化整理。

## GDRR 框架
- Goal（目标）: 用户当时想达成什么目标
- Result（结果）: 实际发生了什么
- Difference（差距）: 目标与结果的差距
- Reason（原因）: 造成差距的深层原因

## 核心原则
1. **保留原意，不要概括或压缩**：用户的原文中所有具体事件、感受、人名、数字等实质性内容必须完整保留。你只是将它们归类到 GDRR 四个字段中，而不是用自己的话重写。
2. **只去除冗余语气词**：可以去除无意义的填充词（如"嗯""那个""就是说""然后……然后"），但保留所有有信息量的文本。
3. **不要推断复盘所属领域**：不要输出 scope_area 字段，不要判断这个复盘属于工作/生活/学习等哪个类别。
4. **没有证据就不编造**：如果某个 GDRR 字段在用户文本中完全找不到对应内容，填写"（未提及）"，不要凭空推断。

## 输出字段
- goal: 目标（如未提及则填"（未提及）"）
- result: 结果（如未提及则填"（未提及）"）
- difference: 差距（如未提及则填"（未提及）"）
- reason: 原因（如未提及则填"（未提及）"）
- tags: 3-5 个中文标签
- coach_questions: 2-3 个开放式追问，每问不超过 40 字，挑战用户的假设或盲区
- insight_candidates: 可能转化为洞察的观察点
- growth_signals: { skillsObserved: string[], patternsContinuing: string[], breakthroughs: string[] }
- related_goals: 与年度目标关联的条目

## 输出格式
纯 JSON，不要输出其他内容。`;

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

  if (!data.choices?.length) {
    throw new Error('DeepSeek API returned empty choices');
  }

  const message = data.choices[0].message;
  if (!message?.content) {
    throw new Error('DeepSeek API returned empty message content');
  }

  let result: Record<string, unknown>;
  try {
    result = JSON.parse(message.content);
  } catch {
    throw new Error('Failed to parse DeepSeek API response as JSON');
  }

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
}
