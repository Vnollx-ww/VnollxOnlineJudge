import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { acquireBodyScrollLock, releaseBodyScrollLock } from '@/utils/bodyScrollLock';

interface DrawerProps {
  open?: boolean;
  onClose?: () => void;
  title?: ReactNode;
  placement?: 'right' | 'left' | 'top' | 'bottom';
  width?: number | string;
  height?: number | string;
  children?: ReactNode;
  destroyOnClose?: boolean;
  className?: string;
  closable?: boolean;
  maskClosable?: boolean;
}

const Drawer: React.FC<DrawerProps> = ({
  open,
  onClose,
  title,
  placement = 'right',
  width = 480,
  height = 320,
  children,
  destroyOnClose = false,
  className = '',
  closable = true,
  maskClosable = true,
}) => {
  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) onClose?.();
    };
    document.addEventListener('keydown', handleKeyDown);
    acquireBodyScrollLock();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      releaseBodyScrollLock();
    };
  }, [open, onClose, closable]);

  if (!open && destroyOnClose) return null;

  const isHorizontal = placement === 'left' || placement === 'right';
  const dimension = isHorizontal
    ? { width: typeof width === 'number' ? `${width}px` : width }
    : { height: typeof height === 'number' ? `${height}px` : height };

  const positionClass = {
    right: `right-0 top-0 h-full ${open ? 'translate-x-0' : 'translate-x-full'}`,
    left: `left-0 top-0 h-full ${open ? 'translate-x-0' : '-translate-x-full'}`,
    top: `left-0 top-0 w-full ${open ? 'translate-y-0' : '-translate-y-full'}`,
    bottom: `left-0 bottom-0 w-full ${open ? 'translate-y-0' : 'translate-y-full'}`,
  }[placement];

  return createPortal(
    <div className={`fixed inset-0 z-[1000] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onMouseDown={() => maskClosable && onClose?.()}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`absolute flex flex-col bg-white shadow-2xl transition-transform duration-300 ${positionClass} ${className}`}
        style={dimension}
      >
        {(title || closable) ? (
          <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
            <div className="text-base font-semibold text-slate-900">{title}</div>
            {closable ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
};

export default Drawer;
export type { DrawerProps };
