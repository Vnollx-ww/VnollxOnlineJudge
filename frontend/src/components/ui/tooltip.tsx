import { useState, useRef, useLayoutEffect, type ReactElement, type ReactNode, cloneElement } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'title' | 'children'> {
  title?: ReactNode;
  children: ReactElement;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

const Tooltip: React.FC<TooltipProps> = ({ title, children, placement = 'top', className = '', ...rest }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const tipRect = tipRef.current?.getBoundingClientRect();
    const tw = tipRect?.width ?? 0;
    const th = tipRect?.height ?? 0;
    const gap = 6;
    let top = 0;
    let left = 0;
    switch (placement) {
      case 'top':
        top = rect.top - th - gap;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'bottom':
        top = rect.bottom + gap;
        left = rect.left + rect.width / 2 - tw / 2;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.left - tw - gap;
        break;
      case 'right':
        top = rect.top + rect.height / 2 - th / 2;
        left = rect.right + gap;
        break;
    }
    setPos({ top, left });
  }, [open, placement, title]);

  if (!title) {
    return (
      <span ref={wrapperRef} className={`relative inline-flex ${className}`} {...rest}>
        {children}
      </span>
    );
  }

  const childWithEvents = cloneElement(children, {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  } as Record<string, unknown>);

  return (
    <span ref={wrapperRef} className={`relative inline-flex ${className}`} {...rest}>
      {childWithEvents}
      {open && typeof document !== 'undefined'
        ? createPortal(
            <span
              ref={tipRef}
              role="tooltip"
              style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999, position: 'fixed' }}
              className="pointer-events-none z-[1100] whitespace-nowrap rounded-lg bg-slate-900/90 px-2.5 py-1 text-xs text-white shadow-lg"
            >
              {title}
            </span>,
            document.body
          )
        : null}
    </span>
  );
};

export default Tooltip;
export type { TooltipProps };
