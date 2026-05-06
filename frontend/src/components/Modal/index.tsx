import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  width?: number;
  destroyOnClose?: boolean;
  className?: string;
}

function Modal({ open, onClose, title, children, width = 520, destroyOnClose = false, className = '' }: ModalProps) {
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open && destroyOnClose) return null;

  return (
    <div className={`fixed inset-0 z-[1000] ${open ? '' : 'pointer-events-none'}`} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onMouseDown={onClose}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          className={`relative max-h-[calc(100vh-64px)] w-full overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-900/20 transition-all duration-200 ${open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'} ${className}`}
          style={{ maxWidth: width }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="关闭"
          >
            <X className="h-5 w-5" />
          </button>
          {title ? <div className="border-b border-slate-100 px-6 py-5 text-lg font-semibold text-slate-900">{title}</div> : null}
          <div className="max-h-[calc(100vh-64px)] overflow-y-auto p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

export default Modal;
export type { ModalProps };
