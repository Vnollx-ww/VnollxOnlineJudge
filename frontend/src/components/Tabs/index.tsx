import { type ReactNode } from 'react';

export interface TabItem<T extends string = string> {
  key: T;
  label: ReactNode;
  children?: ReactNode;
}

interface TabsProps<T extends string = string> {
  activeKey: T;
  items: TabItem<T>[];
  onChange?: (key: T) => void;
  centered?: boolean;
  className?: string;
}

function Tabs<T extends string = string>({ activeKey, items, onChange, centered = false, className = '' }: TabsProps<T>) {
  const activeItem = items.find((item) => item.key === activeKey);

  return (
    <div className={className}>
      <div className={`flex gap-2 rounded-full bg-slate-100 p-1 ${centered ? 'justify-center' : ''}`}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange?.(item.key)}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all duration-200 ${
                active
                  ? 'bg-white text-blue-700 shadow-sm shadow-slate-200'
                  : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div>{activeItem?.children}</div>
    </div>
  );
}

export default Tabs;
