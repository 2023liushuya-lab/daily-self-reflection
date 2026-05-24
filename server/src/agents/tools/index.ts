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
