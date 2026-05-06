import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, X } from 'lucide-react';

type SelectValue = string | number;

export interface SelectOption<T extends SelectValue = SelectValue> {
  value: T;
  label: ReactNode;
  disabled?: boolean;
  group?: string;
}

interface SelectProps<T extends SelectValue = SelectValue> {
  value?: T | T[] | null;
  onChange?: (value: any) => void;
  options?: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
  allowClear?: boolean;
  disabled?: boolean;
  size?: 'small' | 'middle' | 'large';
  mode?: 'multiple';
  showSearch?: boolean;
  loading?: boolean;
  optionFilterProp?: string;
  filterOption?: (input: string, option: unknown) => boolean;
}

const sizeClassMap = {
  small: 'min-h-8 px-3 py-1.5 text-sm',
  middle: 'min-h-10 px-3.5 py-2 text-sm',
  large: 'min-h-11 px-4 py-2.5 text-base',
};

function CustomSelect<T extends SelectValue = SelectValue>({
  value,
  onChange,
  options = [],
  placeholder = '请选择',
  className = '',
  style,
  allowClear = false,
  disabled = false,
  size = 'middle',
  mode,
  showSearch = false,
  loading: _loading = false,
  optionFilterProp: _optionFilterProp,
  filterOption: _filterOption,
}: SelectProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({});
  const multiple = mode === 'multiple';

  const selectedValues = useMemo<T[]>(() => {
    if (Array.isArray(value)) return value;
    return value === undefined || value === null ? [] : [value];
  }, [value]);

  const selectedOptions = options.filter((item) => selectedValues.includes(item.value));
  const hasValue = selectedValues.length > 0;

  const filteredOptions = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!showSearch || !normalizedKeyword) return options;
    return options.filter((item) => String(item.label).toLowerCase().includes(normalizedKeyword));
  }, [keyword, options, showSearch]);

  const groupedOptions = useMemo(() => {
    return filteredOptions.reduce<Array<{ group?: string; options: SelectOption<T>[] }>>((groups, option) => {
      const last = groups[groups.length - 1];
      if (last && last.group === option.group) {
        last.options.push(option);
      } else {
        groups.push({ group: option.group, options: [option] });
      }
      return groups;
    }, []);
  }, [filteredOptions]);

  const updateDropdownPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 8,
      left: rect.left,
      minWidth: rect.width,
      zIndex: 9999,
    });
  }, []);

  useLayoutEffect(() => {
    if (open) updateDropdownPosition();
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return;
    const handleScroll = () => updateDropdownPosition();
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !dropdownRef.current?.contains(target)) {
        setOpen(false);
        setKeyword('');
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, []);

  const emitChange = (nextValue: T | T[] | undefined) => {
    onChange?.(nextValue);
  };

  const handleSelect = (option: SelectOption<T>) => {
    if (option.disabled) return;

    if (multiple) {
      const nextValues = selectedValues.includes(option.value)
        ? selectedValues.filter((item) => item !== option.value)
        : [...selectedValues, option.value];
      emitChange(nextValues.length ? nextValues : undefined);
      return;
    }

    emitChange(option.value);
    setOpen(false);
    setKeyword('');
  };

  const handleClear = () => {
    emitChange(multiple ? ([] as T[]) : undefined);
    setKeyword('');
  };

  const displayText = multiple
    ? selectedOptions.map((item) => item.label).join('、')
    : selectedOptions[0]?.label;

  return (
    <div ref={rootRef} className={`relative inline-block align-middle ${className}`} style={style}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((current) => !current)}
        className={`group flex w-full items-center justify-between gap-2 rounded-2xl border bg-white/90 shadow-sm backdrop-blur transition-all duration-200 ${sizeClassMap[size]} ${
          open
            ? 'border-blue-400 ring-4 ring-blue-100'
            : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
        } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        style={{ color: hasValue ? 'var(--gemini-text-primary)' : 'var(--gemini-text-tertiary)' }}
      >
        <span className="min-w-0 flex-1 truncate text-left">
          {hasValue ? displayText : placeholder}
        </span>
        {allowClear && hasValue && !disabled ? (
          <span
            role="button"
            tabIndex={0}
            className="rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            onClick={(event) => {
              event.stopPropagation();
              handleClear();
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                event.stopPropagation();
                handleClear();
              }
            }}
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div ref={dropdownRef} className="min-w-max overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur-xl" style={dropdownStyle}>
          {showSearch && (
            <div className="border-b border-slate-100 p-2">
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                placeholder="搜索..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                autoFocus
              />
            </div>
          )}
          <div className="select-dropdown-scroll max-h-72 overflow-auto p-1.5">
            {groupedOptions.length ? (
              groupedOptions.map((group, groupIndex) => (
                <div key={`${group.group ?? 'default'}-${groupIndex}`}>
                  {group.group && (
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {group.group}
                    </div>
                  )}
                  {group.options.map((option) => {
                    const active = selectedValues.includes(option.value);
                    return (
                      <button
                        key={String(option.value)}
                        type="button"
                        disabled={option.disabled}
                        onClick={() => handleSelect(option)}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? 'bg-blue-50 font-medium text-blue-700'
                            : 'text-slate-700 hover:bg-slate-50 hover:text-blue-700'
                        } ${option.disabled ? 'cursor-not-allowed opacity-50' : ''}`}
                      >
                        <span className="min-w-0 truncate">{option.label}</span>
                        {active && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            ) : (
              <div className="px-3 py-8 text-center text-sm text-slate-400">暂无选项</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default CustomSelect;
