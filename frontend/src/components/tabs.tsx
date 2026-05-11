import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react';

interface TabItem<T extends string = string> {
  key: T;
  label: ReactNode;
  children?: ReactNode;
}

interface TabsProps<T extends string = string> {
  activeKey?: T;
  defaultActiveKey?: T;
  onChange?: (key: T) => void;
  centered?: boolean;
  className?: string;
  contentClassName?: string;
  items?: TabItem<T>[];
  children?: ReactNode;
}

function TabsRoot<T extends string = string>({ activeKey, defaultActiveKey, onChange, centered = false, className = '', contentClassName = '', items, children }: TabsProps<T>) {
  const panels = items
    ? items
    : Children.toArray(children)
        .filter(isValidElement)
        .map((child) => {
          const props = (child as ReactElement<TabPanelProps<T>>).props;
          return { key: props.id, label: props.label, children: props.children };
        });
  const tabItems = panels.map((panel) => ({ key: panel.key, label: panel.label, children: panel.children }));
  const [internalActiveKey, setInternalActiveKey] = useState<T | undefined>(defaultActiveKey || tabItems[0]?.key);
  const currentKey = activeKey || internalActiveKey || tabItems[0]?.key;
  const activeItem = tabItems.find((item) => item.key === currentKey);
  const handleChange = (key: T) => {
    if (activeKey === undefined) {
      setInternalActiveKey(key);
    }
    onChange?.(key);
  };

  return (
    <div className={className}>
      <div className={`flex gap-2 rounded-full bg-slate-100 p-1 ${centered ? 'justify-center' : ''}`}>
        {tabItems.map((item) => {
          const active = item.key === currentKey;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => handleChange(item.key)}
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
      <div className={contentClassName}>{activeItem?.children}</div>
    </div>
  );
}

interface TabPanelProps<T extends string = string> {
  id: T;
  label: ReactNode;
  children?: ReactNode;
}

function TabPanel<T extends string = string>(_: TabPanelProps<T>) {
  return null;
}

const Tabs = Object.assign(TabsRoot, { Panel: TabPanel });

export default Tabs;
