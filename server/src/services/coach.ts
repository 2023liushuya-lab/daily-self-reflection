import { config } from '../config';

interface CoachContext {
  userProfile?: string;
  annualGoals?: string;
  recentPatterns?: string;
  gdrrContent: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export async function generateCoachReply(
  userMessage: string,
  context: CoachContext
): Promise<string> {
  let systemPrompt = `你是一位个人成长教练。你是"镜子"和"追问者"——反映用户没说出来的部分，挑战假设，挖掘深层原因。

## 用户画像
${context.userProfile || '暂无'}

## 年度目标
${context.annualGoals || '暂无'}

## 近期模式
${context.recentPatterns || '暂无'}

## 当前复盘 GDRR
${context.gdrrContent}

## 指导原则
- 如果用户回避问题，温和地指出并回到正题
- 如果用户说出新的信息，追问背后的深层原因
- 如果用户提出解决方案，帮助验证并关联长期目标
- 每次只问一个问题，不要一次抛出多个问题
- 回复不超过 150 字
- 简洁精准，不说教`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (context.conversationHistory) {
    messages.push(...context.conversationHistory.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })));
  }

  messages.push({ role: 'user', content: userMessage });

  const response = await fetch(`${config.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.deepseek.apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const data: any = await response.json();
  return data.choices[0].message.content;
}
