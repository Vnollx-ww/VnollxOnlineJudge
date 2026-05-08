import { cloneElement, isValidElement, useRef, useState, type CSSProperties, type ChangeEvent, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { X } from 'lucide-react';
import Button from '../Button';

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

  return (
    <div className={`overflow-hidden rounded-[28px] border border-blue-100/80 bg-white shadow-xl shadow-blue-100/40 ring-1 ring-white/80 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 via-indigo-50 to-violet-50">
              {columns.map((column, index) => (
                <th
                  key={column.key || String(column.dataIndex || index)}
                  className={`whitespace-nowrap border-b border-blue-100 px-5 font-bold uppercase tracking-wide text-slate-600 ${size === 'small' ? 'py-3 text-sm' : 'py-4 text-sm'}`}
                  style={{ width: column.width }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length} className="px-5 py-12 text-center text-slate-500"><Spin spinning /> 加载中...</td></tr>
            ) : dataSource.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-12"><Empty description="暂无数据" /></td></tr>
            ) : dataSource.map((record, rowIndex) => (
              <tr key={getKey(record, rowIndex)} className="group transition duration-200 hover:bg-gradient-to-r hover:from-blue-50/70 hover:to-violet-50/50">
                {columns.map((column, columnIndex) => {
                  const value = column.dataIndex ? record[column.dataIndex] : undefined;
                  const content = column.render ? column.render(value, record, rowIndex) : value ?? '-';
                  return (
                    <td
                      key={column.key || String(column.dataIndex || columnIndex)}
                      className={`border-b border-blue-50 px-5 text-slate-700 group-last:border-b-0 ${isActionColumn(column) ? 'text-left align-middle' : ''} ${size === 'small' ? 'py-3 text-sm' : 'py-4 text-sm'}`}
                    >
                      {isActionColumn(column) ? (
                        <div className="inline-flex flex-wrap items-center justify-start gap-1 rounded-2xl bg-slate-50 p-1 ring-1 ring-slate-200/70 [&_button]:h-8 [&_button]:rounded-xl [&_button]:px-2.5 [&_button]:font-semibold [&_button]:text-slate-700 [&_button]:shadow-none [&_button]:ring-0 [&_button:hover]:bg-white [&_button:hover]:text-slate-900 [&_button:hover]:shadow-sm [&_button.text-red-600]:text-red-600 [&_button.text-red-600:hover]:text-red-700">
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
      {pagination ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-blue-50 bg-gradient-to-r from-white to-blue-50/50 px-5 py-4 text-sm text-slate-500">
          <div>{pagination.showTotal ? pagination.showTotal(total) : `共 ${total} 条记录`}</div>
          <div className="flex items-center gap-2">
            {pagination.showSizeChanger ? (
              <select className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition hover:border-blue-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" value={pageSize} onChange={(event) => pagination.onChange?.(1, Number(event.target.value))}>
                {[10, 20, 50, 100].map((sizeOption) => <option key={sizeOption} value={sizeOption}>{sizeOption} 条/页</option>)}
              </select>
            ) : null}
            <Button size="small" variant="outlined" disabled={current <= 1} onClick={() => pagination.onChange?.(current - 1, pageSize)}>上一页</Button>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">{current} / {totalPages}</span>
            <Button size="small" variant="outlined" disabled={current >= totalPages} onClick={() => pagination.onChange?.(current + 1, pageSize)}>下一页</Button>
          </div>
        </div>
      ) : null}
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

export function Tag({ color = 'default', closable = false, onClose, children }: { color?: string; closable?: boolean; onClose?: () => void; children?: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${tagColorMap[color] || tagColorMap.default}`}>{children}{closable ? <button type="button" onClick={onClose} className="rounded-full hover:bg-black/5"><X className="h-3 w-3" /></button> : null}</span>;
}

export function Spin({ spinning, children }: { spinning?: boolean; children?: ReactNode }) {
  if (!children) return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent align-middle" />;
  return <div className="relative">{children}{spinning ? <div className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70 backdrop-blur-sm"><Spin spinning /></div> : null}</div>;
}

export function Card({ title, size: _size, className = '', children }: { title?: ReactNode; size?: string; className?: string; children?: ReactNode }) {
  return <section className={`rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm shadow-slate-200/70 ${className}`}>{title ? <h3 className="mb-4 text-base font-semibold text-slate-800">{title}</h3> : null}{children}</section>;
}

export function Row({ gutter, className = '', children }: { gutter?: number | [number, number]; className?: string; children?: ReactNode }) {
  const gap = Array.isArray(gutter) ? gutter[1] : gutter || 16;
  return <div className={`grid grid-cols-12 ${className}`} style={{ gap }}>{children}</div>;
}

export function Col({ xs = 12, sm, md, lg, span, children }: { xs?: number; sm?: number; md?: number; lg?: number; span?: number; children?: ReactNode }) {
  const value = lg || md || sm || span || xs;
  return <div className="col-span-12" style={{ gridColumn: `span ${Math.min(12, Math.ceil(value / 2))} / span ${Math.min(12, Math.ceil(value / 2))}` }}>{children}</div>;
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

export function Popconfirm({ title, onConfirm, children }: { title?: ReactNode; onConfirm?: () => void; children: ReactElement }) {
  if (!isValidElement(children)) return children;
  return cloneElement(children, { onClick: () => { if (window.confirm(String(title || '确认操作？'))) onConfirm?.(); } } as any);
}

export function ConfirmButton({ message, onConfirm, children }: { message?: ReactNode; onConfirm?: () => void; children: ReactElement }) {
  if (!isValidElement(children)) return children;
  return cloneElement(children, { onClick: () => { if (window.confirm(String(message || '确认操作？'))) onConfirm?.(); } } as any);
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
export function Drawer({ open, onClose, title, children, width = 560 }: { open?: boolean; onClose?: () => void; title?: ReactNode; children?: ReactNode; width?: number }) { return open ? <div className="fixed inset-0 z-[1000]"><div className="absolute inset-0 bg-slate-950/40" onClick={onClose} /><aside className="absolute right-0 top-0 h-full overflow-y-auto bg-white p-6 shadow-2xl" style={{ width }}><div className="mb-4 flex items-center justify-between"><h3 className="text-lg font-semibold">{title}</h3><button onClick={onClose}><X /></button></div>{children}</aside></div> : null; }
export function Tooltip({ children }: { title?: ReactNode; children?: ReactNode }) { return <>{children}</>; }
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
