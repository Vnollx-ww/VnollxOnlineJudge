import { useState, useEffect } from 'react';
import type { MouseEvent } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
import toast from 'react-hot-toast';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
  FullscreenOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import Input from '../../components/Input';
import { useCompetitionFirstBloodWebSocket } from '../../hooks/useCompetitionFirstBloodWebSocket';

const { Title, Text, Paragraph } = Typography;

interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
  antiCheatMode?: 'NORMAL' | 'STRICT' | string;
}

interface Problem {
  id: number;
  title: string;
  submitCount: number;
  passCount: number;
  isSolved?: boolean | null;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const CompetitionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [problemsLoading, setProblemsLoading] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [status, setStatus] = useState('');
  const [isUserCompetitionEnded, setIsUserCompetitionEnded] = useState(false);
  const [finishStatusLoaded, setFinishStatusLoaded] = useState(false);
  const [finishCompetitionLoading, setFinishCompetitionLoading] = useState(false);
  const [finishCompetitionModalOpen, setFinishCompetitionModalOpen] = useState(false);
  const [fullscreenPromptOpen, setFullscreenPromptOpen] = useState(false);
  const [fullscreenPromptDismissed, setFullscreenPromptDismissed] = useState(false);
  const isStrictAntiCheat = competition?.antiCheatMode === 'STRICT';
  useCompetitionFirstBloodWebSocket(id, passwordVerified);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/login');
      return;
    }
    loadCompetition();
  }, [id]);

  useEffect(() => {
    if (competition) {
      checkPassword();
      updateCountdown();
      loadFinishStatus();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadProblems();
    }
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (isStrictAntiCheat && status === 'running' && passwordVerified && finishStatusLoaded && !isUserCompetitionEnded && !fullscreenPromptDismissed && !document.fullscreenElement) {
      setFullscreenPromptOpen(true);
    } else {
      setFullscreenPromptOpen(false);
    }
  }, [isStrictAntiCheat, status, passwordVerified, finishStatusLoaded, isUserCompetitionEnded, fullscreenPromptDismissed]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (isStrictAntiCheat && !document.fullscreenElement && status === 'running' && passwordVerified && finishStatusLoaded && !isUserCompetitionEnded) {
        toast.error('你已退出全屏模式，该行为会被记录');
        setFullscreenPromptOpen(true);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [isStrictAntiCheat, status, passwordVerified, finishStatusLoaded, isUserCompetitionEnded]);

  const loadCompetition = async () => {
    try {
      const data = await api.get('/competition/list');
      if (data.code === 200) {
        const comp = data.data.find((c: Competition) => c.id.toString() === id);
        if (comp) {
          setCompetition(comp);
        } else {
          toast.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载比赛信息失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPassword = () => {
    if (competition && competition.needPassword) {
      const verified = localStorage.getItem(`competition_${id}_verified`);
      if (verified === 'true') {
        setPasswordVerified(true);
      } else {
        setPasswordModalVisible(true);
      }
    } else {
      setPasswordVerified(true);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const data = await api.post('/competition/confirm', {
        id: id,
        password: password,
      });
      if (data.code === 200) {
        toast.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        toast.error(data.msg || '密码错误');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      toast.error(errorMsg);
      console.error(error);
    }
  };

  const loadProblems = async () => {
    setProblems([]);
    setProblemsLoading(true);
    try {
      const data = await api.get('/competition/list-problem', {
        params: { id: id },
      });
      if (data.code === 200) {
        setProblems(data.data || []);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error(error?.response?.data?.msg || '加载题目列表失败');
        console.error(error);
      }
    } finally {
      setProblemsLoading(false);
    }
  };

  const loadFinishStatus = async () => {
    if (!id) return;
    setFinishStatusLoaded(false);
    try {
      const data = await api.get(`/competition/${id}/finish/status`);
      if (data.code === 200) {
        setIsUserCompetitionEnded(Boolean(data.data));
      }
    } catch {
      setIsUserCompetitionEnded(false);
    } finally {
      setFinishStatusLoaded(true);
    }
  };

  const handleFinishCompetition = async () => {
    if (!id) return;
    setFinishCompetitionLoading(true);
    try {
      const data = await api.post(`/competition/${id}/finish`);
      if (data.code === 200) {
        setIsUserCompetitionEnded(true);
        setFinishCompetitionModalOpen(false);
        setFullscreenPromptOpen(false);
        if (document.fullscreenElement) {
          await document.exitFullscreen().catch(() => undefined);
        }
        toast.success('已结束本场比赛，后续无法再次提交');
      } else {
        toast.error(data.msg || '结束比赛失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '结束比赛失败');
    } finally {
      setFinishCompetitionLoading(false);
    }
  };

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setFullscreenPromptOpen(false);
      setFullscreenPromptDismissed(false);
    } catch {
      toast.error('进入全屏失败，请检查浏览器权限后重试');
    }
  };

  const reportFullscreenRefuse = async () => {
    if (!id) return;
    try {
      await api.post('/competition/anti-cheat/report', {
        competitionId: Number(id),
        events: [{
          eventType: 'FULLSCREEN_EXIT',
          startedAt: new Date().toISOString(),
          endedAt: new Date().toISOString(),
          durationSeconds: 0,
          detailJson: JSON.stringify({ reason: 'REFUSE_FULLSCREEN' }),
        }],
      });
    } catch {
      // 忽略上报失败，避免影响用户操作
    }
  };

  const handleSkipFullscreen = async () => {
    setFullscreenPromptOpen(false);
    setFullscreenPromptDismissed(true);
    await reportFullscreenRefuse();
    toast.error('严格模式下未进入全屏，该行为会被记录');
  };

  const handleOpenProblem = (problemId: number, event?: MouseEvent<HTMLButtonElement>) => {
    if (isStrictAntiCheat && status === 'running' && !isUserCompetitionEnded && !document.fullscreenElement) {
      void reportFullscreenRefuse();
      setFullscreenPromptDismissed(false);
      setFullscreenPromptOpen(true);
      toast.error('严格模式下必须进入全屏模式后才能答题');
      return;
    }
    const problemUrl = `/competition/${id}/problem/${problemId}`;
    if (event?.ctrlKey) {
      window.open(problemUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    navigate(problemUrl);
  };

  const updateCountdown = () => {
    if (!competition) return;

    const now = new Date();
    const beginTime = new Date(competition.beginTime);
    const endTime = new Date(competition.endTime);

    if (now < beginTime) {
      setStatus('upcoming');
      const diff = beginTime.getTime() - now.getTime();
      setCountdown(calculateTimeRemaining(diff));
    } else if (now >= beginTime && now <= endTime) {
      setStatus('running');
      const diff = endTime.getTime() - now.getTime();
      setCountdown(calculateTimeRemaining(diff));
    } else {
      setStatus('ended');
      setCountdown(null);
    }
  };

  const calculateTimeRemaining = (diff: number): Countdown => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

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
