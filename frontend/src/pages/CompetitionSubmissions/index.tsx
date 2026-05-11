import { Link } from 'react-router-dom';
import { Button, Space } from '../../components';
import { Lock, List as ListIcon, History } from 'lucide-react';
import Select from '../../components/select';
import Input from '../../components/input';
import { JudgeStatusBadge, LanguageBadge } from '../../components/status-badge';
import { Table, Empty, Spin, Modal } from '../../components';
import { useCompetitionSubmissions, type Submission } from '@/hooks/useCompetitionSubmissions';

const CompetitionSubmissions: React.FC = () => {
  const {
    id,
    navigate,
    competition,
    submissions,
    loading,
    passwordModalVisible,
    password,
    setPassword,
    passwordVerified,
    currentPage,
    setCurrentPage,
    total,
    pageSize,
    status,
    setStatus,
    language,
    setLanguage,
    statusOptions,
    languageOptions,
    handleVerifyPassword,
    resetFilters,
  } = useCompetitionSubmissions();


  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const columns = [
    {
      title: '提交ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '题目',
      key: 'problem',
      render: (_: any, record: Submission) => (
        <Link
          to={`/competition/${id}/problem/${record.pid}`}
          className="font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--gemini-accent-strong)' }}
        >
          #{record.pid} - {record.problemName || '未知题目'}
        </Link>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
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
      title: '时间',
      dataIndex: 'createTime',
      key: 'submitTime',
      width: 180,
      render: (time: string) => formatTime(time),
    },
    {
      title: '运行时间',
      dataIndex: 'time',
      key: 'runTime',
      width: 120,
      render: (ms: number) => ms != null ? `${ms} ms` : '-',
    },
    {
      title: '运行内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 120,
      render: (mem: number) => mem != null ? `${mem} MB` : '-',
    },
  ];

  if (loading && !competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin spinning />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Empty description="比赛不存在" />
      </div>
    );
  }

  return (
    <div className="w-full" style={{ backgroundColor: 'transparent' }}>
      <div className="w-full">
        {/* 比赛基本信息 - Gemini 风格 */}
        <div className="gemini-card mb-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
            <div>
              <h2 className="mb-4 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{competition.title}</h2>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>开始时间：</span>
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.beginTime)}</span>
                <span className="ml-6 font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>结束时间：</span>
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.endTime)}</span>
              </div>
            </div>
            <Link to={`/competition/${id}`}>
              <Button icon={<ListIcon className="w-4 h-4" />}>
                返回比赛详情
              </Button>
            </Link>
          </div>
        </div>

        {/* 提交记录 - Gemini 风格 */}
        {passwordVerified ? (
          <div className="gemini-card">
            <div className="flex items-center gap-2 mb-4">
              <History className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛提交记录</span>
            </div>
            <div className="mb-4">
              <Space wrap>
                <Select
                  placeholder="状态"
                  value={status}
                  onChange={setStatus}
                  className="w-36"
                  allowClear
                  dropdownWidth={144}
                  options={statusOptions}
                />
                <Select
                  placeholder="语言"
                  value={language}
                  onChange={setLanguage}
                  className="w-36"
                  allowClear
                  dropdownWidth={144}
                  options={languageOptions}
                />
                <Button
                  onClick={resetFilters}
                >
                  重置
                </Button>
              </Space>
            </div>

            {submissions.length === 0 ? (
              <Empty description="暂无提交记录" />
            ) : (
              <>
                <Table<Submission>
                  columns={columns}
                  dataSource={submissions}
                  loading={loading}
                  rowKey="id"
                />
                <div className="mt-4 flex items-center justify-end gap-3">
                  <Button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(currentPage - 1)}
                  >
                    上一页
                  </Button>
                  <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                    第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                  </span>
                  <Button
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    onClick={() => setCurrentPage(currentPage + 1)}
                  >
                    下一页
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <span style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看提交记录</span>
          </div>
        )}
      </div>

      {/* 密码验证Modal */}
      <Modal
        title={
          <Space>
            <Lock className="w-4 h-4" />
            <span>请输入比赛密码</span>
          </Space>
        }
        open={passwordModalVisible}
        onOk={handleVerifyPassword}
        onCancel={() => navigate('/competitions')}
        okText="验证"
        cancelText="取消"
        closable={false}
        maskClosable={false}
      >
        <Input.Password
          placeholder="请输入比赛访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleVerifyPassword}
          autoFocus
          className="!rounded-full"
        />
      </Modal>
    </div>
  );
};

export default CompetitionSubmissions;
