import { deepseekAgentReply } from './backends/deepseek';
import { buildMemoryContext, extractInsights } from './memory';

export interface CoachReplyInput {
  userId: string;
  reviewId: string;
  userMessage: string;
  messageCount?: number; // Total messages AFTER this one is saved (user+coach combined)
}

export async function getCoachReply(input: CoachReplyInput): Promise<string> {
  const context = await buildMemoryContext(input.userId, input.reviewId);
  const reply = await deepseekAgentReply(input.userMessage, context, input.userId);

  // Async insight extraction (fire-and-forget, don't block reply)
  if (input.messageCount && input.messageCount >= 4) {
    extractInsights(input.userId, input.reviewId, input.messageCount).catch(e =>
      console.error('[Insight Extract Error]', e)
    );
  }

  return reply;
}
