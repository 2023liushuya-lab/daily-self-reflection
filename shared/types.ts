// ---- User ----
export interface UserProfile {
  nickname: string;
  role: string;
  focusAreas: string[];
  personalityTrait?: string;
  preferredWorkHours?: string;
}

export interface User {
  id: string;
  phone: string;
  nickname: string | null;
  profile: UserProfile | null;
  createdAt: string;
}

// ---- Annual Goal ----
export type GoalCategory = 'WORK' | 'RELATIONSHIP' | 'PERSONAL_STATE' | 'PERSONAL_LIFE';
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

export interface KeyResult {
  id: string;
  description: string;
  current: number;
  target: number;
  unit: string;
  direction?: 'up' | 'down';
  startValue?: number;
}

export interface AnnualGoal {
  id: string;
  userId: string;
  title: string;
  description: string;
  category?: string;
  keyResults: KeyResult[];
  qualitativeMilestones?: string[];
  progress: number;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalInput {
  title: string;
  description: string;
  keyResults: Omit<KeyResult, 'id'>[];
}

export interface UpdateGoalInput {
  title?: string;
  description?: string;
  keyResults?: KeyResult[];
  progress?: number;
  status?: GoalStatus;
}

// ---- Review ----
export type ScopeArea = GoalCategory;

export interface GDRR {
  goal: string;
  result: string;
  difference: string;
  reason: string;
}

export interface RelatedGoal {
  goalId: string;
  relevance: 'high' | 'medium' | 'low';
  progressNote: string;
}

export type InsightCategory = 'blind_spot' | 'strength' | 'pattern' | 'skill';

export interface InsightCandidate {
  category: InsightCategory;
  insight: string;
  confidence: number;
}

export interface GrowthSignals {
  skillsObserved: string[];
  patternsContinuing: string[];
  breakthroughs: string[];
}

export interface Review {
  id: string;
  userId: string;
  rawText: string;
  audioUrl?: string;
  scopeArea: ScopeArea;
  gdrr: GDRR;
  tags: string[];
  coachQuestions: string[];
  relatedGoals: RelatedGoal[];
  insightCandidates: InsightCandidate[];
  growthSignals: GrowthSignals;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  rawText: string;
  scopeArea: ScopeArea;
}

// ---- Coach ----
export interface CoachMessage {
  id: string;
  reviewId: string;
  role: 'USER' | 'COACH';
  content: string;
  createdAt: string;
}

// ---- Report ----
export type ReportType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface Report {
  id: string;
  userId: string;
  type: ReportType;
  periodStart: string;
  periodEnd: string;
  content: Record<string, unknown>;
  createdAt: string;
}

// ---- User Insight ----

export interface UserInsight {
  id: string;
  userId: string;
  category: InsightCategory;
  insight: string;
  confidence: number;
  createdAt: string;
}

// ---- API Response ----
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}
