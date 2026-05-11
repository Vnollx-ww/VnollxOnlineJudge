import { Link } from 'react-router-dom';
import {
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Spin,
  Empty,
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import Input from '../../components/input';
import {
  useCompetitionDetail,
  formatCompetitionDetailTime,
  type CompetitionProblem as Problem,
} from '@/hooks/useCompetitionDetail';

const { Title, Text, Paragraph } = Typography;

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
        return <Tag color="orange" className="!rounded-full !px-3">未开始</Tag>;
      case 'running':
        return <Tag color="green" className="!rounded-full !px-3">进行中</Tag>;
      case 'ended':
        return <Tag color="default" className="!rounded-full !px-3">已结束</Tag>;
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
          <Tag color="success" className="!rounded-full">已通过</Tag>
        ) : (
          <Tag className="!rounded-full">未通过</Tag>
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
        <Spin size="large" tip="加载中..." />
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
              <Title level={2} className="!mb-4" style={{ color: 'var(--gemini-text-primary)' }}>
                {competition.title}
              </Title>
              <Space className="mb-4">
                {getStatusTag()}
                {competition.needPassword && (
                  <Tag icon={<LockOutlined />} color="purple" className="!rounded-full !px-3">
                    需要密码
                  </Tag>
                )}
                {isUserCompetitionEnded && (
                  <Tag color="red" className="!rounded-full !px-3">
                    你已结束比赛
                  </Tag>
                )}
              </Space>
              <Paragraph style={{ color: 'var(--gemini-text-secondary)' }} className="leading-relaxed">
                {competition.description || '暂无描述'}
              </Paragraph>
              <Space wrap>
                <Link to={`/competition/${id}/ranklist`}>
                  <Button icon={<TrophyOutlined />}>
                    排行榜
                  </Button>
                </Link>
                <Link to={`/competition/${id}/submissions`}>
                  <Button icon={<HistoryOutlined />}>
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
                <Text strong style={{ color: 'var(--gemini-text-primary)' }}>开始时间：</Text>
                <br />
                <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.beginTime)}</Text>
              </div>
              <div className="mb-3">
                <Text strong style={{ color: 'var(--gemini-text-primary)' }}>结束时间：</Text>
                <br />
                <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.endTime)}</Text>
              </div>
              {countdown && (
                <div className="mt-4">
                  <Space>
                    <ClockCircleOutlined style={{ color: 'var(--gemini-accent-strong)' }} />
                    <Text strong style={{ color: 'var(--gemini-text-primary)' }}>剩余时间：</Text>
                  </Space>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {countdown.days > 0 && (
                      <Tag color="blue" className="!rounded-full">{countdown.days}天</Tag>
                    )}
                    {countdown.hours > 0 && (
                      <Tag color="cyan" className="!rounded-full">{countdown.hours}小时</Tag>
                    )}
                    {countdown.minutes > 0 && (
                      <Tag color="orange" className="!rounded-full">{countdown.minutes}分钟</Tag>
                    )}
                    <Tag color="red" className="!rounded-full">{countdown.seconds}秒</Tag>
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
              <UnorderedListOutlined style={{ color: 'var(--gemini-accent-strong)' }} />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛题目列表</span>
            </div>
            {problemsLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spin size="large" tip="题目加载中..." />
              </div>
            ) : problems.length === 0 ? (
              <Empty description="暂无题目" />
            ) : (
              <Table
                columns={problemColumns}
                dataSource={problems}
                rowKey="id"
                pagination={false}
              />
            )}
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <Text style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看比赛题目</Text>
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
        <Space direction="vertical" size="middle">
          <div>
            <FullscreenOutlined className="mr-2" />
            严格模式下比赛进行期间需要保持全屏模式。
          </div>
          <Text type="danger">如果暂不进入或退出全屏，该行为会被记录到防作弊日志中。</Text>
        </Space>
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
            <LockOutlined />
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
