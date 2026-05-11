import { Link } from 'react-router-dom';
import { Table, Tag, Spin, Empty, Modal, Button, Space } from '../../components';
import { Trophy, Clock, Lock, List as ListIcon, History, Maximize2 } from 'lucide-react';
import Input from '../../components/input';
import {
  useCompetitionDetail,
  formatCompetitionDetailTime,
  type CompetitionProblem as Problem,
} from '@/hooks/useCompetitionDetail';

const CompetitionDetail: React.FC = () => {
  const {
    id,
    navigate,
    competition,
    problems,
    loading,
    problemsLoading,
    passwordModalVisible,
    password,
    setPassword,
    passwordVerified,
    countdown,
    status,
    isUserCompetitionEnded,
    finishCompetitionLoading,
    finishCompetitionModalOpen,
    setFinishCompetitionModalOpen,
    fullscreenPromptOpen,
    handleVerifyPassword,
    handleFinishCompetition,
    enterFullscreen,
    handleSkipFullscreen,
    handleOpenProblem,
  } = useCompetitionDetail();
  const formatTime = formatCompetitionDetailTime;

  const getStatusTag = () => {
    switch (status) {
      case 'upcoming':
        return <Tag color="orange">未开始</Tag>;
      case 'running':
        return <Tag color="green">进行中</Tag>;
      case 'ended':
        return <Tag color="default">已结束</Tag>;
      default:
        return null;
    }
  };

  const problemColumns = [
    {
      title: '题号',
      key: 'index',
      width: 80,
      render: (_: any, __: any, index: number) => String.fromCharCode('A'.charCodeAt(0) + index),
    },
    {
      title: '题目名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Problem) => (
        <button
          type="button"
          onClick={(event) => handleOpenProblem(record.id, event)}
          className="font-medium hover:opacity-70 transition-opacity text-left"
          style={{ color: 'var(--gemini-accent-strong)' }}
        >
          {title}
        </button>
      ),
    },
    {
      title: '状态',
      key: 'isSolved',
      width: 100,
      render: (_: unknown, record: Problem) =>
        record.isSolved ? (
          <Tag color="success">已通过</Tag>
        ) : (
          <Tag>未通过</Tag>
        ),
    },
    {
      title: '提交数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 100,
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 100,
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 100,
      render: (_: any, record: Problem) => {
        const rate =
          record.submitCount === 0
            ? 0
            : ((record.passCount / record.submitCount) * 100).toFixed(1);
        return `${rate}%`;
      },
    },
  ];

  if (loading) {
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
          <div className="flex flex-wrap justify-between gap-6">
            <div className="flex-1 min-w-[300px]">
              <h2 className="mb-4 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                {competition.title}
              </h2>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {getStatusTag()}
                {competition.needPassword && (
                  <Tag color="red">
                    <Lock className="inline w-3.5 h-3.5" />需要密码
                  </Tag>
                )}
                {isUserCompetitionEnded && (
                  <Tag color="red">你已结束比赛</Tag>
                )}
              </div>
              <p className="leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
                {competition.description || '暂无描述'}
              </p>
              <Space wrap>
                <Link to={`/competition/${id}/ranklist`}>
                  <Button icon={<Trophy className="w-4 h-4" />}>
                    排行榜
                  </Button>
                </Link>
                <Link to={`/competition/${id}/submissions`}>
                  <Button icon={<History className="w-4 h-4" />}>
                    提交记录
                  </Button>
                </Link>
                {status === 'running' && !isUserCompetitionEnded && (
                  <Button danger loading={finishCompetitionLoading} onClick={() => setFinishCompetitionModalOpen(true)}>
                    结束比赛
                  </Button>
                )}
              </Space>
            </div>
            <div className="min-w-[250px]">
              <div className="mb-3">
                <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>开始时间：</span>
                <br />
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.beginTime)}</span>
              </div>
              <div className="mb-3">
                <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>结束时间：</span>
                <br />
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.endTime)}</span>
              </div>
              {countdown && (
                <div className="mt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                    <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>剩余时间：</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {countdown.days > 0 && (
                      <Tag color="blue">{countdown.days}天</Tag>
                    )}
                    {countdown.hours > 0 && (
                      <Tag color="blue">{countdown.hours}小时</Tag>
                    )}
                    {countdown.minutes > 0 && (
                      <Tag color="orange">{countdown.minutes}分钟</Tag>
                    )}
                    <Tag color="red">{countdown.seconds}秒</Tag>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 比赛题目列表 - Gemini 风格 */}
        {passwordVerified ? (
          <div className="gemini-card">
            <div className="flex items-center gap-2 mb-4">
              <ListIcon className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛题目列表</span>
            </div>
            {problemsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spin spinning />
              </div>
            ) : problems.length === 0 ? (
              <Empty description="暂无题目" />
            ) : (
              <Table<Problem>
                columns={problemColumns}
                dataSource={problems}
                rowKey="id"
              />
            )}
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <span style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看比赛题目</span>
          </div>
        )}
      </div>

      {/* 密码验证Modal */}
      <Modal
        title="进入全屏模式"
        open={fullscreenPromptOpen}
        onOk={enterFullscreen}
        onCancel={handleSkipFullscreen}
        okText="进入全屏"
        cancelText="暂不进入"
        closable={false}
        maskClosable={false}
      >
        <div className="flex flex-col gap-3">
          <div>
            <Maximize2 className="inline w-4 h-4 mr-2" />
            严格模式下比赛进行期间需要保持全屏模式。
          </div>
          <span style={{ color: 'var(--gemini-error)' }}>如果暂不进入或退出全屏，该行为会被记录到防作弊日志中。</span>
        </div>
      </Modal>

      <Modal
        title="确认结束本场比赛？"
        open={finishCompetitionModalOpen}
        onOk={handleFinishCompetition}
        onCancel={() => setFinishCompetitionModalOpen(false)}
        okText="确认结束"
        cancelText="取消"
        okButtonProps={{ danger: true, loading: finishCompetitionLoading }}
        confirmLoading={finishCompetitionLoading}
        centered
      >
        <div className="space-y-2">
          <p>确认后你将无法再次提交本场比赛的任何题目。</p>
        </div>
      </Modal>

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

export default CompetitionDetail;
