import { config } from '../config';
import type { GDRR, InsightCandidate, GrowthSignals, ScopeArea, GoalCategory } from '@shared/types';

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
