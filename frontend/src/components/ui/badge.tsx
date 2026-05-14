import type { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  count?: number;
  showZero?: boolean;
  overflowCount?: number;
  dot?: boolean;
  size?: 'default' | 'small';
  offset?: [number, number];
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
  count = 0,
  showZero = false,
  overflowCount = 99,
  dot = false,
  size = 'default',
  offset,
  className = '',
  style,
  children,
}) => {
  const visible = dot || count > 0 || (showZero && count === 0);
  const displayCount = count > overflowCount ? `${overflowCount}+` : String(count);

  const badgeStyle: CSSProperties = {
    ...style,
    ...(offset
      ? { transform: `translate(${offset[0]}px, ${offset[1]}px)` }
      : {}),
  };

  const sizeClass = size === 'small' ? 'h-4 min-w-[16px] px-1 text-[10px]' : 'h-5 min-w-[20px] px-1.5 text-xs';

  if (!children) {
    return visible ? (
      <span
        className={`inline-flex items-center justify-center rounded-full bg-red-500 text-white font-semibold leading-none ${dot ? 'h-2 w-2 min-w-0' : sizeClass} ${className}`}
        style={badgeStyle}
      >
        {dot ? '' : displayCount}
      </span>
    ) : null;
  }

  return (
    <span className={`relative inline-flex ${className}`}>
      {children}
      {visible ? (
        <span
          className={`absolute -right-1 -top-1 inline-flex items-center justify-center rounded-full bg-red-500 text-white font-semibold leading-none ring-2 ring-white ${dot ? 'h-2 w-2 min-w-0' : sizeClass}`}
          style={badgeStyle}
        >
          {dot ? '' : displayCount}
        </span>
      ) : null}
    </span>
  );
};

export default Badge;
export type { BadgeProps };
