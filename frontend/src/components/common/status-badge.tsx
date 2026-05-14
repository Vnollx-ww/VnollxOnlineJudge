import type { CSSProperties, ReactNode } from 'react';
import {
  getCompetitionStatusTone,
  getDifficultyTone,
  getJudgeStatusLabel,
  getJudgeStatusTone,
  getLanguageTone,
  getPassRateTone,
  type BadgeTone,
} from '@/constants/badges';

type BaseProps = {
  className?: string;
  style?: CSSProperties;
  size?: 'sm' | 'md';
  children?: ReactNode;
};

/**
 * 通用胶囊徽章。所有具名状态徽章都基于它构建。
 */
export function ToneBadge({
  tone,
  className = '',
  style,
  size = 'md',
  children,
}: BaseProps & { tone: BadgeTone }) {
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-full font-medium ${padding} ${className}`}
      style={{ backgroundColor: tone.bg, color: tone.color, ...style }}
    >
      {children}
    </span>
  );
}

/** 评测状态徽章。传入英文枚举或中文文案均可。 */
export function JudgeStatusBadge({
  status,
  size,
  className,
  style,
}: BaseProps & { status: string }) {
  const label = getJudgeStatusLabel(status);
  const tone = getJudgeStatusTone(label);
  return (
    <ToneBadge tone={tone} size={size} className={className} style={style}>
      {label}
    </ToneBadge>
  );
}

/** 题目难度徽章。 */
export function DifficultyBadge({
  difficulty,
  size,
  className,
  style,
}: BaseProps & { difficulty?: string }) {
  if (!difficulty) return null;
  return (
    <ToneBadge tone={getDifficultyTone(difficulty)} size={size} className={className} style={style}>
      {difficulty}
    </ToneBadge>
  );
}

/** 比赛状态徽章。 */
export function CompetitionStatusBadge({
  status,
  size,
  className,
  style,
}: BaseProps & { status: string }) {
  return (
    <ToneBadge tone={getCompetitionStatusTone(status)} size={size} className={className} style={style}>
      {status}
    </ToneBadge>
  );
}

/** 编程语言徽章。 */
export function LanguageBadge({
  language,
  size,
  className,
  style,
}: BaseProps & { language?: string }) {
  if (!language) return null;
  return (
    <ToneBadge tone={getLanguageTone(language)} size={size} className={className} style={style}>
      {language}
    </ToneBadge>
  );
}

/**
 * 通过率徽章。
 * @param submitCount 提交次数
 * @param passCount 通过次数
 */
export function PassRateBadge({
  submitCount,
  passCount,
  size,
  className,
  style,
}: BaseProps & { submitCount: number; passCount: number }) {
  const rate = submitCount > 0 ? Math.round((passCount / submitCount) * 10000) / 100 : 0;
  return (
    <ToneBadge tone={getPassRateTone(rate)} size={size} className={className} style={style}>
      {rate}%
    </ToneBadge>
  );
}
