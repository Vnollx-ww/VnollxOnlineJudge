import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Space,
  Button,
  Modal,
  Input,
  Spin,
  Empty,
} from 'antd';
import toast from 'react-hot-toast';
import {
  TrophyOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;

interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
}

interface User {
  id: number;
  name: string;
  passCount: number;
  penaltyTime: number;
  problems?: ProblemResult[];
}

interface Problem {
  id: number;
  title: string;
  label?: string;
  passCount?: number;
  submitCount?: number;
}

interface ProblemResult {
  problemId: number;
  solved: boolean;
  firstSolve: boolean;
  wrongCount: number;
  solveMinutes?: number;
  solveTime?: string;
}

const balloonColors = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#38bdf8',
  '#2563eb',
  '#a855f7',
  '#dc2626',
  '#92400e',
  '#0f766e',
  '#db2777',
  '#0891b2',
  '#4c0519',
];

const CompetitionRanklist: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [now, setNow] = useState(() => Date.now());

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
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadRanklist();
    }
  }, [passwordVerified, competition]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    }
  };

  const loadRanklist = async () => {
    setLoading(true);
    try {
      const data = await api.get('/competition/ranklist-detail', {
        params: { id: id },
      });
      if (data.code === 200) {
        setProblems(data.data?.problems || []);
        setUsers(data.data?.users || []);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载排行榜失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds) return '00:00:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const formatBoardTime = (seconds: number) => {
    if (!seconds) return '0';
    return String(seconds);
  };

  const formatCountdown = () => {
    if (!competition?.endTime) return '00:00:00';
    const end = new Date(competition.endTime).getTime();
    if (Number.isNaN(end) || end <= now) return '00:00:00';
    return formatTime(Math.floor((end - now) / 1000));
  };

  const problemHeaders = useMemo(() => problems.map((problem, index) => ({
    ...problem,
    label: problem.label || String.fromCharCode(65 + index),
    color: balloonColors[index % balloonColors.length],
    stat: `${problem.passCount || 0}/${problem.submitCount || 0}`,
  })), [problems]);

  const getProblemCellClassName = (result?: ProblemResult) => {
    const baseClassName = 'relative whitespace-nowrap px-1.5 py-3 text-center text-sm';
    if (!result) return `${baseClassName} bg-white`;
    if (result.solved) {
      return `${baseClassName} ${result.firstSolve ? 'bg-[#93d093]' : 'bg-[#c8e6c9]'} text-[#333]`;
    }
    if ((result.wrongCount || 0) > 0) {
      return `${baseClassName} bg-[#ff9999]`;
    }
    return `${baseClassName} bg-white`;
  };

  const renderProblemCell = (result?: ProblemResult) => {
    if (!result) return null;
    if (result.solved) {
      return (
        <>
          <span className="block text-base font-semibold leading-[1.3] tracking-[-0.02em]">{result.solveTime}</span>
          <span className="absolute right-2 top-[5px] text-[11px] font-bold opacity-90">+{result.wrongCount || 0}</span>
        </>
      );
    }
    if ((result.wrongCount || 0) > 0) {
      return <span className="text-base font-bold text-[#b91c1c]">-{result.wrongCount}</span>;
    }
    return null;
  };

  if (loading && !competition) {
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
    <div className="min-h-screen bg-[#fcfcfc] text-[#333]">
      <div 
        className="sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--gemini-surface)',
          borderBottom: '1px solid var(--gemini-border-light)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Space size="large">
            <Link to={`/competition/${id}`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <UnorderedListOutlined /> 比赛详情
              </Button>
            </Link>
            <Button type="link" className="!font-medium" style={{ color: 'var(--gemini-accent-strong)' }}>
              <TrophyOutlined /> 比赛排行榜
            </Button>
            <Link to={`/competition/${id}/submissions`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <HistoryOutlined /> 比赛提交记录
              </Button>
            </Link>
          </Space>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1650px] px-5 py-6">
        {passwordVerified ? (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center">
                <svg viewBox="0 0 100 100" className="h-14 w-14">
                  <circle cx="35" cy="35" r="18" fill="none" stroke="#e11d48" strokeWidth="5" />
                  <circle cx="65" cy="35" r="18" fill="none" stroke="#2563eb" strokeWidth="5" />
                  <circle cx="35" cy="65" r="18" fill="none" stroke="#f59e0b" strokeWidth="5" />
                  <circle cx="65" cy="65" r="18" fill="none" stroke="#16a34a" strokeWidth="5" />
                </svg>
              </div>
              <div className="min-w-0 flex-1 text-center">
                <Title level={1} className="!mb-2 !text-3xl !font-bold !tracking-[0.25em] !text-gray-800">
                  {competition.title}
                </Title>
              </div>
              <div className="shrink-0 rounded border-4 border-inset border-[#333] bg-black px-3 py-1 font-mono text-[2.8rem] leading-none text-[#00ff00] shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                {formatCountdown()}
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-lg bg-white py-16">
                <Spin size="large" tip="榜单加载中..." />
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg bg-white py-16">
                <Empty description="暂无排名数据" />
              </div>
            ) : (
              <div className="h-[calc(100vh-180px)] overflow-auto">
                <table className="w-max table-fixed border-separate border-spacing-[1px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 w-[55px] bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">排名</th>
                      <th className="sticky left-[55px] z-20 w-[300px] bg-white py-2.5 pl-5 text-left text-[13px] font-normal text-[#777]">队伍</th>
                      <th className="w-20 bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">过题数</th>
                      <th className="w-20 bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">总用时</th>
                      {problemHeaders.map((problem) => (
                        <th key={problem.id} className="w-[85px] bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">
                          <div className="flex items-center justify-center gap-1.5">
                            <svg className="h-[30px] w-[18px]" viewBox="0 0 20 34">
                              <path fill={problem.color} d="M10 0 C4.5 0 0 4.5 0 10 C0 15.5 4.5 22 10 24 C15.5 22 20 15.5 20 10 C20 4.5 15.5 0 10 0" />
                              <path fill={problem.color} d="M8 23 L12 23 L10 27 Z" />
                              <path d="M10 27 C8.5 29 11.5 31 10 34" fill="none" stroke="#777" strokeWidth="1" strokeLinecap="round" />
                            </svg>
                            <div className="flex flex-col items-start leading-tight">
                              <span className="text-base font-bold text-gray-700">{problem.label}</span>
                              <span className="block text-[11px] text-[#999]">{problem.stat}</span>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id || user.name}>
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-1.5 py-3 text-center text-sm font-bold text-gray-500">{index + 1}</td>
                        <td className="sticky left-[55px] z-10 w-[300px] truncate whitespace-nowrap bg-white py-3 pl-5 pr-1.5 text-left text-sm font-medium text-[#444]">{user.name}</td>
                        <td className="whitespace-nowrap bg-white px-1.5 py-3 text-center text-sm font-bold">{user.passCount || 0}</td>
                        <td className="whitespace-nowrap bg-white px-1.5 py-3 text-center text-sm text-gray-500">{formatBoardTime(user.penaltyTime || 0)}</td>
                        {problemHeaders.map((problem, problemIndex) => {
                          const result = user.problems?.[problemIndex];
                          return (
                            <td key={`${user.id || user.name}-${problem.id}`} className={getProblemCellClassName(result)}>
                              {renderProblemCell(result)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : (
          <div className="gemini-card text-center py-12">
            <Text style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看排行榜</Text>
          </div>
        )}
      </div>

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

export default CompetitionRanklist;
