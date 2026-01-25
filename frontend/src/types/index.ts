// 用户相关类型
export interface User {
  id: number;
  name: string;
  identity: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
  email?: string;
  avatar?: string;
  signature?: string;
  acCount?: number;
  submitCount?: number;
  rating?: number;
  createTime?: string;
}

export interface UserInfo {
  id: string | null;
  name: string | null;
  identity: string | null;
}

// 题目相关类型
export interface Problem {
  id: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  tags?: string[];
  acCount?: number;
  submitCount?: number;
  timeLimit?: number;
  memoryLimit?: number;
  description?: string;
  inputDescription?: string;
  outputDescription?: string;
  samples?: Sample[];
  hint?: string;
  source?: string;
  createTime?: string;
  status?: 'ac' | 'wa' | 'tle' | 'mle' | 'ce' | 'pending' | null;
}

export interface Sample {
  input: string;
  output: string;
}

// 提交相关类型
export interface Submission {
  id: number;
  problemId: number;
  problemTitle?: string;
  userId: number;
  userName?: string;
  language: string;
  code?: string;
  status: SubmissionStatus;
  time?: number;
  memory?: number;
  createTime: string;
  competitionId?: number;
  testcaseResults?: TestcaseResult[];
}

export type SubmissionStatus = 
  | 'Accepted'
  | 'Wrong Answer'
  | 'Time Limit Exceeded'
  | 'Memory Limit Exceeded'
  | 'Compile Error'
  | 'Runtime Error'
  | 'Pending'
  | 'Judging'
  | 'System Error';

export interface TestcaseResult {
  id: number;
  status: SubmissionStatus;
  time: number;
  memory: number;
}

// 竞赛相关类型
export interface Competition {
  id: number;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'running' | 'ended';
  participants?: number;
  problems?: CompetitionProblem[];
  createTime?: string;
}

export interface CompetitionProblem {
  id: number;
  label: string;
  title: string;
  acCount?: number;
  submitCount?: number;
}

export interface RanklistItem {
  rank: number;
  userId: number;
  userName: string;
  avatar?: string;
  totalScore?: number;
  totalTime?: number;
  acCount?: number;
  problems?: ProblemResult[];
}

export interface ProblemResult {
  problemId: number;
  label: string;
  status: 'ac' | 'wa' | 'pending' | null;
  time?: number;
  attempts?: number;
  firstBlood?: boolean;
}

// 练习相关类型
export interface Practice {
  id: number;
  title: string;
  description?: string;
  problemCount?: number;
  participants?: number;
  createTime?: string;
  problems?: Problem[];
}

// 通知相关类型
export interface Notification {
  id: number;
  title: string;
  content?: string;
  type: 'system' | 'competition' | 'problem';
  isRead?: boolean;
  createTime: string;
}

// 题解相关类型
export interface Solution {
  id: number;
  problemId: number;
  userId: number;
  userName?: string;
  userAvatar?: string;
  title: string;
  content: string;
  language?: string;
  views?: number;
  likes?: number;
  isLiked?: boolean;
  createTime: string;
  updateTime?: string;
}

// API 响应类型
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export interface PageResponse<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
  pages: number;
}

// WebSocket 消息类型
export interface JudgeMessage {
  type: 'status' | 'result' | 'error' | 'complete';
  submissionId: number;
  status?: SubmissionStatus;
  testcaseId?: number;
  time?: number;
  memory?: number;
  message?: string;
}

// 表单类型
export interface LoginForm {
  username: string;
  password: string;
}

export interface RegisterForm {
  username: string;
  password: string;
  confirmPassword: string;
  email?: string;
}

export interface ProblemForm {
  title: string;
  difficulty: 'easy' | 'medium' | 'hard';
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputDescription: string;
  outputDescription: string;
  samples: Sample[];
  hint?: string;
  source?: string;
  tags?: string[];
}

// 路由参数类型
export interface RouteParams {
  id?: string;
  problemId?: string;
  solveId?: string;
  cid?: string;
}

