import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography,
  Space,
  Modal,
  Spin,
  Empty,
} from 'antd';
import toast from 'react-hot-toast';
import { LockOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import Input from '../../components/Input';

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

const BalloonIcon = ({ color }: { color: string }) => (
  <svg className="h-9 w-9 shrink-0" viewBox="0 0 48 48" fill="none">
    <path
      d="M34 16C35 8 31.1274 4 24.1274 4C17.1274 4 13 9 14 16C15 23 21.2548 28 24.1274 28C27 28 33 24 34 16Z"
      fill={color}
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M25 28C23 28.9697 20 31.8889 20 35C20 38.1111 30 36.4444 30 39.5556C30 42.6667 19 44 19 44"
      fill="none"
      stroke="#888"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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
    if (!result) return <span className="text-base font-bold text-[#bdbdbd]">·</span>;
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
    return <span className="text-base font-bold text-[#bdbdbd]">·</span>;
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
    <div className="w-full text-[#333]">
      <div className="w-full">
        {passwordVerified ? (
          <div className="rounded-3xl bg-white p-5">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div
                className="h-14 w-[13.25rem] shrink-0 bg-contain bg-left bg-no-repeat"
                style={{ backgroundImage: 'url("http://111.230.105.54:9000/cover/6b1e0341-7a1c-4bbb-9716-015f86c00cd1.png")' }}
              >
              </div>
              <div className="min-w-0 flex-1 text-center">
                <Title level={1} className="!mb-0 !text-3xl !font-bold !tracking-[0.25em] !text-gray-800">
                  {competition.title}
                </Title>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-3">
                <div className="rounded border-4 border-inset border-[#333] bg-black px-3 py-1 font-mono text-[2.8rem] leading-none text-[#00ff00] shadow-[0_0_10px_rgba(0,0,0,0.5)]">
                  {formatCountdown()}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center rounded-lg py-16">
                <Spin size="large" tip="榜单加载中..." />
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-lg py-16">
                <Empty description="暂无排名数据" />
              </div>
            ) : (
              <div className="h-[calc(100vh-220px)] overflow-auto rounded-2xl">
                <table className="w-max table-fixed border-separate border-spacing-[1px]">
                  <thead>
                    <tr>
                      <th className="sticky left-0 z-20 w-[55px] bg-white/75 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">排名</th>
                      <th className="sticky left-[55px] z-20 w-[300px] bg-white/75 py-2.5 pl-5 text-left text-[13px] font-normal text-[#777] backdrop-blur-[2px]">队伍</th>
                      <th className="sticky left-[355px] z-20 w-20 bg-white/75 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">过题数</th>
                      <th className="sticky left-[435px] z-20 w-20 bg-white/75 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">总用时</th>
                      {problemHeaders.map((problem) => (
                        <th key={problem.id} className="w-[85px] bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">
                          <div className="flex items-center justify-center -space-x-1">
                            <BalloonIcon color={problem.color} />
                            <div className="flex flex-col items-center leading-tight">
                              <span className="text-base font-bold text-gray-700">{problem.label}</span>
                              <span className="block text-[11px] text-[#999]">{problem.stat}</span>
                            </div>
                            <div className="w-2"></div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id || user.name}>
                        <td className="sticky left-0 z-10 whitespace-nowrap bg-white/75 px-1.5 py-3 text-center text-sm font-bold text-gray-500 backdrop-blur-[2px]">{index + 1}</td>
                        <td className="sticky left-[55px] z-10 w-[300px] truncate whitespace-nowrap bg-white/75 py-3 pl-5 pr-1.5 text-left text-sm font-medium text-[#444] backdrop-blur-[2px]">{user.name}</td>
                        <td className="sticky left-[355px] z-10 whitespace-nowrap bg-white/75 px-1.5 py-3 text-center text-sm font-bold backdrop-blur-[2px]">{user.passCount || 0}</td>
                        <td className="sticky left-[435px] z-10 whitespace-nowrap bg-white/75 px-1.5 py-3 text-center text-sm text-gray-500 backdrop-blur-[2px]">{formatBoardTime(user.penaltyTime || 0)}</td>
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
          </div>
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
