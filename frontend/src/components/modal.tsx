import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  title?: ReactNode;
  children?: ReactNode;
  width?: number | string;
  destroyOnClose?: boolean;
  className?: string;
  footer?: ReactNode;
  okText?: ReactNode;
  cancelText?: ReactNode;
  centered?: boolean;
  closable?: boolean;
  maskClosable?: boolean;
  confirmLoading?: boolean;
  okButtonProps?: { danger?: boolean; loading?: boolean; disabled?: boolean };
  zIndex?: number;
}

function Modal({
  open,
  onClose,
  onCancel,
  onOk,
  title,
  children,
  width = 520,
  destroyOnClose = false,
  className = '',
  footer,
  okText = '确定',
  cancelText = '取消',
  centered: _centered,
  closable = true,
  maskClosable = true,
  confirmLoading,
  okButtonProps,
  zIndex = 1000,
}: ModalProps) {
  const close = onClose || onCancel;
  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closable) close?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open, close, closable]);

  if (!open && destroyOnClose) return null;

  const handleMaskMouseDown = () => {
    if (maskClosable) close?.();
  };

  const okLoading = confirmLoading || okButtonProps?.loading;
  const okDanger = okButtonProps?.danger;

  return createPortal(
    <div className={`fixed inset-0 ${open ? '' : 'pointer-events-none'}`} style={{ zIndex }} aria-hidden={!open}>
      <div
        className={`absolute inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onMouseDown={handleMaskMouseDown}
      />
      <div className="absolute inset-0 flex items-center justify-center p-4" onMouseDown={handleMaskMouseDown}>
        <div
          role="dialog"
          aria-modal="true"
          className={`relative flex max-h-[calc(100vh-64px)] w-full flex-col overflow-hidden rounded-[28px] bg-white shadow-2xl shadow-slate-900/20 transition-all duration-200 ${open ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0'} ${className}`}
          style={{ maxWidth: width }}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {closable ? (
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 z-10 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="关闭"
            >
              <X className="h-5 w-5" />
            </button>
          ) : null}
          {title ? <div className="shrink-0 border-b border-slate-100 px-6 py-5 text-lg font-semibold text-slate-900">{title}</div> : null}
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/50 p-6">{children}</div>
          {footer !== null && (footer || onOk) ? (
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              {footer || (
                <>
                  <button type="button" onClick={close} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-200">{cancelText}</button>
                  <button
                    type="button"
                    onClick={onOk}
                    disabled={okLoading || okButtonProps?.disabled}
                    className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${okDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {okLoading ? '处理中...' : okText}
                  </button>
                </>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default Modal;
export type { ModalProps };
