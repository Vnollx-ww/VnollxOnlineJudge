import { cloneElement, isValidElement, useLayoutEffect, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Button from './button';
import Select from './select';

type Key = string | number;

type Column<T> = {
  title: ReactNode;
  dataIndex?: keyof T | string;
  key?: string;
  width?: number | string;
  ellipsis?: boolean;
  render?: (value: any, record: T, index: number) => ReactNode;
  sorter?: (a: T, b: T) => number;
};

type PaginationConfig = {
  current?: number;
  pageSize?: number;
  total?: number;
  showSizeChanger?: boolean;
  showTotal?: (total: number) => ReactNode;
  onChange?: (page: number, pageSize: number) => void;
};

interface TableProps<T extends Record<string, any>> {
  columns: Column<T>[];
  dataSource?: T[];
  rowKey?: keyof T | string | ((record: T) => Key);
  loading?: boolean;
  pagination?: false | PaginationConfig;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  scroll?: unknown;
}

type DataTableColumnConfig<T> = {
  id?: string;
  header: ReactNode;
  width?: number | string;
  cell: (record: T, index: number) => ReactNode;
  action?: boolean;
};

type DataTableColumnProps<T> = DataTableColumnConfig<T>;

export function DataColumn<T extends Record<string, any>>(_: DataTableColumnProps<T>) {
  return null;
}

export function DataTable<T extends Record<string, any>>({
  rows = [],
  rowKey,
  loading = false,
  pagination = false,
  size = 'middle',
  className = '',
  children,
}: {
  rows?: T[];
  rowKey?: keyof T | string | ((record: T) => Key);
  loading?: boolean;
  pagination?: false | PaginationConfig;
  size?: 'small' | 'middle' | 'large';
  className?: string;
  children: ReactNode;
}) {
  const columns = ([] as DataTableColumnConfig<T>[]).concat(
    ...(Array.isArray(children) ? children : [children])
      .filter(isValidElement)
      .map((child) => (child as ReactElement<DataTableColumnProps<T>>).props),
  );
  return (
    <Table<T>
      columns={columns.map((column) => ({
        key: column.id,
        title: column.header,
        width: column.width,
        render: (_: unknown, record: T, index: number) => column.cell(record, index),
        dataIndex: column.action ? 'action' : undefined,
      }))}
      dataSource={rows}
      rowKey={rowKey}
      loading={loading}
      pagination={pagination}
      size={size}
      className={className}
    />
  );
}

export function Table<T extends Record<string, any>>({ columns, dataSource = [], rowKey, loading = false, pagination = false, size = 'middle', className = '' }: TableProps<T>) {
  const current = pagination && pagination.current ? pagination.current : 1;
  const pageSize = pagination && pagination.pageSize ? pagination.pageSize : dataSource.length || 10;
  const total = pagination && pagination.total !== undefined ? pagination.total : dataSource.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const getKey = (record: T, index: number) => {
    if (typeof rowKey === 'function') return rowKey(record);
    if (rowKey) return record[rowKey];
    return record.key ?? index;
  };
  const isActionColumn = (column: Column<T>) => column.key === 'action' || column.dataIndex === 'action' || String(column.title) === '操作';
  const handlePageChange = (page: number, nextPageSize: number) => {
    const scrollY = window.scrollY;
    pagination && pagination.onChange?.(page, nextPageSize);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: scrollY, left: window.scrollX }));
    });
  };
  const renderPagination = (position: 'top' | 'bottom') => pagination ? (
    <div className={`shrink-0 flex flex-wrap items-center justify-between gap-3 bg-gray-50/30 px-6 py-4 text-xs font-medium text-gray-400 ${position === 'bottom' ? 'border-t border-gray-50' : 'border-b border-gray-50'}`}>
      <div>{pagination.showTotal ? pagination.showTotal(total) : `共 ${total} 条记录`}</div>
      <div className="flex items-center gap-2">
        {pagination.showSizeChanger ? (
          <Select
            size="small"
            value={pageSize}
            onChange={(next: number) => handlePageChange(1, next)}
            options={[10, 20, 50, 100].map((sizeOption) => ({ value: sizeOption, label: `${sizeOption} 条/页` }))}
            style={{ width: 100 }}
          />
        ) : null}
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300" disabled={current <= 1} onClick={() => handlePageChange(current - 1, pageSize)}>上一页</button>
        <span className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white">{current} / {totalPages}</span>
        <button type="button" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-300" disabled={current >= totalPages} onClick={() => handlePageChange(current + 1, pageSize)}>下一页</button>
      </div>
    </div>
  ) : null;

  return (
    <div className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="relative min-h-0 flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-white">
            <tr className="border-b border-gray-50 text-[11px] font-bold uppercase tracking-widest text-gray-400 shadow-sm shadow-gray-50">
              {columns.map((column, index) => (
                <th
                  key={column.key || String(column.dataIndex || index)}
                  className={`whitespace-nowrap px-6 font-bold ${isActionColumn(column) ? 'text-left' : ''} ${size === 'small' ? 'py-4' : 'py-4'}`}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-6 py-16 text-center text-sm font-medium text-gray-400"><Spin spinning /> 加载中...</td></tr>
            ) : dataSource.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-6 py-16"><Empty description="暂无数据" /></td></tr>
            ) : dataSource.map((record, rowIndex) => (
              <tr key={getKey(record, rowIndex)} className="group border-b border-gray-50 transition-colors last:border-b-0 hover:bg-blue-50/20">
                {columns.map((column, columnIndex) => {
                  const value = column.dataIndex ? record[column.dataIndex] : undefined;
                  const content = column.render ? column.render(value, record, rowIndex) : value ?? '-';
                  return (
                    <td
                      key={column.key || String(column.dataIndex || columnIndex)}
                      className={`px-6 text-gray-700 ${isActionColumn(column) ? 'text-left align-middle' : ''} ${size === 'small' ? 'py-4 text-sm' : 'py-5 text-sm'}`}
                    >
                      {isActionColumn(column) ? (
                        <div className="flex flex-wrap items-center justify-start gap-1.5 [&_button]:inline-flex [&_button]:h-8 [&_button]:items-center [&_button]:gap-1.5 [&_button]:rounded-full [&_button]:border [&_button]:border-blue-100 [&_button]:bg-blue-50/70 [&_button]:px-3 [&_button]:py-0 [&_button]:text-xs [&_button]:font-semibold [&_button]:text-blue-600 [&_button]:shadow-sm [&_button]:shadow-blue-50/70 [&_button]:transition-all [&_button:hover]:border-blue-200 [&_button:hover]:bg-blue-100 [&_button:hover]:text-blue-700 [&_button:hover]:shadow-blue-100 [&_button:active]:scale-95 [&_button:disabled]:cursor-not-allowed [&_button:disabled]:border-gray-100 [&_button:disabled]:bg-gray-50 [&_button:disabled]:text-gray-300 [&_button:disabled]:shadow-none [&_button.text-red-600]:border-red-100 [&_button.text-red-600]:bg-red-50/80 [&_button.text-red-600]:text-red-600 [&_button.text-red-600]:shadow-red-50/70 [&_button.text-red-600:hover]:border-red-200 [&_button.text-red-600:hover]:bg-red-100 [&_button.text-red-600:hover]:text-red-700 [&_button.text-red-600:hover]:shadow-red-100">
                          {content}
                        </div>
                      ) : content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination('bottom')}
    </div>
  );
}

const tagColorMap: Record<string, string> = {
  red: 'bg-red-50 text-red-700 ring-red-100',
  orange: 'bg-orange-50 text-orange-700 ring-orange-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  blue: 'bg-blue-50 text-blue-700 ring-blue-100',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  error: 'bg-red-50 text-red-700 ring-red-100',
  default: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function Tag({ color = 'default', closable = false, onClose, children, className = '', style }: { color?: string; closable?: boolean; onClose?: () => void; children?: ReactNode; className?: string; style?: CSSProperties }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tagColorMap[color] || tagColorMap.default} ${className}`} style={style}>{children}{closable ? <button type="button" onClick={onClose} className="rounded-full hover:bg-black/5"><X className="h-3 w-3" /></button> : null}</span>;
}

export function Spin({ spinning, children }: { spinning?: boolean; children?: ReactNode }) {
  if (!children) return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent align-middle" />;
  return <div className="relative">{children}{spinning ? <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-sm"><Spin spinning /></div> : null}</div>;
}

export function Card({ title, size: _size, className = '', children }: { title?: ReactNode; size?: string; className?: string; children?: ReactNode }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ${className}`}>{title ? <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3> : null}{children}</section>;
}

function GridRoot({ columns = 1, mediumColumns, largeColumns, className = '', children }: { columns?: number; mediumColumns?: number; largeColumns?: number; className?: string; children?: ReactNode }) {
  const classes = [
    'grid gap-4',
    columns === 2 ? 'grid-cols-2' : columns === 3 ? 'grid-cols-3' : columns === 4 ? 'grid-cols-4' : 'grid-cols-1',
    mediumColumns === 2 ? 'md:grid-cols-2' : mediumColumns === 3 ? 'md:grid-cols-3' : mediumColumns === 4 ? 'md:grid-cols-4' : '',
    largeColumns === 2 ? 'lg:grid-cols-2' : largeColumns === 3 ? 'lg:grid-cols-3' : largeColumns === 4 ? 'lg:grid-cols-4' : '',
    className,
  ].filter(Boolean).join(' ');
  return <div className={classes}>{children}</div>;
}

function GridItem({ span, className = '', children }: { span?: number; className?: string; children?: ReactNode }) {
  const spanClass = span === 2 ? 'col-span-2' : span === 3 ? 'col-span-3' : span === 4 ? 'col-span-4' : '';
  return <div className={`${spanClass} ${className}`}>{children}</div>;
}

export const Grid = Object.assign(GridRoot, { Item: GridItem });

export function Statistic({ title, value, prefix, suffix, precision }: { title?: ReactNode; value?: number | ReactNode; prefix?: ReactNode; suffix?: ReactNode; precision?: number }) {
  const displayValue = typeof value === 'number' && typeof precision === 'number' ? value.toFixed(precision) : value;
  return <div className="flex items-center justify-center gap-3"><span>{prefix}</span><div><div className="text-xs text-slate-500">{title}</div><div className="text-2xl font-bold text-slate-900">{displayValue}{suffix}</div></div></div>;
}

export function Progress({ percent = 0, size: _size }: { percent?: number; size?: string }) {
  return <div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div><span className="text-xs text-slate-500">{percent}%</span></div>;
}

export function Divider() { return <div className="my-5 h-px bg-slate-200" />; }
export function Empty({ description = '暂无数据' }: { description?: ReactNode; image?: ReactNode }) { return <div className="py-8 text-center text-sm text-slate-400">{description}</div>; }
Empty.PRESENTED_IMAGE_SIMPLE = null;

function DescriptionsRoot({ title, children }: { title?: ReactNode; bordered?: boolean; size?: string; column?: number; children?: ReactNode }) {
  return <div>{title ? <h3 className="mb-3 text-base font-semibold text-slate-800">{title}</h3> : null}<div className="grid grid-cols-1 overflow-hidden rounded-2xl border border-slate-200 md:grid-cols-3">{children}</div></div>;
}
function DescriptionItem({ label, children }: { label?: ReactNode; children?: ReactNode }) {
  return <div className="border-b border-r border-slate-100 p-4"><div className="mb-1 text-xs font-semibold text-slate-500">{label}</div><div className="text-sm text-slate-800">{children}</div></div>;
}
export const Descriptions = Object.assign(DescriptionsRoot, { Item: DescriptionItem });

export function ConfirmButton({ message, onConfirm, children }: { message?: ReactNode; onConfirm?: () => void; children: ReactElement }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLSpanElement>(null);
  const [popupStyle, setPopupStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const popupWidth = 288;
      const popupHeight = 158;
      const margin = 12;
      const left = Math.min(Math.max(margin, rect.right - popupWidth), window.innerWidth - popupWidth - margin);
      const bottomTop = rect.bottom + 8;
      const topTop = rect.top - popupHeight - 8;
      const top = bottomTop + popupHeight <= window.innerHeight - margin
        ? bottomTop
        : Math.max(margin, topTop);
      setPopupStyle({ left, top });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  if (!isValidElement(children)) return children;

  const child = children as ReactElement<any>;

  return (
    <span ref={triggerRef} className="inline-flex">
      {cloneElement(child, {
        onClick: (event: React.MouseEvent<HTMLElement>) => {
          child.props.onClick?.(event);
          if (!event.defaultPrevented) setOpen(true);
        },
      })}
      {open ? createPortal(
        <>
          <button type="button" className="fixed inset-0 z-[10000] cursor-default bg-transparent" onClick={() => setOpen(false)} />
          <div className="fixed z-[10001] w-72 overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl shadow-slate-200/80 ring-1 ring-white" style={popupStyle}>
            <div className="bg-gradient-to-r from-red-50 to-orange-50 px-5 py-4">
              <div className="text-sm font-bold text-slate-900">确认操作</div>
              <div className="mt-1 text-sm leading-6 text-slate-600">{message || '确认操作？'}</div>
            </div>
            <div className="flex justify-end gap-2 px-5 py-4">
              <Button size="small" variant="outlined" onClick={() => setOpen(false)}>取消</Button>
              <Button size="small" danger onClick={() => { setOpen(false); onConfirm?.(); }}>确定</Button>
            </div>
          </div>
        </>,
        document.body,
      ) : null}
    </span>
  );
}

class SimpleFormStore {
  values: Record<string, any> = {};
  setFieldsValue(values: Record<string, any>) { this.values = { ...this.values, ...values }; }
  resetFields() { this.values = {}; }
  getFieldsValue() { return this.values; }
}

function FormRoot({ form, onFinish, children, className = '' }: { form?: SimpleFormStore; layout?: string; onFinish?: (values: any) => void; children?: ReactNode; className?: string }) {
  const store = form || new SimpleFormStore();
  const enhance = (node: ReactNode): ReactNode => {
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<any>;
    if (element.type === FormItem && element.props.name) {
      return cloneElement(element, { form: store, key: element.props.name });
    }
    if (element.props?.children) {
      return cloneElement(element, { children: Array.isArray(element.props.children) ? element.props.children.map(enhance) : enhance(element.props.children) });
    }
    return element;
  };
  return <form className={`space-y-4 ${className}`} onSubmit={(event: FormEvent) => { event.preventDefault(); onFinish?.(store.getFieldsValue()); }}>{enhance(children)}</form>;
}
function FormItem({ name, label, children, className = '', form }: { name?: string; label?: ReactNode; rules?: any[]; children?: ReactNode; className?: string; form?: SimpleFormStore }) {
  const child = isValidElement(children) && name ? cloneElement(children as ReactElement<any>, { defaultValue: form?.values[name], onChange: (valueOrEvent: any) => { form!.values[name] = valueOrEvent?.target ? valueOrEvent.target.value : valueOrEvent; } }) : children;
  return <div className={`space-y-1.5 ${className}`}>{label ? <div className="px-1 text-sm font-medium text-slate-600">{label}</div> : null}{child}</div>;
}
export const Form = Object.assign(FormRoot, { Item: FormItem, useForm: () => useState(() => new SimpleFormStore()) });

export function InputNumber({ className = '', ...props }: any) { return <input type="number" className={`h-10 w-full rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${className}`} {...props} />; }
export function Field({ label, children, className = '' }: { label?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label ? <div className="px-1 text-sm font-medium text-slate-600">{label}</div> : null}
      {children}
    </div>
  );
}
export type FilePickerProps = {
  accept?: string;
  disabled?: boolean;
  multiple?: boolean;
  children: ReactElement;
  onFilesSelected: (files: File[]) => void;
};
export function FilePicker({ children, accept, disabled, multiple = false, onFilesSelected }: FilePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const childProps = children.props as { disabled?: boolean };
  const openFileDialog = () => {
    if (!disabled) inputRef.current?.click();
  };
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length) onFilesSelected(multiple ? selectedFiles : selectedFiles.slice(0, 1));
    event.target.value = '';
  };
  return (
    <>
      {cloneElement(children, { onClick: openFileDialog, disabled: disabled || childProps.disabled } as any)}
      <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled} className="hidden" onChange={handleFileChange} />
    </>
  );
}
function ListRoot({ dataSource = [], renderItem, loading = false, locale }: { dataSource?: any[]; renderItem?: (item: any, index: number) => ReactNode; loading?: boolean; locale?: { emptyText?: ReactNode } }) {
  if (loading) return <div className="rounded-2xl border border-slate-100 bg-white p-6 text-center text-sm text-slate-500"><Spin spinning /> 加载中...</div>;
  if (dataSource.length === 0) return <>{locale?.emptyText ?? <Empty description="暂无数据" />}</>;
  return <div className="space-y-2">{dataSource.map((item, index) => <div key={index}>{renderItem?.(item, index)}</div>)}</div>;
}
function ListItem({ children, actions }: { children?: ReactNode; actions?: ReactNode[] }) { return <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-3"><div className="min-w-0 flex-1">{children}</div>{actions?.length ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}</div>; }
function ListItemMeta({ title, description }: { title?: ReactNode; description?: ReactNode }) { return <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-800">{title}</div>{description ? <div className="mt-1 text-sm text-slate-500">{description}</div> : null}</div>; }
ListItem.Meta = ListItemMeta;
export const List = Object.assign(ListRoot, { Item: ListItem });
// Drawer 已迁移至独立文件 ./drawer.tsx
// Tooltip 已迁移至独立文件 ./tooltip.tsx
export function Switch({ checked, defaultChecked, onChange, disabled }: { checked?: boolean; defaultChecked?: boolean; onChange?: (checked: boolean) => void; disabled?: boolean }) {
  const [innerChecked, setInnerChecked] = useState(Boolean(defaultChecked));
  const active = checked ?? innerChecked;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        const next = !active;
        setInnerChecked(next);
        onChange?.(next);
      }}
      className={`relative h-7 w-12 rounded-full transition ${active ? 'bg-blue-600' : 'bg-slate-300'} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? 'left-6' : 'left-1'}`} />
    </button>
  );
}
function CheckboxRoot({ checked, defaultChecked, onChange, children, disabled, className = '' }: { checked?: boolean; defaultChecked?: boolean; value?: any; onChange?: (event: { target: { checked: boolean } }) => void; children?: ReactNode; disabled?: boolean; className?: string }) {
  const [innerChecked, setInnerChecked] = useState(Boolean(defaultChecked));
  const active = checked ?? innerChecked;
  return (
    <label className={`inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700 ${className}`}>
      <input
        type="checkbox"
        checked={active}
        disabled={disabled}
        onChange={(event) => {
          setInnerChecked(event.target.checked);
          onChange?.({ target: { checked: event.target.checked } });
        }}
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      {children}
    </label>
  );
}
function CheckboxGroup({ value = [], onChange, children, className = '' }: { value?: any[]; onChange?: (values: any[]) => void; children?: ReactNode; className?: string }) {
  const enhance = (node: ReactNode): ReactNode => {
    if (Array.isArray(node)) return node.map(enhance);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<any>;
    if (element.type === CheckboxRoot) {
      const childValue = element.props.value;
      return cloneElement(element, {
        checked: value.includes(childValue),
        onChange: (event: { target: { checked: boolean } }) => {
          const next = event.target.checked ? [...value, childValue] : value.filter((item) => item !== childValue);
          onChange?.(next);
          element.props.onChange?.(event);
        },
      });
    }
    return cloneElement(element, {}, enhance(element.props.children));
  };
  return <div className={className}>{enhance(children)}</div>;
}
export const Checkbox = Object.assign(CheckboxRoot, { Group: CheckboxGroup });
export function DatePicker({ value, onChange, showTime: _showTime, placeholder, className = '', style }: { value?: any; onChange?: (value: any, dateString: string) => void; showTime?: boolean; placeholder?: string; className?: string; style?: CSSProperties }) {
  const dateValue = value?.format ? value.format('YYYY-MM-DDTHH:mm') : value ? String(value).slice(0, 16) : '';
  return (
    <input
      type="datetime-local"
      value={dateValue}
      placeholder={placeholder}
      className={`h-10 rounded-2xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 ${className}`}
      style={style}
      onChange={(event) => onChange?.(event.target.value, event.target.value)}
    />
  );
}
export const Typography = {
  Text: ({ children, className = '', code, strong, style }: { children?: ReactNode; className?: string; code?: boolean; strong?: boolean; style?: CSSProperties }) => <span style={style} className={`${code ? 'rounded bg-slate-100 px-1.5 py-0.5 font-mono text-sm text-slate-700' : ''} ${strong ? 'font-semibold' : ''} ${className}`}>{children}</span>,
  Paragraph: ({ children, className = '', style }: { children?: ReactNode; className?: string; style?: CSSProperties }) => <p style={style} className={`leading-6 ${className}`}>{children}</p>,
  Title: ({ children, level, style }: { children?: ReactNode; level?: number; style?: CSSProperties }) => {
    const className = level && level >= 5 ? 'text-base' : 'text-lg';
    return <h3 style={style} className={`${className} font-semibold text-slate-900`}>{children}</h3>;
  },
};
