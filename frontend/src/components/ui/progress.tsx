import type { CSSProperties } from 'react';

type StrokeColor = string | { '0%'?: string; '100%'?: string };

interface ProgressProps {
  percent?: number;
  showInfo?: boolean;
  status?: 'normal' | 'active' | 'success' | 'exception';
  strokeColor?: StrokeColor;
  trailColor?: string;
  size?: 'default' | 'small' | number;
  className?: string;
  style?: CSSProperties;
  format?: (percent?: number) => React.ReactNode;
}

const STATUS_COLOR: Record<NonNullable<ProgressProps['status']>, string> = {
  normal: '#1677ff',
  active: '#1677ff',
  success: '#22c55e',
  exception: '#ef4444',
};

const resolveStrokeBackground = (color?: StrokeColor, status?: ProgressProps['status']): string => {
  if (typeof color === 'string') return color;
  if (color && typeof color === 'object') {
    const start = color['0%'] ?? '#1677ff';
    const end = color['100%'] ?? start;
    return `linear-gradient(90deg, ${start} 0%, ${end} 100%)`;
  }
  return STATUS_COLOR[status ?? 'normal'];
};

const Progress: React.FC<ProgressProps> = ({
  percent = 0,
  showInfo = true,
  status,
  strokeColor,
  trailColor = '#e5e7eb',
  size = 'default',
  className = '',
  style,
  format,
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const effectiveStatus = status ?? (clamped >= 100 ? 'success' : 'normal');
  const height = typeof size === 'number' ? size : size === 'small' ? 6 : 8;
  const background = resolveStrokeBackground(strokeColor, effectiveStatus);

  const info = format ? format(clamped) : `${Math.round(clamped)}%`;

  return (
    <div className={`flex items-center gap-3 ${className}`} style={style}>
      <div
        className="relative flex-1 overflow-hidden rounded-full"
        style={{ height, backgroundColor: trailColor }}
      >
        <div
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ${effectiveStatus === 'active' ? 'animate-pulse' : ''}`}
          style={{ width: `${clamped}%`, background }}
        />
      </div>
      {showInfo ? (
        <span
          className="shrink-0 text-xs tabular-nums"
          style={{
            color:
              effectiveStatus === 'success'
                ? '#22c55e'
                : effectiveStatus === 'exception'
                  ? '#ef4444'
                  : 'var(--gemini-text-secondary, #64748b)',
          }}
        >
          {info}
        </span>
      ) : null}
    </div>
  );
};

export default Progress;
export type { ProgressProps };
