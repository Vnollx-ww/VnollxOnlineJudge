import { type ReactNode } from 'react';

interface FormItemProps {
  label?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

function FormItem({ label, error, children, className = '' }: FormItemProps) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? <div className="px-1 text-sm font-medium text-slate-600">{label}</div> : null}
      {children}
      {error ? <div className="px-1 text-sm text-red-600">{error}</div> : null}
    </div>
  );
}

export default FormItem;
export type { FormItemProps };
