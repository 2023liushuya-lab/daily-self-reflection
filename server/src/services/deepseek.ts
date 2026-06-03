import { config } from '../config';
import type { GDRR, InsightCandidate, GrowthSignals, RelatedGoal } from '@shared/types';

// ASR 后处理：纠错 + 去口语词 + 分段
export async function cleanASRText(rawText: string): Promise<string> {
  if (!rawText?.trim()) return '';

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
          content: `你是语音转文字的后处理助手。对ASR识别结果进行纠错和整理：

1. 纠正明显的识别错误（同音字、错别字、错误的断句）
2. 删除口语填充词（嗯、那个、就是说、然后…然后、反正、怎么说呢）
3. 补充标点符号，合理分句分段
4. 保持原意完整，不删减实质内容，不概括不压缩
5. 如果语音内容涉及工作/人际/个人状态/个人生活等不同话题，用自然的分段区分

只输出整理后的纯文本，不要加任何前缀或说明。`,
        },
        { role: 'user', content: rawText },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    console.error('[cleanASR] DeepSeek API error:', response.status);
    return rawText; // fallback to raw text
  }

  const data: any = await response.json();
  const cleaned: string | undefined = data.choices?.[0]?.message?.content;
  return cleaned?.trim() || rawText;
}

interface StructuredReviewResult {
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  relatedGoals: RelatedGoal[];
}

const STRUCTURE_PROMPT = `你是一位个人成长教练。用户的复盘文本可能是一段冗长、散乱、口语化的自述。你的任务是对它进行**结构化整理**，让用户能清晰地看到自己的反思。

## 你的工作方式（参考 Typeless 结构化）

### 不是：原文照搬
不要只是把用户的原文拆成四段塞进 GDRR 四个框里。用户自己写了什么自己知道，不需要你复读。

### 而是：提炼 + 重组
- 从散乱的叙述中提炼出**目标、结果、差距、原因**四个维度的核心内容
- 用更清晰、更简洁的语言重新组织，但要**保留全部实质性细节**（具体事件、数字、人名、情绪）
- 去除口语赘词（"嗯""就是""那个""反正""怎么说呢"）
- 把零散的句子整合成连贯的段落

### 结构化深度要求
- **Goal（目标）**：用户想做/想达成什么？写出具体的目标对象，不是"完成工作"这种空泛描述
- **Result（结果）**：实际发生了什么？客观描述，有数据给数据
- **Difference（差距）**：目标 vs 结果之间的落差是什么？是哪个环节出了问题？
- **Reason（原因）**：深层原因是什么？用户的反思中有没有触及根本（而非表面借口）？

### 原则
1. **每个字段应该是 2-5 句话的连贯段落**，不是碎片化的要点罗列
2. **保留原意的具体性**：不要用"做了某件事"替代"做了XX项目的需求评审"
3. **如果没有对应内容，填"（未提及）"**，不要凭空编造
4. **语言自然**：像一个教练在帮你整理思路，而不是机器在输出模板

## 输出字段
- goal: string — 2-5 句连贯段落
- result: string — 2-5 句连贯段落
- difference: string — 2-5 句连贯段落
- reason: string — 2-5 句连贯段落
- tags: string[] — 3-5 个中文标签，精准描述本次复盘涉及的主题
- coach_questions: string[] — 2-3 个开放式追问，每个不超过 40 字，要能挑战用户的假设或盲区
- insight_candidates: { category: "blind_spot"|"strength"|"pattern"|"skill", insight: string, confidence: number }[]
- growth_signals: { skillsObserved: string[], patternsContinuing: string[], breakthroughs: string[] }
- related_goals: { goalId: string, relevance: "high"|"medium"|"low", progressNote: string }[]

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

  const data: any = await response.json();

  if (!data.choices?.length) {
    throw new Error('DeepSeek API returned empty choices');
  }

  const message = data.choices[0].message;
  if (!message?.content) {
    throw new Error('DeepSeek API returned empty message content');
  }

  let result: Record<string, any>;
  try {
    result = JSON.parse(message.content);
  } catch {
    throw new Error('Failed to parse DeepSeek API response as JSON');
  }

  return {
    gdrr: {
      goal: String(result.goal || '（未提及）'),
      result: String(result.result || '（未提及）'),
      difference: String(result.difference || '（未提及）'),
      reason: String(result.reason || '（未提及）'),
    },
    tags: (result.tags as any[]) || [],
    coachQuestions: (result.coach_questions as any[]) || [],
    insightCandidates: (result.insight_candidates as any[]) || [],
    growthSignals: (result.growth_signals as GrowthSignals) || { skillsObserved: [], patternsContinuing: [], breakthroughs: [] },
    relatedGoals: (result.related_goals as any[]) || [],
  };
}
