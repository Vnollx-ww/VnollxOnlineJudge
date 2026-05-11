import { useState, useEffect, useRef, type ReactElement, type ReactNode, cloneElement } from 'react';
import { AlertCircle } from 'lucide-react';

interface PopconfirmProps {
  title?: ReactNode;
  description?: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  onConfirm?: () => void;
  onCancel?: () => void;
  okButtonProps?: { danger?: boolean; loading?: boolean };
  placement?: 'top' | 'bottom';
  children: ReactElement<Record<string, unknown>>;
  disabled?: boolean;
}

const Popconfirm: React.FC<PopconfirmProps> = ({
  title,
  description,
  okText = '确定',
  cancelText = '取消',
  onConfirm,
  onCancel,
  okButtonProps,
  placement = 'top',
  children,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        onCancel?.();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onCancel]);

  const triggerWithClick = cloneElement(children, {
    onClick: (event: React.MouseEvent) => {
      if (disabled) return;
      event.stopPropagation();
      setOpen((prev) => !prev);
      // Forward original click handler if exists
      const originalOnClick = (children.props as { onClick?: (e: React.MouseEvent) => void }).onClick;
      originalOnClick?.(event);
    },
  } as Record<string, unknown>);

  const handleConfirm = () => {
    onConfirm?.();
    setOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  const posClass =
    placement === 'top'
      ? 'bottom-full left-1/2 -translate-x-1/2 mb-2'
      : 'top-full left-1/2 -translate-x-1/2 mt-2';

  return (
    <span ref={containerRef} className="relative inline-flex">
      {triggerWithClick}
      {open ? (
        <div
          role="dialog"
          className={`absolute z-[1100] w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-300/30 ${posClass}`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <div className="flex-1">
              {title ? <div className="text-sm font-semibold text-slate-900">{title}</div> : null}
              {description ? <div className="mt-1 text-xs text-slate-500">{description}</div> : null}
            </div>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={okButtonProps?.loading}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold text-white transition disabled:opacity-60 ${okButtonProps?.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {okButtonProps?.loading ? '处理中...' : okText}
            </button>
          </div>
        </div>
      ) : null}
    </span>
  );
};

export default Popconfirm;
export type { PopconfirmProps };
