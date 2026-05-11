import type { CSSProperties, ReactNode } from 'react';

/**
 * - `default`：标题在外壳内顶部、与内容同处一个 padding 区域，适用于"工作区"类页面
 *   （如 Problems、Submissions）。
 * - `card`  ：标题独占一行带下边框，body 与 header 分区，适用于列表卡片页
 *   （如 Competitions、Practices、Ranklist）。
 */
export type PageSurfaceVariant = 'default' | 'card';

export type PageSurfaceProps = {
  /** 页面标题。传 ReactNode 可以自定义图标 + 文字组合。 */
  title?: ReactNode;
  /** 标题右侧操作区（按钮 / 筛选条等）。 */
  extra?: ReactNode;
  /** 标题下方的副标题/描述。 */
  description?: ReactNode;
  /** 是否填满视口高度（仅 `default` variant 默认开启）。 */
  fullHeight?: boolean;
  /** 外壳布局变体。 */
  variant?: PageSurfaceVariant;
  /** body 容器附加 class。 */
  bodyClassName?: string;
  /** body 容器附加 style。 */
  bodyStyle?: CSSProperties;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/**
 * 统一的"Gemini 风格页面外壳"。
 *
 * 取代各页面里重复的：
 *   <div className="flex min-h-[calc(100vh-3rem)] flex-col rounded-3xl p-6"
 *        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}>
 *     <h1 className="text-2xl font-semibold mb-6" style={{ color: 'var(--gemini-text-primary)' }}>...</h1>
 *     ...
 *   </div>
 */
export default function PageSurface({
  title,
  extra,
  description,
  variant = 'default',
  fullHeight,
  bodyClassName = '',
  bodyStyle,
  className = '',
  style,
  children,
}: PageSurfaceProps) {
  const isCard = variant === 'card';
  const enableFullHeight = fullHeight ?? !isCard;
  const containerClass = isCard
    ? `flex flex-col rounded-3xl overflow-hidden ${className}`
    : `flex flex-col rounded-3xl p-6 ${enableFullHeight ? 'min-h-[calc(100vh-3rem)]' : ''} ${className}`;

  const hasHeader = Boolean(title || extra || description);

  return (
    <div
      className={containerClass}
      style={{
        backgroundColor: 'var(--gemini-surface)',
        boxShadow: 'var(--shadow-gemini)',
        ...style,
      }}
    >
      {hasHeader && (
        <header
          className={
            isCard
              ? 'flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center lg:justify-between'
              : 'mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'
          }
          style={isCard ? { borderBottom: '1px solid var(--gemini-border-light)' } : undefined}
        >
          <div className="min-w-0">
            {title ? (
              <h1
                className={isCard ? 'm-0 text-xl font-semibold' : 'text-2xl font-semibold'}
                style={{ color: 'var(--gemini-text-primary)' }}
              >
                {title}
              </h1>
            ) : null}
            {description ? (
              <div className="mt-1 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                {description}
              </div>
            ) : null}
          </div>
          {extra ? <div className="flex shrink-0 flex-wrap items-center gap-3">{extra}</div> : null}
        </header>
      )}
      <div
        className={
          isCard
            ? `flex flex-col ${bodyClassName}`
            : `flex min-h-0 flex-1 flex-col ${bodyClassName}`
        }
        style={bodyStyle}
      >
        {children}
      </div>
    </div>
  );
}
