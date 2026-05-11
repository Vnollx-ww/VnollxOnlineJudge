/**
 * 集中管理徽章 (Badge / Tag) 的色彩与文案映射。
 * 各页面统一从这里取值，避免在多个 page 中重复硬编码颜色。
 */

export type BadgeTone = {
  /** 文字颜色 (CSS color) */
  color: string;
  /** 背景颜色 (CSS color) */
  bg: string;
};

const TONE_NEUTRAL: BadgeTone = {
  color: 'var(--gemini-text-secondary)',
  bg: 'var(--gemini-surface-hover)',
};

const TONE_SUCCESS: BadgeTone = {
  color: 'var(--gemini-success)',
  bg: 'var(--gemini-success-bg)',
};
const TONE_WARNING: BadgeTone = {
  color: 'var(--gemini-warning)',
  bg: 'var(--gemini-warning-bg)',
};
const TONE_ERROR: BadgeTone = {
  color: 'var(--gemini-error)',
  bg: 'var(--gemini-error-bg)',
};
const TONE_INFO: BadgeTone = {
  color: 'var(--gemini-info)',
  bg: 'var(--gemini-info-bg)',
};

/* ---------------- 评测状态 ---------------- */

/** 评测状态 -> Tone */
export const JUDGE_STATUS_TONE: Record<string, BadgeTone> = {
  答案正确: TONE_SUCCESS,
  答案错误: TONE_ERROR,
  超时: TONE_WARNING,
  时间超出限制: TONE_WARNING,
  内存超限: TONE_WARNING,
  内存超出限制: TONE_WARNING,
  运行时错误: TONE_ERROR,
  运行错误: TONE_ERROR,
  编译错误: TONE_ERROR,
  等待中: TONE_INFO,
  评测中: TONE_INFO,
};

/** 英文枚举状态 -> 中文文案 */
export const JUDGE_STATUS_LABEL: Record<string, string> = {
  ACCEPTED: '答案正确',
  WRONG_ANSWER: '答案错误',
  TIME_LIMIT_EXCEEDED: '超时',
  MEMORY_LIMIT_EXCEEDED: '内存超限',
  RUNTIME_ERROR: '运行错误',
  COMPILATION_ERROR: '编译错误',
  PENDING: '等待中',
  JUDGING: '评测中',
};

export const getJudgeStatusTone = (status: string): BadgeTone =>
  JUDGE_STATUS_TONE[status] || TONE_NEUTRAL;

export const getJudgeStatusLabel = (status: string): string =>
  JUDGE_STATUS_LABEL[status] || status;

/* ---------------- 题目难度 ---------------- */

export const DIFFICULTY_TONE: Record<string, BadgeTone> = {
  简单: TONE_SUCCESS,
  中等: TONE_WARNING,
  困难: TONE_ERROR,
};

export const getDifficultyTone = (difficulty?: string): BadgeTone =>
  (difficulty && DIFFICULTY_TONE[difficulty]) || TONE_NEUTRAL;

/* ---------------- 通过率 ---------------- */

export const getPassRateTone = (rate: number): BadgeTone => {
  if (rate >= 60) return TONE_SUCCESS;
  if (rate >= 30) return TONE_WARNING;
  return TONE_ERROR;
};

/* ---------------- 比赛状态 ---------------- */

export const COMPETITION_STATUS_TONE: Record<string, BadgeTone> = {
  进行中: TONE_SUCCESS,
  暂未开始: TONE_INFO,
  已结束: TONE_ERROR,
};

export const getCompetitionStatusTone = (status: string): BadgeTone =>
  COMPETITION_STATUS_TONE[status] || TONE_INFO;

/* ---------------- 编程语言 ---------------- */

/** 语言 -> AntD Tag color（兼容现存 AntD Tag 用法） */
export const LANGUAGE_ANTD_COLOR: Record<string, string> = {
  Python: 'blue',
  Java: 'orange',
  'C++': 'purple',
  C: 'cyan',
  Golang: 'cyan',
  JavaScript: 'gold',
};

/** 语言 -> 自制徽章 Tone（彻底脱离 antd 时使用） */
export const LANGUAGE_TONE: Record<string, BadgeTone> = {
  Python: { color: '#1d4ed8', bg: '#dbeafe' },
  Java: { color: '#c2410c', bg: '#ffedd5' },
  'C++': { color: '#7c3aed', bg: '#ede9fe' },
  C: { color: '#0e7490', bg: '#cffafe' },
  Golang: { color: '#0e7490', bg: '#cffafe' },
  JavaScript: { color: '#a16207', bg: '#fef3c7' },
};

export const getLanguageAntdColor = (lang: string): string =>
  LANGUAGE_ANTD_COLOR[lang] || 'default';

export const getLanguageTone = (lang: string): BadgeTone =>
  LANGUAGE_TONE[lang] || TONE_NEUTRAL;

/** 把界面语言名转为 react-syntax-highlighter 所需的语言 ID */
export const getCodeHighlightLanguage = (lang?: string): string => {
  if (!lang) return 'plaintext';
  if (lang === 'C++') return 'cpp';
  if (lang === 'Golang') return 'go';
  if (lang === 'JavaScript') return 'javascript';
  return lang.toLowerCase();
};
