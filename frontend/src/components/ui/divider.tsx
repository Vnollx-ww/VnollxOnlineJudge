import type { CSSProperties, ReactNode } from 'react';

interface DividerProps {
  type?: 'horizontal' | 'vertical';
  orientation?: 'left' | 'right' | 'center';
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

const Divider: React.FC<DividerProps> = ({ type = 'horizontal', orientation = 'center', className = '', style, children }) => {
  if (type === 'vertical') {
    return (
      <span
        className={`inline-block w-px self-stretch bg-slate-200 mx-2 ${className}`}
        style={style}
      />
    );
  }

  if (!children) {
    return <hr className={`my-4 border-0 border-t border-slate-200 ${className}`} style={style} />;
  }

  const justify =
    orientation === 'left' ? 'justify-start' : orientation === 'right' ? 'justify-end' : 'justify-center';

  return (
    <div className={`my-4 flex items-center gap-3 text-xs text-slate-500 ${justify} ${className}`} style={style}>
      <span className="h-px flex-1 bg-slate-200" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-slate-200" />
    </div>
  );
};

export default Divider;
export type { DividerProps };
