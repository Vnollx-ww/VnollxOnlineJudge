import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'filled' | 'outlined' | 'text' | 'danger';
type ButtonSize = 'small' | 'middle' | 'large';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  icon?: ReactNode;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white shadow-sm shadow-blue-200 hover:bg-blue-700 active:scale-[0.98]',
  filled: 'bg-blue-50 text-blue-700 hover:bg-blue-100 active:scale-[0.98]',
  outlined: 'border border-slate-200 bg-white/80 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:scale-[0.98]',
  text: 'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 active:scale-[0.98]',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100 active:scale-[0.98]',
};

const sizeClassMap: Record<ButtonSize, string> = {
  small: 'h-8 px-3 text-sm',
  middle: 'h-10 px-4 text-sm',
  large: 'h-12 px-6 text-base',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  variant = 'filled',
  size = 'middle',
  block = false,
  loading = false,
  icon,
  disabled,
  className = '',
  children,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-full border border-transparent font-semibold outline-none transition-all duration-200 focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${variantClassMap[variant]} ${sizeClassMap[size]} ${block ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : icon}
      {children}
    </button>
  );
});

Button.displayName = 'Button';

export default Button;
export type { ButtonProps, ButtonSize, ButtonVariant };
