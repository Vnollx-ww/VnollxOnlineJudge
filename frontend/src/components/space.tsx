import type { CSSProperties, ReactNode } from 'react';

interface SpaceProps {
  direction?: 'horizontal' | 'vertical';
  size?: 'small' | 'middle' | 'large' | number;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'baseline';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const sizeMap: Record<string, number> = {
  small: 8,
  middle: 12,
  large: 24,
};

const alignClassMap: Record<NonNullable<SpaceProps['align']>, string> = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  baseline: 'items-baseline',
};

const Space: React.FC<SpaceProps> = ({
  direction = 'horizontal',
  size = 'small',
  wrap = false,
  align,
  className = '',
  style,
  children,
}) => {
  const gap = typeof size === 'number' ? size : sizeMap[size] ?? 8;
  const baseClass = direction === 'vertical' ? 'flex flex-col' : 'flex flex-row';
  const wrapClass = wrap ? 'flex-wrap' : '';
  const alignClass = align ? alignClassMap[align] : direction === 'horizontal' ? 'items-center' : '';

  return (
    <div
      className={`${baseClass} ${wrapClass} ${alignClass} ${className}`}
      style={{ gap, ...style }}
    >
      {children}
    </div>
  );
};

export default Space;
