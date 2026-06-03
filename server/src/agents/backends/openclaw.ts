import type { CoachMemoryContext } from '../memory';

export interface OpenClawConfig {
  endpoint: string;
  apiKey: string;
}

export async function openclawAgentReply(
  userMessage: string,
  context: CoachMemoryContext,
  _userId: string,
  openclawConfig?: OpenClawConfig,
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

  const data: any = await response.json();
  return data.reply || data.message || '（OpenClaw 无响应）';
}
