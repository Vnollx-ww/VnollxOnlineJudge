import React, { ReactNode } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  HardDrive,
  Info,
  Layers,
  Loader2,
  X,
  XCircle,
} from 'lucide-react';

// --- 类型定义保持不变 ---
export type JudgeOutcomeVariant = 'success' | 'info' | 'warning' | 'error';
export interface JudgeOutcomeMetrics {
  timeMs?: number;
  memoryMb?: number;
  passCount?: number;
  testCount?: number;
}
export interface JudgeOutcomeData {
  variant: JudgeOutcomeVariant;
  source: 'submit' | 'test';
  headline: string;
  bodyText?: string;
  metrics?: JudgeOutcomeMetrics;
  errorInfo?: string;
}

export function mapJudgeStatusToVariant(status: string): JudgeOutcomeVariant {
  if (status === '答案正确' || status === 'Accepted') return 'success';
  if (status === '评测中' || status === '等待评测' || status === 'Judging' || status === 'Pending') return 'info';
  if (status === '编译错误' || status === 'Compile Error') return 'warning';
  return 'error';
}

const CONFIG: Record<
  JudgeOutcomeVariant,
  { accent: string; soft: string; icon: any }
> = {
  success: {
    accent: 'var(--gemini-success)',
    soft: 'rgba(34, 197, 94, 0.05)',
    icon: CheckCircle2,
  },
  info: {
    accent: 'var(--gemini-info)',
    soft: 'rgba(59, 130, 246, 0.05)',
    icon: Info,
  },
  warning: {
    accent: 'var(--gemini-warning)',
    soft: 'rgba(245, 158, 11, 0.05)',
    icon: AlertTriangle,
  },
  error: {
    accent: 'var(--gemini-error)',
    soft: 'rgba(239, 68, 68, 0.05)',
    icon: XCircle,
  },
};

interface JudgeOutcomeCardProps {
  data: JudgeOutcomeData;
  onClose: () => void;
}

export default function JudgeOutcomeCard({ data, onClose }: JudgeOutcomeCardProps) {
  const { variant, source, headline, bodyText, metrics, errorInfo } = data;
  const cfg = CONFIG[variant];
  const Icon = cfg.icon;
  
  const isJudging = headline === '评测中' || headline === '等待评测';
  const sourceLabel = source === 'submit' ? '提交评测报告' : '本地样例测试';
  
  const total = metrics?.testCount ?? 0;
  const passed = metrics?.passCount ?? 0;
  const ratio = total > 0 ? Math.min(100, Math.round((passed / total) * 100)) : 0;
  const allPassed = total > 0 && passed === total;

  const showTime = metrics?.timeMs !== undefined;
  const showMemory = metrics?.memoryMb !== undefined;
  const showTests = metrics != null && total > 0;
  const metricCount = (showTime ? 1 : 0) + (showMemory ? 1 : 0) + (showTests ? 1 : 0);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl border transition-all duration-300"
      style={{
        borderColor: 'var(--gemini-border)',
        backgroundColor: 'var(--gemini-surface)',
        // 使用更轻柔的阴影，取消显眼的色条
        boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
      }}
    >
      {/* 【改动】删除了顶部的绝对定位渐变条 div */}

      <div className="p-6 sm:p-8">
        <div className="flex flex-col items-start gap-6 sm:flex-row">
          {/* 状态图标：改用超轻柔底色，保持呼吸感但取消强光晕 */}
          <div
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
              isJudging ? 'animate-pulse' : ''
            }`}
            style={{ backgroundColor: cfg.soft, color: cfg.accent }}
          >
            {isJudging ? (
              <Loader2 className="h-7 w-7 animate-spin" strokeWidth={2} />
            ) : (
              <Icon className="h-7 w-7" strokeWidth={2.25} />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {/* 标题部分：更紧凑 */}
            <div className="flex flex-col gap-0.5">
              <span
                className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-50"
                style={{ color: 'var(--gemini-text-primary)' }}
              >
                {sourceLabel}
              </span>
              <h3
                className="text-2xl font-bold tracking-tight"
                style={{ color: 'var(--gemini-text-primary)' }}
              >
                {headline}
              </h3>
            </div>

            {bodyText && !metrics && (
              <p className="mt-3 text-sm leading-relaxed opacity-70" style={{ color: 'var(--gemini-text-secondary)' }}>
                {bodyText}
              </p>
            )}

            {/* 指标卡片：取消强烈的色边，改用极简风格 */}
            {metrics && (
              <div className={`mt-6 grid gap-3 ${
                metricCount === 3 ? 'grid-cols-1 sm:grid-cols-3' : 
                metricCount === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'
              }`}>
                {showTime && (
                  <MetricTile
                    icon={<Clock className="h-3.5 w-3.5" />}
                    label="耗时"
                    value={`${metrics.timeMs}`}
                    unit="ms"
                  />
                )}
                {showMemory && (
                  <MetricTile
                    icon={<HardDrive className="h-3.5 w-3.5" />}
                    label="内存"
                    value={`${metrics.memoryMb}`}
                    unit="MB"
                  />
                )}
                {showTests && (
                  <div className="flex flex-col justify-between rounded-xl border border-transparent bg-gray-50/50 p-4 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-50">
                      <Layers className="h-3.5 w-3.5" />
                      测试点通过
                    </div>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-2xl font-bold tabular-nums">
                        {passed}
                      </span>
                      <span className="text-sm opacity-30">/ {total}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 日志区：取消虚线边框，改用实线浅色边框 */}
            {errorInfo && (
              <div className="mt-6">
                <div
                  className="max-h-48 overflow-y-auto rounded-xl border p-4"
                  style={{
                    backgroundColor: 'var(--gemini-bg-alt)',
                    borderColor: 'var(--gemini-border-light)',
                  }}
                >
                  <pre className="m-0 font-mono text-xs leading-relaxed opacity-80" style={{ color: 'var(--gemini-text-secondary)' }}>
                    {errorInfo}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-2 opacity-30 transition-opacity hover:opacity-100"
            style={{ color: 'var(--gemini-text-primary)' }}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MetricTile({
  icon,
  label,
  value,
  unit,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <div className="flex flex-col rounded-xl bg-gray-50/50 p-4 dark:bg-white/[0.02]">
      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider opacity-50">
        {icon}
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <p className="text-2xl font-bold tabular-nums tracking-tight">
          {value}
        </p>
        <span className="text-xs font-bold opacity-30">{unit}</span>
      </div>
    </div>
  );
}