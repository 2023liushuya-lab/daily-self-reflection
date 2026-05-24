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

  if (context.conversationHistory) {
    for (const m of context.conversationHistory) {
      messages.push({ role: m.role as 'user' | 'assistant', content: m.content });
    }
  }

  messages.push({ role: 'user', content: userMessage });

  const toolDefs = getToolDefinitions();
  const toolHandlers = getToolHandlers();

  // Agent loop: up to 3 iterations (think -> act -> respond)
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
    const choice = data.choices?.[0]?.message;
    if (!choice) {
      return '我暂时无法回复，请稍后再试。';
    }

    // If AI wants to call tools
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      messages.push({
        role: 'assistant',
        content: choice.content || '',
        tool_calls: choice.tool_calls,
      });

      for (const tc of choice.tool_calls) {
        const fnName = tc.function.name;
        let fnArgs: any;
        try {
          fnArgs = JSON.parse(tc.function.arguments);
        } catch {
          fnArgs = {};
        }

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
      continue; // Continue loop for AI to process tool results
    }

    // No tool_calls, return reply directly
    return choice.content || '我听到了。要不要再深入聊聊？';
  }

  // Exceeded max iterations, force final reply
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
  return finalData.choices?.[0]?.message?.content || '好的，今天就到这里吧。';
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
