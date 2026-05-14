import {
  useState,
  useEffect,
  useRef,
  cloneElement,
  type ReactElement,
  type ReactNode,
  type CSSProperties,
} from 'react';

export interface DropdownMenuItem {
  key?: string;
  icon?: ReactNode;
  label?: ReactNode;
  type?: 'divider';
  onClick?: () => void;
  disabled?: boolean;
  danger?: boolean;
}

export type DropdownPlacement =
  | 'topLeft'
  | 'top'
  | 'topRight'
  | 'bottomLeft'
  | 'bottom'
  | 'bottomRight';

export interface DropdownProps {
  menu: { items: DropdownMenuItem[] };
  placement?: DropdownPlacement;
  /** 与 antd 兼容：仅支持 'click' 与 'hover'，默认 'hover'。 */
  trigger?: Array<'click' | 'hover'>;
  disabled?: boolean;
  className?: string;
  children: ReactElement<Record<string, unknown>>;
}

const placementClass: Record<DropdownPlacement, string> = {
  topLeft: 'bottom-full left-0 mb-2 origin-bottom-left',
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2 origin-bottom',
  topRight: 'bottom-full right-0 mb-2 origin-bottom-right',
  bottomLeft: 'top-full left-0 mt-2 origin-top-left',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2 origin-top',
  bottomRight: 'top-full right-0 mt-2 origin-top-right',
};

const Dropdown: React.FC<DropdownProps> = ({
  menu,
  placement = 'bottomLeft',
  trigger = ['hover'],
  disabled = false,
  className = '',
  children,
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);
  const isClick = trigger.includes('click');
  const isHover = trigger.includes('hover');

  useEffect(() => {
    if (!open || !isClick) return undefined;
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isClick]);

  if (disabled) {
    return children;
  }

  const originalProps = children.props as {
    onClick?: (event: React.MouseEvent) => void;
    onMouseEnter?: (event: React.MouseEvent) => void;
    onMouseLeave?: (event: React.MouseEvent) => void;
  };

  const triggerProps: Record<string, unknown> = {};
  if (isClick) {
    triggerProps.onClick = (event: React.MouseEvent) => {
      setOpen((prev) => !prev);
      originalProps.onClick?.(event);
    };
  }
  if (isHover) {
    triggerProps.onMouseEnter = (event: React.MouseEvent) => {
      setOpen(true);
      originalProps.onMouseEnter?.(event);
    };
  }

  const handlePanelLeave = isHover ? () => setOpen(false) : undefined;
  const handleContainerLeave = isHover
    ? () => {
        // 鼠标离开整个容器时关闭
        setOpen(false);
      }
    : undefined;

  const trigger0 = cloneElement(children, triggerProps);

  const panelStyle: CSSProperties = { minWidth: 160 };

  return (
    <span
      ref={containerRef}
      className={`relative inline-flex ${className}`}
      onMouseLeave={handleContainerLeave}
    >
      {trigger0}
      {open ? (
        <div
          role="menu"
          className={`absolute z-[1200] rounded-2xl border border-slate-100 bg-white py-1.5 shadow-xl shadow-slate-300/30 animate-[fadeScaleIn_0.16s_ease-out] ${placementClass[placement]}`}
          style={panelStyle}
          onMouseLeave={handlePanelLeave}
          onMouseEnter={isHover ? () => setOpen(true) : undefined}
        >
          {menu.items.map((item, index) => {
            if (item.type === 'divider') {
              return <div key={item.key ?? `divider-${index}`} className="my-1 h-px bg-slate-100" />;
            }
            const dangerCls = item.danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-slate-100';
            const disabledCls = item.disabled ? 'cursor-not-allowed opacity-50 pointer-events-none' : 'cursor-pointer';
            return (
              <div
                key={item.key ?? index}
                role="menuitem"
                onClick={() => {
                  if (item.disabled) return;
                  item.onClick?.();
                  if (isClick) setOpen(false);
                }}
                className={`flex items-center gap-2 px-3 py-2 text-sm transition ${dangerCls} ${disabledCls}`}
              >
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span className="flex-1 truncate">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </span>
  );
};

export default Dropdown;
