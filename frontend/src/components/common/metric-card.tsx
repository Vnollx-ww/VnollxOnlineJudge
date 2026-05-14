import type { CSSProperties, ReactNode } from 'react';

export type MetricCardTone = 'default' | 'subtle' | 'success' | 'warning' | 'error' | 'info';

const TONE_STYLES: Record<MetricCardTone, { bg: string; border: string; label: string; value: string }> = {
  default: {
    bg: 'rgba(255,255,255,0.72)',
    border: 'var(--gemini-border-light)',
    label: 'var(--gemini-text-secondary)',
    value: 'var(--gemini-text-primary)',
  },
  subtle: {
    bg: 'var(--gemini-surface-hover)',
    border: 'var(--gemini-border-light)',
    label: 'var(--gemini-text-secondary)',
    value: 'var(--gemini-text-primary)',
  },
  success: {
    bg: 'var(--gemini-success-bg)',
    border: 'var(--gemini-success)',
    label: 'var(--gemini-success)',
    value: 'var(--gemini-success)',
  },
  warning: {
    bg: 'var(--gemini-warning-bg)',
    border: 'var(--gemini-warning)',
    label: 'var(--gemini-warning)',
    value: 'var(--gemini-warning)',
  },
  error: {
    bg: 'var(--gemini-error-bg)',
    border: 'var(--gemini-error)',
    label: 'var(--gemini-error)',
    value: 'var(--gemini-error)',
  },
  info: {
    bg: 'var(--gemini-info-bg)',
    border: 'var(--gemini-info)',
    label: 'var(--gemini-info)',
    value: 'var(--gemini-info)',
  },
};

export type MetricCardProps = {
  icon?: ReactNode;
  label: ReactNode;
  value: ReactNode;
  tone?: MetricCardTone;
  className?: string;
  style?: CSSProperties;
};

/**
 * 通用指标小卡片：左上图标 + 标签，下方为粗体数值。
 *
 * 取代 `Submissions` / `ProblemDetail` 等页面里散落的：
 *   <div className="rounded-2xl border px-4 py-3" style={{ ... }}>
 *     <div className="flex items-center gap-2 text-xs mb-1">{icon}{label}</div>
 *     <div className="font-semibold">{value}</div>
 *   </div>
 */
export default function MetricCard({
  icon,
  label,
  value,
  tone = 'default',
  className = '',
  style,
}: MetricCardProps) {
  const t = TONE_STYLES[tone];
  return (
    <div
      className={`rounded-2xl border px-4 py-3 ${className}`}
      style={{ backgroundColor: t.bg, borderColor: t.border, ...style }}
    >
      <div className="mb-1 flex items-center gap-2 text-xs" style={{ color: t.label }}>
        {icon}
        <span>{label}</span>
      </div>
      <div className="font-semibold" style={{ color: t.value }}>
        {value}
      </div>
    </div>
  );
}
