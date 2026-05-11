import Pagination from './pagination';
import type { PaginationProps } from './pagination';
import type { ReactNode } from 'react';

export type PagePaginationProps = {
  current: number;
  total: number;
  pageSize: number;
  onChange: (page: number, pageSize: number) => void;
  /** 总数提示后缀，默认 "条记录"。传 false / '' 隐藏总数。 */
  unit?: ReactNode | false;
  /** 是否显示快速跳转。默认 true。 */
  showQuickJumper?: boolean;
  /** 是否显示页大小切换。默认 false。 */
  showSizeChanger?: boolean;
  /** 自定义 pageSize 选项。 */
  pageSizeOptions?: string[];
  /** 容器对齐：center（默认） / end。 */
  align?: 'center' | 'end';
  className?: string;
};

/**
 * 统一封装的分页条。消灭各页面里重复的：
 *   <Pagination ... showSizeChanger={false} showQuickJumper
 *     showTotal={(t) => <span style={{ color: 'var(--gemini-text-secondary)' }}>共 {t} 条</span>} />
 */
export default function PagePagination({
  current,
  total,
  pageSize,
  onChange,
  unit = '条记录',
  showQuickJumper = true,
  showSizeChanger = false,
  pageSizeOptions,
  align = 'center',
  className = '',
}: PagePaginationProps) {
  const showTotal: PaginationProps['showTotal'] = unit
    ? (count: number) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>
          共 {count} {unit}
        </span>
      )
    : undefined;

  return (
    <div className={`flex ${align === 'end' ? 'justify-end' : 'justify-center'} ${className}`}>
      <Pagination
        current={current}
        total={total}
        pageSize={pageSize}
        onChange={onChange}
        showQuickJumper={showQuickJumper}
        showSizeChanger={showSizeChanger}
        pageSizeOptions={pageSizeOptions}
        showTotal={showTotal}
      />
    </div>
  );
}
