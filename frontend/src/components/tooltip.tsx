import { useState, type ReactElement, type ReactNode, cloneElement } from 'react';

interface TooltipProps {
  title?: ReactNode;
  children: ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const placementClass: Record<NonNullable<TooltipProps['placement']>, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
};

const Tooltip: React.FC<TooltipProps> = ({ title, children, placement = 'top', className = '' }) => {
  const [open, setOpen] = useState(false);

  if (!title) return children;

  const childWithEvents = cloneElement(children, {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  } as Record<string, unknown>);

  return (
    <span className={`relative inline-flex ${className}`}>
      {childWithEvents}
      {open ? (
        <span
          role="tooltip"
          className={`pointer-events-none absolute z-[1100] whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs text-white shadow-lg ${placementClass[placement]}`}
        >
          {title}
        </span>
      ) : null}
    </span>
  );
};

export default Tooltip;
export type { TooltipProps };
