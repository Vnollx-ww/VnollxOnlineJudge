import { useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Select from './select';

export interface PaginationProps {
  current: number;
  total: number;
  pageSize: number;
  onChange?: (page: number, pageSize: number) => void;
  showQuickJumper?: boolean;
  showSizeChanger?: boolean;
  pageSizeOptions?: string[];
  showTotal?: (total: number, range: [number, number]) => ReactNode;
  className?: string;
}

const buildPageList = (current: number, totalPages: number): (number | 'ellipsis')[] => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const result: (number | 'ellipsis')[] = [1];
  if (current > 4) result.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  for (let i = start; i <= end; i++) result.push(i);
  if (current < totalPages - 3) result.push('ellipsis');
  result.push(totalPages);
  return result;
};

const Pagination: React.FC<PaginationProps> = ({
  current,
  total,
  pageSize,
  onChange,
  showQuickJumper = false,
  showSizeChanger = false,
  pageSizeOptions = ['10', '20', '50', '100'],
  showTotal,
  className = '',
}) => {
  const [jumpValue, setJumpValue] = useState('');
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safeCurrent = Math.min(Math.max(1, current), totalPages);

  const go = (page: number) => {
    if (page < 1 || page > totalPages || page === safeCurrent) return;
    onChange?.(page, pageSize);
  };

  const handleJump = () => {
    const page = Number(jumpValue);
    if (!Number.isFinite(page)) return;
    go(Math.round(page));
    setJumpValue('');
  };

  const handleSizeChange = (value: string) => {
    const next = Number(value);
    if (!Number.isFinite(next) || next <= 0) return;
    onChange?.(1, next);
  };

  const pages = buildPageList(safeCurrent, totalPages);
  const start = total === 0 ? 0 : (safeCurrent - 1) * pageSize + 1;
  const end = Math.min(total, safeCurrent * pageSize);

  const btnBase = 'inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg border text-sm transition select-none';
  const btnIdle = 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700';
  const btnActive = 'border-blue-500 bg-blue-500 text-white hover:bg-blue-600';
  const btnDisabled = 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300';

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {showTotal ? <span className="mr-2 text-sm">{showTotal(total, [start, end])}</span> : null}

      <button
        type="button"
        onClick={() => go(safeCurrent - 1)}
        disabled={safeCurrent <= 1}
        className={`${btnBase} px-1.5 ${safeCurrent <= 1 ? btnDisabled : btnIdle}`}
        aria-label="上一页"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((p, idx) =>
        p === 'ellipsis' ? (
          <span key={`e-${idx}`} className="px-1 text-slate-400">…</span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className={`${btnBase} px-2 ${p === safeCurrent ? btnActive : btnIdle}`}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(safeCurrent + 1)}
        disabled={safeCurrent >= totalPages}
        className={`${btnBase} px-1.5 ${safeCurrent >= totalPages ? btnDisabled : btnIdle}`}
        aria-label="下一页"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {showSizeChanger ? (
        <Select
          size="small"
          value={String(pageSize)}
          onChange={handleSizeChange}
          className="w-32"
          dropdownWidth={128}
          options={pageSizeOptions.map((opt) => ({
            value: opt,
            label: `${opt} 条/页`,
          }))}
        />
      ) : null}

      {showQuickJumper ? (
        <span className="inline-flex items-center gap-1 text-sm text-slate-500">
          跳至
          <input
            type="text"
            value={jumpValue}
            onChange={(e) => setJumpValue(e.target.value.replace(/[^\d]/g, ''))}
            onKeyDown={(e) => e.key === 'Enter' && handleJump()}
            onBlur={handleJump}
            className="h-8 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
          页
        </span>
      ) : null}
    </div>
  );
};

export default Pagination;
