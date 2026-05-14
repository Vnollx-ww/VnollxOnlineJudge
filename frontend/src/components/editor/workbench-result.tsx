import { Clock, HardDrive, Layers, Loader2 } from 'lucide-react';

export type WorkbenchResultVariant = 'success' | 'info' | 'warning' | 'error';

/** 把后端返回的评测状态映射到结果展示的颜色变体 */
export function mapJudgeStatusToVariant(status: string): WorkbenchResultVariant {
  if (status === '答案正确' || status === 'Accepted') return 'success';
  if (status === '评测中' || status === '等待评测' || status === 'Judging' || status === 'Pending') return 'info';
  return 'error';
}

export interface WorkbenchResultMetrics {
  timeMs?: number;
  memoryMb?: number;
  passCount?: number;
  testCount?: number;
}

export interface WorkbenchResultData {
  variant: WorkbenchResultVariant;
  source: 'submit' | 'test';
  /** 状态文本：答案正确 / 答案错误 / 评测中 / ... */
  headline: string;
  /** 简短说明，例如 "答案错误：实际输出与期望输出不一致" */
  description?: string;
  /** 自定义测试时直接展示程序输出 */
  bodyText?: string;
  metrics?: WorkbenchResultMetrics;
  errorInfo?: string;
  /** 自测时的输入 / 预期 / 实际，便于做 diff 展示 */
  diff?: {
    input?: string;
    expected?: string;
    actual?: string;
  };
}

const COLOR: Record<WorkbenchResultVariant, { fg: string; bgTop: string; bgBottom: string }> = {
  success: {
    fg: 'var(--gemini-success, #16a34a)',
    bgTop: 'rgba(22, 163, 74, 0.12)',
    bgBottom: 'rgba(22, 163, 74, 0.06)',
  },
  info: {
    fg: 'var(--gemini-info, #1a73e8)',
    bgTop: 'rgba(26, 115, 232, 0.12)',
    bgBottom: 'rgba(26, 115, 232, 0.06)',
  },
  warning: {
    fg: 'var(--gemini-warning, #d97706)',
    bgTop: 'rgba(217, 119, 6, 0.12)',
    bgBottom: 'rgba(217, 119, 6, 0.06)',
  },
  error: {
    fg: 'var(--gemini-error, #dc2626)',
    bgTop: 'rgba(220, 38, 38, 0.12)',
    bgBottom: 'rgba(220, 38, 38, 0.06)',
  },
};

interface Props {
  data: WorkbenchResultData;
}

const LABEL_WIDTH = 68;

const WorkbenchResult: React.FC<Props> = ({ data }) => {
  const { variant, headline, description, bodyText, metrics, errorInfo, diff } = data;
  const c = COLOR[variant];
  const isJudging = headline === '评测中' || headline === '等待评测';

  const hasDiffMain = !!(diff && (diff.input || diff.expected !== undefined || diff.actual !== undefined));
  const showDiffSection = hasDiffMain || !!bodyText;
  const hasMemo = !!description || !!errorInfo;

  return (
    <div className="flex flex-col gap-3">
      {/* 状态总览：上方深底标题栏 + 下方浅底说明/错误日志 */}
      <div className="rounded-md overflow-hidden" style={{ color: c.fg }}>
        <div
          className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2"
          style={{ backgroundColor: c.bgTop }}
        >
          <span className="font-semibold flex items-center gap-2">
            {isJudging && <Loader2 className="w-4 h-4 animate-spin" />}
            {headline}
          </span>
          {metrics?.timeMs !== undefined && (
            <InlineMetric icon={<Clock className="w-3.5 h-3.5" />} label="运行时间" value={`${metrics.timeMs}ms`} />
          )}
          {metrics?.memoryMb !== undefined && (
            <InlineMetric icon={<HardDrive className="w-3.5 h-3.5" />} label="占用内存" value={`${metrics.memoryMb}MB`} />
          )}
          {metrics?.testCount != null && metrics.testCount > 0 && (
            <InlineMetric
              icon={<Layers className="w-3.5 h-3.5" />}
              label="通过测试点"
              value={`${metrics.passCount ?? 0} / ${metrics.testCount}`}
            />
          )}
        </div>
        {hasMemo && (
          <div className="px-4 py-2 text-sm" style={{ backgroundColor: c.bgBottom }}>
            {description && <div>{description}</div>}
            {errorInfo && (
              <pre
                className="m-0 mt-1 font-mono text-xs leading-relaxed whitespace-pre-wrap"
                style={{ color: c.fg }}
              >
                {errorInfo}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* 自测输入 / 预期输出 / 实际输出 区（编译错误时不展示） */}
      {showDiffSection && (
        <DiffSection
          input={diff?.input}
          expected={diff?.expected}
          actual={diff?.actual ?? bodyText}
        />
      )}
    </div>
  );
};

const InlineMetric: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <span className="inline-flex items-center gap-1 text-xs" style={{ color: 'var(--gemini-text-secondary, #6b7280)' }}>
    <span className="opacity-70">{icon}</span>
    <span>{label}</span>
    <span className="ml-1 tabular-nums" style={{ color: 'var(--gemini-text-primary, #1f2937)' }}>
      {value}
    </span>
  </span>
);

interface DiffSectionProps {
  input?: string;
  expected?: string;
  actual?: string;
}

const DiffSection: React.FC<DiffSectionProps> = ({ input, expected, actual }) => (
  <div className="flex flex-col gap-2">
    {input !== undefined && (
      <DiffRow label="自测输入" value={input} maxRows={6} />
    )}
    {(expected !== undefined || actual !== undefined) && (
      <div className="flex items-stretch gap-2">
        <div className="flex-auto flex flex-col gap-2 min-w-0">
          {expected !== undefined && (
            <DiffRow label="预期输出" value={expected} maxRows={4} />
          )}
          {actual !== undefined && (
            <DiffRow label="实际输出" value={actual} maxRows={4} />
          )}
        </div>
      </div>
    )}
  </div>
);

const DiffRow: React.FC<{ label: string; value: string; maxRows?: number }> = ({ label, value, maxRows = 4 }) => {
  const lines = value === '' ? 1 : value.split('\n').length;
  const rows = Math.min(maxRows, Math.max(1, lines));
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex-none text-xs pt-1.5"
        style={{ width: LABEL_WIDTH, color: 'var(--gemini-text-secondary, #6b7280)' }}
      >
        {label}
      </span>
      <textarea
        readOnly
        value={value}
        rows={rows}
        className="flex-auto rounded-md font-mono text-xs px-2 py-1.5"
        style={{
          backgroundColor: 'var(--gemini-bg, #f7f8fa)',
          border: '1px solid var(--gemini-border-light, #e5e7eb)',
          color: 'var(--gemini-text-primary, #1f2937)',
          resize: 'none',
          minHeight: 30,
        }}
      />
    </div>
  );
};

export default WorkbenchResult;
