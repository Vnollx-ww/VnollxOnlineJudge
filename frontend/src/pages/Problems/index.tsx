import { CheckCircle, Circle } from 'lucide-react';
import Input from '../../components/input';
import PageSurface from '../../components/page-surface';
import PagePagination from '../../components/page-pagination';
import TagMultiSelect from '../../components/tag-multi-select';
import { Button, Table } from '../../components';
import { DifficultyBadge, PassRateBadge } from '../../components/status-badge';
import { useProblems, type Problem } from '@/hooks/useProblems';

const Problems: React.FC = () => {
  const {
    problems,
    tags,
    loading,
    currentPage,
    total,
    pageSize,
    searchKeyword,
    setSearchKeyword,
    selectedTags,
    solvedIds,
    handlePageChange,
    toggleTag,
    resetFilters,
    navigate,
  } = useProblems();

  const handleTagChange = (next: string[]) => {
    // 复用 hook 中原有的 toggleTag 逻辑：差集动作转发
    const prev = new Set(selectedTags);
    next.forEach((name) => {
      if (!prev.has(name)) toggleTag(name);
    });
    selectedTags.forEach((name) => {
      if (!next.includes(name)) toggleTag(name);
    });
  };


  const columns = [
    {
      title: '状态',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Problem) => (
        <div className="flex items-center justify-center">
          {solvedIds.has(record.id) ? (
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--gemini-success)' }} />
          ) : (
            <Circle className="w-5 h-5" style={{ color: 'var(--gemini-text-disabled)' }} />
          )}
        </div>
      ),
    },
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => (
        <span 
          className="font-mono"
          style={{ color: 'var(--gemini-text-secondary)' }}
        >
          #{id}
        </span>
      ),
    },
    {
      title: '题目名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Problem) => (
        <button
          onClick={() => navigate(`/problem/${record.id}`)}
          className="text-left font-medium transition-colors duration-200"
          style={{ 
            color: 'var(--gemini-text-primary)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gemini-accent-strong)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gemini-text-primary)'}
        >
          {title}
        </button>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 120,
      render: (difficulty: string) => <DifficultyBadge difficulty={difficulty} />,
    },
    {
      title: '提交次数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{count}</span>
      ),
    },
    {
      title: '通过次数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{count}</span>
      ),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Problem) => (
        <PassRateBadge submitCount={record.submitCount} passCount={record.passCount} />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageSurface title="题目列表">
        {/* 搜索栏 - Gemini 风格 */}
        <div className="flex flex-row items-center gap-3 mb-6">
          <Input
            placeholder="输入题目编号或名称和标签"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="min-w-0 flex-1"
            size="large"
          />
          <TagMultiSelect
            options={tags}
            value={selectedTags}
            onChange={handleTagChange}
          />
          <Button onClick={resetFilters}>
            重置
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1">
          <Table<Problem>
            columns={columns}
            dataSource={problems}
            loading={loading}
            rowKey="id"
          />
        </div>

        {/* 分页 */}
        <PagePagination
          current={currentPage}
          total={total}
          pageSize={pageSize}
          onChange={handlePageChange}
          unit="题"
          className="mt-auto pt-6"
        />
      </PageSurface>

    </div>
  );
};

export default Problems;
