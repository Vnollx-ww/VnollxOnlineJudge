import { Button, Progress } from '../../components';
import { BookOpen, ArrowLeft, CheckCircle2, MinusCircle, RotateCw } from 'lucide-react';
import { DifficultyBadge } from '../../components/status-badge';
import { Table, Spin, Tag } from '../../components';
import { usePracticeDetail, type Problem } from '@/hooks/usePracticeDetail';

const PracticeDetail: React.FC = () => {
  const {
    navigate,
    practice,
    problems,
    loading,
    hasMoreProblems,
    loadingMore,
    loadMoreRef,
    loadPracticeData,
    formatTime,
    calculateProgress,
    handleProblemClick,
  } = usePracticeDetail();

  const columns = [
    {
      title: '状态',
      dataIndex: 'isSolved',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (isSolved: boolean) => (
        isSolved ? (
          <CheckCircle2 size={18} style={{ color: 'var(--gemini-success)' }} />
        ) : (
          <MinusCircle size={18} style={{ color: 'var(--gemini-text-disabled)' }} />
        )
      ),
    },
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>#{id}</span>,
    },
    {
      title: '题目',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Problem) => (
        <span
          className="cursor-pointer hover:opacity-70 transition-opacity"
          style={{ color: 'var(--gemini-accent-strong)' }}
          onClick={() => handleProblemClick(record.id)}
        >
          {title}
        </span>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 100,
      render: (difficulty: string) => <DifficultyBadge difficulty={difficulty || '未知'} />,
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      render: (_: any, record: Problem) => {
        const rate = record.submitCount > 0 
          ? Math.round((record.passCount / record.submitCount) * 100) 
          : 0;
        return <span style={{ color: 'var(--gemini-text-secondary)' }}>{rate}%</span>;
      },
    },
  ];

  if (loading) {
    return (
      <div className="min-h-full w-full flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <Spin spinning />
      </div>
    );
  }

  if (!practice) {
    return (
      <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <div className="w-full">
          <div className="gemini-card">
            <div className="py-12 text-center">
              <span style={{ color: 'var(--gemini-text-tertiary)' }}>练习不存在</span>
              <br />
              <Button 
                type="primary" 
                onClick={() => navigate('/practices')} 
                className="mt-4"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                返回练习列表
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const progress = calculateProgress();

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="w-full space-y-6">
        {/* 头部信息 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <BookOpen size={28} style={{ color: 'var(--gemini-accent-strong)' }} />
                <h2 className="text-2xl font-semibold m-0" style={{ color: 'var(--gemini-text-primary)' }}>{practice.title}</h2>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <Tag color="blue">练习</Tag>
                <span className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>创建于 {formatTime(practice.createTime)}</span>
              </div>
              {practice.description && (
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{practice.description}</span>
              )}
            </div>
            <div className="flex gap-3">
              <Button icon={<RotateCw className="w-4 h-4" />} onClick={loadPracticeData}>
                刷新
              </Button>
              <Button icon={<ArrowLeft className="w-4 h-4" />} onClick={() => navigate('/practices')}>
                返回列表
              </Button>
            </div>
          </div>
        </div>

        {/* 进度卡片 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>完成进度</span>
            <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
              {practice.solvedCount || 0} / {practice.problemCount || 0} 题
            </span>
          </div>
          <Progress
            percent={progress}
            strokeColor={{
              '0%': 'var(--gemini-accent-strong)',
              '100%': 'var(--gemini-success)',
            }}
            status={progress === 100 ? 'success' : 'active'}
          />
        </div>

        {/* 题目列表 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex items-center gap-2 mb-4">
            <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题目列表</span>
          </div>
          <Table<Problem>
            columns={columns}
            dataSource={problems}
            rowKey="id"
          />
          {hasMoreProblems && (
            <div ref={loadMoreRef} className="flex justify-center py-4">
              <Spin spinning={loadingMore} />
            </div>
          )}
          {practice.problemCount > 0 && !hasMoreProblems && problems.length > 0 && (
            <div className="py-4 text-center">
              <span style={{ color: 'var(--gemini-text-tertiary)' }}>
                已加载全部题目（{problems.length} / {practice.problemCount} 条）
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PracticeDetail;
