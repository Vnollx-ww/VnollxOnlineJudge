import { AlertCircle, Clock, HardDrive, Layers } from 'lucide-react';
import Select from '@/components/ui/select';
import Input from '@/components/ui/input';
import PageSurface from '@/components/common/page-surface';
import PagePagination from '@/components/common/page-pagination';
import SubmissionCodeBlock from '@/components/editor/submission-code-block';
import MetricCard from '@/components/common/metric-card';
import { JudgeStatusBadge, LanguageBadge } from '@/components/common/status-badge';
import { Button, Switch, Table, Modal } from '@/components';
import { useSubmissions, type Submission } from '@/hooks/submission/useSubmissions';

const Submissions: React.FC = () => {
  const {
    submissions,
    loading,
    currentPage,
    total,
    pageSize,
    problemId,
    setProblemId,
    status,
    setStatus,
    language,
    setLanguage,
    statusOptions,
    languageOptions,
    onlyMine,
    setOnlyMine,
    codeModalVisible,
    currentSubmission,
    handlePageChange,
    resetFilters,
    openSubmissionDetail,
    closeSubmissionDetail,
    navigate,
  } = useSubmissions();

  const columns = [
    {
      title: '提交ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number, record: Submission) => (
          <button
              onClick={() => openSubmissionDetail(record)}
              className="font-mono transition-colors hover:underline"
              style={{ color: 'var(--gemini-accent-strong)' }}
          >
            {id}
          </button>
      ),
    },
    {
      title: '题目',
      key: 'problem',
      render: (_: unknown, record: Submission) => (
          <button
              onClick={() => navigate(`/problem/${record.pid}`)}
              className="text-left transition-colors"
              style={{ color: 'var(--gemini-text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gemini-accent-strong)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gemini-text-primary)'}
          >
            #{record.pid} - {record.problemName || '未知题目'}
          </button>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
      render: (name: string) => <span style={{ color: 'var(--gemini-text-secondary)' }}>{name}</span>,
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 120,
      render: (lang: string) => <LanguageBadge language={lang} />,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => <JudgeStatusBadge status={status} />,
    },
    {
      title: '测试点',
      key: 'testcase',
      width: 100,
      align: 'center' as const,
      render: (_: unknown, record: Submission) =>
        record.testCount != null && record.testCount > 0 ? (
          <span style={{ color: 'var(--gemini-text-secondary)' }}>
            {record.passCount ?? 0}/{record.testCount}
          </span>
        ) : (
          <span style={{ color: 'var(--gemini-text-disabled)' }}>—</span>
        ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'submitTime',
      width: 180,
      render: (time: string) => {
        if (!time) return '-';
        return <span className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>{new Date(time).toLocaleString('zh-CN')}</span>;
      },
    },
    {
      title: '运行时间',
      dataIndex: 'time',
      key: 'runTime',
      width: 120,
      align: 'center' as const,
      render: (ms: number | null) => (
          <span style={{ color: 'var(--gemini-text-secondary)' }}>{ms != null ? `${ms} ms` : '-'}</span>
      ),
    },
    {
      title: '运行内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 120,
      align: 'center' as const,
      render: (mem: number | null) => (
          <span style={{ color: 'var(--gemini-text-secondary)' }}>{mem != null ? `${mem} MB` : '-'}</span>
      ),
    },
  ];

  return (
      <div className="space-y-6">
        <PageSurface title="提交记录" fullHeight={false}>
          <div className="flex flex-row items-center justify-between gap-4 mb-6 overflow-visible pb-1">
            <div className="flex flex-none flex-row items-center gap-3">
              <Input
                  placeholder="题目标题或ID"
                  value={problemId}
                  onChange={(e) => setProblemId(e.target.value)}
                  className="w-40"
              />
              <Select
                  placeholder="状态"
                  value={status}
                  onChange={setStatus}
                  className="w-40"
                  allowClear
                  dropdownWidth={160}
                  options={statusOptions}
              />
              <Select
                  placeholder="语言"
                  value={language}
                  onChange={setLanguage}
                  className="w-32"
                  allowClear
                  dropdownWidth={128}
                  options={languageOptions}
              />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <Button
                  onClick={resetFilters}
              >
                重置
              </Button>
              <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>仅看自己</span>
              <Switch checked={onlyMine} onChange={setOnlyMine} />
            </div>
          </div>

          <Table<Submission>
              columns={columns}
              dataSource={submissions}
              loading={loading}
              rowKey="id"
          />

          <PagePagination
              current={currentPage}
              total={total}
              pageSize={pageSize}
              onChange={handlePageChange}
              className="mt-6"
          />
        </PageSurface>

        {/* 详情与代码模态框 */}
        <Modal
            title={`提交详情 #${currentSubmission?.id}`}
            open={codeModalVisible}
            onCancel={closeSubmissionDetail}
            footer={null}
            width={960}
            centered
        >
          <div className="space-y-5">
            {currentSubmission && (
              <>
                {/* 头部信息 */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <button
                        onClick={() => navigate(`/problem/${currentSubmission.pid}`)}
                        className="text-left text-lg font-semibold truncate transition-colors hover:underline"
                        style={{ color: 'var(--gemini-accent-strong)' }}
                    >
                      {currentSubmission.problemName || `题目 #${currentSubmission.pid}`}
                    </button>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                      <span>{currentSubmission.userName || '未知用户'}</span>
                      <span>·</span>
                      <span>{currentSubmission.createTime ? new Date(currentSubmission.createTime).toLocaleString('zh-CN') : '未知时间'}</span>
                      {currentSubmission.snowflakeId && (
                          <>
                            <span>·</span>
                            <span className="font-mono text-xs">{currentSubmission.snowflakeId}</span>
                          </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <JudgeStatusBadge status={currentSubmission.status} />
                    <LanguageBadge language={currentSubmission.language} />
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="gemini-divider" style={{ margin: 0 }} />

                {/* 指标卡片 */}
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                      icon={<Clock className="w-4 h-4" />}
                      label="运行时间"
                      value={currentSubmission.time != null ? `${currentSubmission.time} ms` : '暂无'}
                  />
                  <MetricCard
                      icon={<HardDrive className="w-4 h-4" />}
                      label="占用内存"
                      value={currentSubmission.memory != null ? `${currentSubmission.memory} MB` : '暂无'}
                  />
                  <MetricCard
                      icon={<Layers className="w-4 h-4" />}
                      label="通过测试点"
                      value={
                        currentSubmission.testCount != null && currentSubmission.testCount > 0
                          ? `${currentSubmission.passCount ?? 0} / ${currentSubmission.testCount}`
                          : '暂无'
                      }
                  />
                </div>
              </>
            )}

            {/* 错误信息展示区 */}
            {currentSubmission?.errorInfo && (
                <div
                    className="rounded-xl border p-4 flex flex-col gap-2"
                    style={{
                      backgroundColor: 'var(--gemini-error-bg)',
                      borderColor: 'var(--gemini-error)',
                    }}
                >
                  <div className="flex items-center gap-2 font-semibold text-sm" style={{ color: 'var(--gemini-error)' }}>
                    <AlertCircle size={16} />
                    <span>错误详情 ({currentSubmission.status})</span>
                  </div>
                  <pre className="text-sm font-mono whitespace-pre-wrap m-0 p-0" style={{ color: 'var(--gemini-error)' }}>
                    {currentSubmission.errorInfo}
                  </pre>
                </div>
            )}

            <SubmissionCodeBlock
                copyPlacement="top-bar"
                language={currentSubmission?.language}
                code={currentSubmission?.code}
                maxHeight="50vh"
            />
          </div>
        </Modal>
      </div>
  );
};

export default Submissions;