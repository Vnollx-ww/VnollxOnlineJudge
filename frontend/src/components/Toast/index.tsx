import { CheckCircle2, XCircle } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastState {
  type: ToastType;
  content: string;
}

interface ToastProps {
  toast: ToastState | null;
}

function Toast({ toast }: ToastProps) {
  if (!toast) return null;

  const success = toast.type === 'success';

  return (
    <div className="fixed left-1/2 top-6 z-[1200] -translate-x-1/2 animate-slide-up">
      <div className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium shadow-xl backdrop-blur-xl ${
        success
          ? 'border-emerald-100 bg-emerald-50/95 text-emerald-700'
          : 'border-red-100 bg-red-50/95 text-red-700'
      }`}
      >
        {success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {toast.content}
      </div>
    </div>
  );
}

export default Toast;
