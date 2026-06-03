import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { config } from '../config';

const prisma = new PrismaClient();
export const goalsRouter = Router();

goalsRouter.use(authMiddleware);

// POST /api/goals/parse — AI 解析自然语言目标
goalsRouter.post('/parse', async (req: AuthRequest, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ success: false, error: '请输入目标描述' });
  }

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
            content: `你是一个资深目标管理教练。用户可能用非常口语化、零散、跳跃的方式描述自己内心的渴望。你的工作是**深度理解用户真正想要什么**，帮助ta把模糊的愿望转化为清晰的目标。

## 核心原则
- **忠实于用户的真意**：不要添加用户没说的东西，但帮ta把散乱的想法组织好
- **区分量化与质性**：有数字就抓数字，没数字不要生造数字
- **精准归类**：认真辨别用户说的是什么领域的事，不要偷懒统统归成"个人成长"

---

## 1. 主题归类（category）——仔细判断

⚠️ 重要：**不是所有个人提升都叫"个人成长"**。请严格按以下标准判断：

**"工作事业"** — 关键词：项目推进、升职加薪、跳槽转行、团队管理、创业、客户交付、KPI、业绩目标、工作技能（如"学会做PPT""提升写代码能力"如涉及工作场景）、职业规划

**"学习成长"** — 关键词：读书、上课、考证、学技能（非工作场景的自我提升）、学历提升、认知思维训练、语言学习、考试

**"健康身体"** — 关键词：减肥瘦身、跑步运动健身、饮食调整、睡眠改善、体检、体态矫正、戒烟戒酒、养生

**"财务理财"** — 关键词：存钱、投资理财、赚钱副业、省钱节流、还贷、买房买车、收入目标、财务自由

**"人际关系"** — 关键词：社交、朋友、人脉拓展、同事关系、亲密关系/恋爱、沟通表达能力（如涉及人际场景）、社群运营

**"家庭生活"** — 关键词：陪伴家人、孩子教育、父母关系、夫妻关系、家务、装修搬家、家庭旅行

**"兴趣爱好"** — 关键词：旅行、摄影、乐器、绘画、美食、游戏、手工、穿搭、宠物、运动（以爱好为目的而非健康）

**"个人成长"** — **仅限**无法明确归入以上 7 类的个人提升，例如：情绪管理、冥想、培养耐心、提高自律、时间管理、减少手机依赖等。

**判断过程：**
1. 先看你识别到的关键词属于哪一类
2. 如果多个领域都涉及，选**用户在描述中花时间最长 / 情绪最强**的那个
3. 不要因为难判断就选"个人成长"——这个选项是最后手段，不是默认选项

## 2. 目标陈述（title）
- 保留用户原话中的具体细节、数字、人名、场景
- 去除口语赘词（"就是""那个""怎么说呢""反正"），使之精炼通顺
- 如果用户的想法很散，帮ta组织成有逻辑的表述
- 示例："想提升管理能力带人什么的，感觉团队不太行" → "提升管理能力，培养下属独立承担项目"

## 3. 原文保留（description）
用户输入的完整原文，一字不改。

## 4. 量化指标提取（keyResults）——有则有，无则无

⚠️ 核心原则：**只提取用户明确表达或强烈暗示的数字。不要把模糊愿望强行数字化。**

### ✅ 应该提取的情况：

⚠️ **关键规则：current 和 target 必须使用同一量纲。**
- current = 目前已完成的进度量（从 0 开始累积）
- target = 需要完成的总额
- **永远不要把"当前状态值"当成 current，current 代表的是"已经完成了多少"**

**正确的例子：**
- "读 12 本书"（已读 3 本）→ { "description": "阅读书籍数量", "target": 12, "unit": "本", "current": 3 }
- "减 15 斤"（已减 3 斤）→ { "description": "体重减少", "target": 15, "unit": "斤", "current": 3 }
- "存 10 万"（已存 2 万）→ { "description": "新增存款", "target": 100000, "unit": "元", "current": 20000 }
- "从 98 斤减到 90 斤" → { "description": "体重减少", "target": 8, "unit": "斤", "current": 0 }
  - ⚠️ 注意：target 是 8（要减 8 斤），不是 90！90 是终点体重，不是要减的量。
- "完成 5 个项目"（已完成 1 个）→ { "description": "完成项目数", "target": 5, "unit": "个", "current": 1 }

**频率词（转数字）：**
- "每天跑步" → { "description": "跑步天数", "target": 365, "unit": "天", "current": 0 }
- "每周三次" → { "description": "每周次数", "target": 3, "unit": "次/周", "current": 0 }
- "每月读两本" → { "description": "每月阅读量", "target": 2, "unit": "本/月", "current": 0 }

**明确的具体目标：**
- "带出两个骨干" → { "description": "培养骨干人数", "target": 2, "unit": "人", "current": 0 }
- "评分到 90 分以上"（当前评分 70）→ { "description": "评分提升", "target": 20, "unit": "分", "current": 0 }
  - ⚠️ 注意：target 是要提升的分数（20分），不是目标分数（90分）

**自检清单（每次输出 KR 前自查）：**
1. current 是"已经完成了多少"还是"当前状态值"？如果是后者，你就是错的。
2. target 是"需要做多少"还是"终点值"？如果是终点值（如"体重 90 斤"），需要换算成"做多少"（如"减 8 斤"）。

### ❌ 不应该强行量化的情况：

- "想成为一个更好的管理者" → **没有数字，不要编造**。此类目标应放入 qualitativeMilestones
- "希望家里关系更和谐" → **无法量化**
- "多花时间陪家人" → **"多花时间"太模糊，没有"每天/每周"等频率词就不要编造数字**
- "提升自己的格局" → **高度抽象，无法量化**

### 选择标准：宁缺毋滥
如果让你犹豫要不要放 keyResults，就不要放。宁可少而准，不多而虚。
如果用户只给了起点和终点（如"从 98 减到 90"），你必须算出差值作为 target（target=8），不能直接用终点值。

## 5. 质性里程碑（qualitativeMilestones）——没有数字的目标也需要衡量

当用户的目标**无法量化但依然重要**时，帮ta提炼 1-3 个可观察的质性里程碑：

示例：
- "想成为一个更有耐心的管理者" →
  ["下属汇报时，先听完再给反馈，不打断", "遇到返工不第一时间发火，先了解原因", "每周至少一次和团队做 1on1 倾听"]
- "希望能多陪陪家人" →
  ["每周至少有一天完全放下手机陪家人", "每天晚饭时间和家人聊天 20 分钟", "重要节日不缺席"]
- "提升自己的审美" →
  ["每周收集并分析 3 个优秀设计案例", "完成一个完整的设计项目作品集", "关注 5 个顶级设计工作室的作品"]

**注意：即使用户没给数字，你依然可以给出具体的、可观察的行为指标。这不是量化，而是「做什么才算做到了」。**

## 6. 多目标检测
如果用户明显在说多个不同领域的事（如同时聊健身和职业发展），标记 isMultiGoal: true，并在 suggestedSplit 中拆分为独立目标。

---

输出纯 JSON（不要 markdown 包裹）：
{
  "category": "工作事业",
  "title": "结构化的目标陈述",
  "description": "用户完整原文",
  "keyResults": [
    {
      "description": "具体衡量什么",
      "target": 100,
      "unit": "%",
      "current": 0,
      "direction": "up",
      "startValue": 0
    }
  ],
  "qualitativeMilestones": ["可观察的行为里程碑1"],
  "isMultiGoal": false,
  "suggestedSplit": []
}

⚠️ direction 和 startValue 说明：
- direction: "up" 表示越多越好（默认），"down" 表示越少越好（如减重、减开支）
- 仅当 direction 为 "down" 时才需要 startValue（起点值）
- 例如："从 98 斤减到 90 斤" → direction: "down", startValue: 98, current: 98, target: 90
  - current 跟踪实际体重值（从 98 变到 96 变到 92），target 是目标体重 90
- 例如："读完 12 本书" → direction: "up", current: 0, target: 12（无需 startValue）`,
          },
          { role: 'user', content: text.trim() },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.5,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI 解析失败' });
    }

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return res.status(500).json({ success: false, error: 'AI 返回格式异常，请重试' });
    }

    return res.json({
      success: true,
      data: {
        title: parsed.title || text.trim(),
        description: parsed.description || text.trim(),
        category: parsed.category || '个人成长',
        keyResults: (parsed.keyResults || []).map((kr: any, i: number) => ({
          id: `kr-${Date.now()}-${i}`,
          description: kr.description || '',
          current: kr.current || 0,
          target: kr.target || 100,
          unit: kr.unit || '%',
          direction: kr.direction || 'up',
          startValue: kr.startValue ?? (kr.direction === 'down' ? kr.current : undefined),
        })),
        qualitativeMilestones: parsed.qualitativeMilestones || [],
        isMultiGoal: parsed.isMultiGoal || false,
        suggestedSplit: parsed.suggestedSplit || [],
      },
    });
  } catch (err: any) {
    console.error('[Goal Parse Error]', err.message);
    return res.status(500).json({ success: false, error: '解析失败，请稍后重试' });
  }
});

const createGoalSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(500),
  description: z.string().max(500).default(''),
  category: z.string().max(50).default('个人成长'),
  keyResults: z.array(z.object({
    description: z.string(),
    current: z.number().default(0),
    target: z.number(),
    unit: z.string().default('%'),
  })).default([]),
  qualitativeMilestones: z.array(z.string()).default([]),
});

// GET /api/goals
goalsRouter.get('/', async (req: AuthRequest, res: Response) => {
  const goals = await prisma.annualGoal.findMany({
    where: { userId: req.userId },
    orderBy: { createdAt: 'desc' },
  });

  const mapped = goals.map(g => ({
    id: g.id,
    userId: g.userId,
    title: g.title,
    description: g.description,
    category: g.category,
    keyResults: g.keyResults,
    qualitativeMilestones: g.qualitativeMilestones || [],
    progress: g.progress,
    status: g.status,
    createdAt: g.createdAt.toISOString(),
    updatedAt: g.updatedAt.toISOString(),
  }));

  return res.json({ success: true, data: mapped });
});

// POST /api/goals
goalsRouter.post('/', async (req: AuthRequest, res: Response) => {
  const parsed = createGoalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: parsed.error.errors[0].message });
  }

  const { title, description, category, keyResults, qualitativeMilestones } = parsed.data;

  const krs = keyResults.map((kr: any, i: number) => ({
    id: `kr-${Date.now()}-${i}`,
    description: kr.description,
    current: kr.current || 0,
    target: kr.target,
    unit: kr.unit || '%',
  }));

  const goal = await prisma.annualGoal.create({
    data: {
      userId: req.userId!,
      title,
      description,
      category: category || '个人成长',
      keyResults: krs,
      qualitativeMilestones: qualitativeMilestones || [],
      progress: 0,
    },
  });

  return res.status(201).json({
    success: true,
    data: {
      ...goal,
      keyResults: goal.keyResults,
      qualitativeMilestones: goal.qualitativeMilestones || [],
      createdAt: goal.createdAt.toISOString(),
      updatedAt: goal.updatedAt.toISOString(),
    },
  });
});

// PUT /api/goals/:id
goalsRouter.put('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  const data: any = {};
  if (req.body.title !== undefined) data.title = req.body.title;
  if (req.body.description !== undefined) data.description = req.body.description;
  if (req.body.category !== undefined) data.category = req.body.category;
  if (req.body.keyResults !== undefined) data.keyResults = req.body.keyResults;
  if (req.body.qualitativeMilestones !== undefined) data.qualitativeMilestones = req.body.qualitativeMilestones;
  if (req.body.progress !== undefined) data.progress = req.body.progress;
  if (req.body.status !== undefined) data.status = req.body.status;

  const updated = await prisma.annualGoal.update({
    where: { id: req.params.id },
    data,
  });

  return res.json({
    success: true,
    data: {
      ...updated,
      keyResults: updated.keyResults,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
});

// DELETE /api/goals/:id
goalsRouter.delete('/:id', async (req: AuthRequest, res: Response) => {
  const goal = await prisma.annualGoal.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!goal) {
    return res.status(404).json({ success: false, error: '目标不存在' });
  }

  await prisma.annualGoal.delete({ where: { id: req.params.id } });
  return res.json({ success: true });
});
