import { useState, type CSSProperties } from 'react';
import { ChevronDown, X } from 'lucide-react';

export type TagOption = {
  /** 选项值 / 名称（同时作为唯一 key）。 */
  name: string;
  /** 可选显示标签。默认使用 name。 */
  label?: string;
};

export type TagMultiSelectProps = {
  /** 全部可选项。 */
  options: TagOption[];
  /** 已选项的 name 数组。 */
  value: string[];
  /** 选项切换回调。 */
  onChange: (next: string[]) => void;
  /** 占位文案，未选时显示。 */
  placeholder?: string;
  /** 触发器宽度。默认 240。 */
  triggerWidth?: number | string;
  /** 弹层宽度。默认 360。 */
  panelWidth?: number | string;
  /** 弹层最大高度。默认 18rem (h-72)。 */
  panelMaxHeight?: number | string;
  className?: string;
  style?: CSSProperties;
};

/**
 * 通用标签多选下拉。
 *
 * 取代 `Problems` 中 88 行 inline 的"已选 chip 删除 + 选项网格 + 展开收起"逻辑，
 * 后续 `AdminProblems` 等可直接复用。
 */
export default function TagMultiSelect({
  options,
  value,
  onChange,
  placeholder = '选择标签',
  triggerWidth = 240,
  panelWidth = 360,
  panelMaxHeight = 288,
  className = '',
  style,
}: TagMultiSelectProps) {
  const [open, setOpen] = useState(false);

  const toggle = (name: string) => {
    onChange(value.includes(name) ? value.filter((item) => item !== name) : [...value, name]);
  };

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: triggerWidth, ...style }}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-10 w-full items-center justify-between rounded-full border px-4 text-sm transition-all"
        style={{
          borderColor: open ? 'var(--gemini-accent)' : 'var(--gemini-border)',
          backgroundColor: 'var(--gemini-surface)',
          color: value.length > 0 ? 'var(--gemini-text-primary)' : 'var(--gemini-text-secondary)',
          boxShadow: open ? '0 0 0 3px var(--gemini-accent)' : 'none',
        }}
      >
        <span className="truncate">
          {value.length > 0 ? `已选择 ${value.length} 个标签` : placeholder}
        </span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-30 rounded-2xl border p-4 shadow-xl"
          style={{
            width: panelWidth,
            borderColor: 'var(--gemini-border)',
            backgroundColor: 'var(--gemini-surface)',
          }}
        >
          {value.length > 0 && (
            <div
              className="mb-3 flex flex-wrap gap-2 border-b pb-3"
              style={{ borderColor: 'var(--gemini-border)' }}
            >
              {value.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white"
                  style={{ backgroundColor: '#3b82f6' }}
                >
                  {name}
                  <button
                    type="button"
                    onClick={() => toggle(name)}
                    className="rounded-full hover:bg-white/20"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div
            className="tag-multi-select-scroll flex flex-wrap gap-2 overflow-y-auto pr-2"
            style={{ maxHeight: panelMaxHeight }}
          >
            {options.map((option) => {
              const selected = value.includes(option.name);
              return (
                <button
                  key={option.name}
                  type="button"
                  onClick={() => toggle(option.name)}
                  className="rounded-xl border px-3 py-1.5 text-sm transition-all duration-200"
                  style={{
                    borderColor: selected ? '#93c5fd' : 'var(--gemini-border)',
                    backgroundColor: selected ? '#dbeafe' : 'var(--gemini-surface)',
                    color: selected ? '#1d4ed8' : 'var(--gemini-text-secondary)',
                    boxShadow: selected ? '0 0 0 2px rgba(59, 130, 246, 0.16)' : 'none',
                    fontWeight: selected ? 500 : 400,
                  }}
                >
                  {option.label ?? option.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        .tag-multi-select-scroll::-webkit-scrollbar { width: 4px; }
        .tag-multi-select-scroll::-webkit-scrollbar-track { background: transparent; }
        .tag-multi-select-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .tag-multi-select-scroll::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
