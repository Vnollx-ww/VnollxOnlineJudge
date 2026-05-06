import { forwardRef, type ChangeEvent, type CSSProperties, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { Eye, EyeOff, Search, X } from 'lucide-react';
import { useState } from 'react';

type Size = 'small' | 'middle' | 'large';

interface BaseInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
  size?: Size;
  prefix?: ReactNode;
  suffix?: ReactNode;
  allowClear?: boolean;
  onPressEnter?: () => void;
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  allowClear?: boolean;
  onPressEnter?: () => void;
}

interface SearchProps extends BaseInputProps {
  onSearch?: (value: string) => void;
}

const sizeClassMap: Record<Size, string> = {
  small: 'h-8 px-3 text-sm',
  middle: 'h-10 px-3.5 text-sm',
  large: 'h-11 px-4 text-base',
};

const baseClass = 'w-full border border-slate-200 bg-white/90 text-slate-800 shadow-sm outline-none backdrop-blur transition-all duration-200 placeholder:text-slate-400 hover:border-blue-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400';

const normalizeImportantClasses = (className = '') => className.replace(/!/g, '');

const InputBase = forwardRef<HTMLInputElement, BaseInputProps>(({
  size = 'middle',
  prefix,
  suffix,
  allowClear = false,
  className = '',
  style,
  value,
  onChange,
  onPressEnter,
  type = 'text',
  ...props
}, ref) => {
  const hasAddon = prefix || suffix || allowClear;
  const normalizedClassName = normalizeImportantClasses(className);

  const handleClear = () => {
    const event = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as ChangeEvent<HTMLInputElement>;
    onChange?.(event);
  };

  const inputClassName = hasAddon
    ? `${baseClass} ${sizeClassMap[size]} min-w-0 flex-1 rounded-2xl border-0 bg-transparent px-0 shadow-none hover:border-transparent focus:border-transparent focus:ring-0`
    : `${baseClass} ${sizeClassMap[size]} rounded-2xl ${normalizedClassName}`;

  const input = (
    <input
      ref={ref}
      type={type}
      value={value}
      onChange={onChange}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.key === 'Enter') onPressEnter?.();
      }}
      className={inputClassName}
      style={hasAddon ? undefined : style}
      {...props}
    />
  );

  if (!hasAddon) return input;

  return (
    <div className={`flex items-center gap-2 rounded-2xl border border-slate-200 bg-white/90 px-3.5 shadow-sm backdrop-blur transition-all duration-200 hover:border-blue-300 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 ${props.disabled ? 'cursor-not-allowed bg-slate-50 opacity-70' : ''} ${normalizedClassName}`} style={style as CSSProperties}>
      {prefix && <span className="shrink-0 text-slate-400">{prefix}</span>}
      {input}
      {allowClear && value ? (
        <button type="button" onClick={handleClear} className="shrink-0 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      {suffix && <span className="shrink-0 text-slate-400">{suffix}</span>}
    </div>
  );
});

InputBase.displayName = 'Input';

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({
  allowClear = false,
  className = '',
  value,
  onChange,
  onPressEnter,
  style,
  ...props
}, ref) => {
  const normalizedClassName = normalizeImportantClasses(className);
  const handleClear = () => {
    const event = {
      target: { value: '' },
      currentTarget: { value: '' },
    } as ChangeEvent<HTMLTextAreaElement>;
    onChange?.(event);
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          props.onKeyDown?.(event);
          if (event.key === 'Enter') onPressEnter?.();
        }}
        className={`${baseClass} min-h-24 resize-y rounded-2xl px-4 py-3 ${allowClear ? 'pr-9' : ''} ${normalizedClassName}`}
        style={style}
        {...props}
      />
      {allowClear && value ? (
        <button type="button" onClick={handleClear} className="absolute right-3 top-3 rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
});

TextArea.displayName = 'TextArea';

const SearchInput = forwardRef<HTMLInputElement, SearchProps>(({ onSearch, onPressEnter, suffix, ...props }, ref) => {
  const triggerSearch = () => onSearch?.(String(props.value ?? ''));

  return (
    <InputBase
      ref={ref}
      prefix={<Search className="h-4 w-4" />}
      suffix={suffix}
      onPressEnter={() => {
        onPressEnter?.();
        triggerSearch();
      }}
      {...props}
    />
  );
});

SearchInput.displayName = 'Search';

const PasswordInput = forwardRef<HTMLInputElement, BaseInputProps>((props, ref) => {
  const [visible, setVisible] = useState(false);

  return (
    <InputBase
      ref={ref}
      {...props}
      type={visible ? 'text' : 'password'}
      suffix={
        <button type="button" onClick={() => setVisible((current) => !current)} className="rounded-full p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
});

PasswordInput.displayName = 'Password';

const Input = InputBase as typeof InputBase & {
  TextArea: typeof TextArea;
  Search: typeof SearchInput;
  Password: typeof PasswordInput;
};

Input.TextArea = TextArea;
Input.Search = SearchInput;
Input.Password = PasswordInput;

export default Input;
export { TextArea, SearchInput as Search, PasswordInput as Password };
