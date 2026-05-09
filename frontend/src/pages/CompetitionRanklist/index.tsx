import { Fragment, useState, useEffect, useMemo } from 'react';
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
import { useCompetitionFirstBloodWebSocket } from '../../hooks/useCompetitionFirstBloodWebSocket';

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
  type?: string;
  members?: TeamMember[];
  passCount: number;
  penaltyTime: number;
  problems?: ProblemResult[];
  submissions?: SubmissionRank[];
}

interface TeamMember {
  userId: number;
  userName: string;
  realName?: string;
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

interface SubmissionRank {
  id: number;
  problemId: number;
  problemLabel?: string;
  status?: string;
  result: 'AC' | 'WA' | string;
  submitTime?: string;
  submitMinutes: number;
  displayTime: string;
}

type DetailSubmission = {
  id: number;
  problem: Problem & { color: string; label: string; stat: string };
  label: string;
  color: string;
  time: string;
  minutes: number;
  status: 'AC' | 'WA';
};

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

const BalloonIcon = ({ color, className = 'h-9 w-9', style }: { color: string; className?: string; style?: React.CSSProperties }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 48 48" fill="none" style={style}>
    <title>{color}</title>
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
  const [expandedUserKeys, setExpandedUserKeys] = useState<Set<string>>(() => new Set());
  const [hoveredSubmissionId, setHoveredSubmissionId] = useState<number | null>(null);
  const [ranklistSubmissions, setRanklistSubmissions] = useState<Record<string, SubmissionRank[]>>({});
  const [loadingSubmissionKeys, setLoadingSubmissionKeys] = useState<Set<string>>(() => new Set());
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
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadRanklist();
    }
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (!passwordVerified || !competition) return;

    const timer = window.setInterval(() => {
      loadRanklist(false);
    }, 10000);

    return () => window.clearInterval(timer);
  }, [passwordVerified, competition, id]);

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

  const loadRanklist = async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }
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
      if (showLoading) {
        setLoading(false);
      }
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
  const fixedColumnsWidth = 515;
  const problemColumnWidth = 90;
  const problemColumnsWidth = problemHeaders.length * problemColumnWidth;
  const ranklistTableWidth = fixedColumnsWidth + problemColumnsWidth;

  const getProblemCellClassName = (result?: ProblemResult) => {
    const baseClassName = "relative h-[52px] whitespace-nowrap px-1.5 py-2 text-center font-['Digital-7',sans-serif] text-[20px] leading-none text-[#222]";
    if (!result) return `${baseClassName} bg-white`;
    if (result.solved) {
      return `${baseClassName} ${result.firstSolve ? 'bg-[#98e6b1]' : (result.wrongCount || 0) > 0 ? 'bg-[#c7efd3]' : 'bg-[#e4f8e9]'}`;
    }
    if ((result.wrongCount || 0) > 0) {
      return `${baseClassName} bg-[#f7b2b2]`;
    }
    return `${baseClassName} bg-white`;
  };

  const renderProblemCell = (result?: ProblemResult) => {
    if (!result) return <span className="text-[20px] text-[#ccc]">.</span>;
    if (result.solved) {
      return (
        <>
          <span className="block leading-none">{result.solveTime}</span>
          <span className="absolute right-2 top-[8px] text-[12px] leading-none text-[#222]">+{result.wrongCount || 0}</span>
        </>
      );
    }
    if ((result.wrongCount || 0) > 0) {
      return <span className="text-[20px] leading-none text-[#222]">+{result.wrongCount}</span>;
    }
    return <span className="text-[20px] text-[#ccc]">.</span>;
  };

  const getUserKey = (user: User) => String(user.id ?? user.name);

  const loadRanklistSubmissions = async (user: User) => {
    const userKey = getUserKey(user);
    if (ranklistSubmissions[userKey] || loadingSubmissionKeys.has(userKey)) return;
    if (!user.id) {
      toast.error('该排行榜行缺少用户/队伍 ID，无法加载提交记录');
      return;
    }
    setLoadingSubmissionKeys((current) => new Set(current).add(userKey));
    try {
      const data = await api.get('/competition/ranklist-submissions', {
        params: { id, userId: user.id },
      });
      if (data.code === 200) {
        setRanklistSubmissions((current) => ({
          ...current,
          [userKey]: data.data || [],
        }));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '加载提交记录失败');
    } finally {
      setLoadingSubmissionKeys((current) => {
        const next = new Set(current);
        next.delete(userKey);
        return next;
      });
    }
  };

  const scrollToRecentSubmission = (submissionId: number) => {
    const target = document.getElementById(`rs-${submissionId}`);
    if (!target) return;
    const container = target.closest('[data-recent-submissions]');
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - (containerRect.height / 2) + (targetRect.height / 2);
    container.scrollTo({ top: scrollTop, behavior: 'smooth' });
  };

  const renderTeamDetail = (user: User, rank: number, expanded: boolean) => {
    if (!competition) return null;
    const userKey = getUserKey(user);
    const submissionsLoading = loadingSubmissionKeys.has(userKey);
    const submissions: DetailSubmission[] = (ranklistSubmissions[userKey] || []).flatMap((submission) => {
      const problem = problemHeaders.find((item) => item.id === submission.problemId);
      if (!problem) return [];
      const status: 'AC' | 'WA' = submission.result === 'AC' ? 'AC' : 'WA';
      return [{
        id: submission.id,
        problem,
        label: submission.problemLabel || problem?.label || '',
        color: problem?.color || '#adb5bd',
        time: submission.displayTime,
        minutes: submission.submitMinutes || 0,
        status,
      }];
    }).sort((a, b) => b.minutes - a.minutes);
    const recentSubmissions = submissions.slice(0, 24);
    const teamMembers = (user.members || []).slice(0, 3);
    const renderStatus = (status: 'AC' | 'WA') => (
      <span className={`font-mono text-[13px] font-semibold leading-tight border-b-[1.5px] pb-[1px] ${status === 'AC' ? 'border-[#22c55e] text-[#22c55e]' : 'border-[#ef4444] text-[#ef4444]'}`}>
        {status}
      </span>
    );

    return (
      <tr aria-hidden={!expanded}>
        <td colSpan={4} className="sticky left-0 z-10 bg-[#f3f4f8] p-0" id={`detail-${user.id}`} data-virtual-id={`detail-${user.id}`}>
          <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${expanded ? 'max-h-[430px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
            <div className="px-4 py-5">
              <div className="relative flex h-[380px] w-full flex-col rounded-xl bg-white p-5 text-gray-800 shadow-sm">
              <div className="flex min-h-0 flex-1 gap-4">
                <div className="flex w-24 shrink-0 flex-col justify-between">
                  {[0, 1, 2].map((memberIndex) => {
                    const member = teamMembers[memberIndex];
                    return (
                      <div key={member?.userId || memberIndex}>
                        <div className="mb-1 text-[14px] text-gray-400">成员 {memberIndex + 1}</div>
                        <div className="truncate text-[17px] text-gray-700">{member ? (member.realName || member.userName) : '-'}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col">
                  <div className="mb-2 text-[14px] text-gray-400">最近提交</div>
                  <div data-recent-submissions className="min-h-0 flex-1 space-y-[14px] overflow-y-auto pr-2 -mr-2 [&::-webkit-scrollbar-thumb:hover]:bg-gray-500 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-gray-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
                    {recentSubmissions.map((submission) => (
                      <div key={submission.id} className={`flex items-center text-[16px] rounded px-1 -mx-1 transition-colors ${hoveredSubmissionId === submission.id ? 'bg-blue-100' : ''}`} id={`rs-${submission.id}`} data-submission-id={submission.id} data-problem-id={submission.problem.id}>
                        <BalloonIcon color={submission.color} className="h-[28px] w-7" />
                        <span className="ml-1 w-3 text-gray-800">{submission.label}</span>
                        <span className="ml-auto font-mono text-[15px] tracking-wide text-gray-500">{submission.time}</span>
                        <span className="ml-3 w-5 text-center">{renderStatus(submission.status)}</span>
                      </div>
                    ))}
                    {recentSubmissions.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 text-gray-400">
                        {submissionsLoading ? (
                          <>
                            <svg className="h-6 w-6 animate-spin text-gray-300" viewBox="0 0 24 24" fill="none">
                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                              <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                            </svg>
                            <span className="text-[13px]">提交记录加载中</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-10 w-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                              <path d="M14 3v6h6" />
                              <path d="M9 14h6" />
                              <path d="M9 17h4" />
                            </svg>
                            <span className="text-[13px]">暂无提交记录</span>
                          </>
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </td>
        {problemHeaders.map((problem) => {
          const problemSubmissions = submissions.filter((submission) => submission.problem?.id === problem.id).sort((a, b) => b.minutes - a.minutes).slice(0, 8);
          return (
            <td key={`score-${rank}-${problem.id}`} className="w-[90px] bg-[#f3f4f8] p-0 align-top">
              <div className={`overflow-hidden transition-[max-height,opacity,transform] duration-300 ease-out ${expanded ? 'max-h-[430px] opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'}`}>
                <div className="score flex h-[380px] flex-col gap-1 bg-[#f3f4f8] p-1.5">
                  {problemSubmissions.map((submission) => (
                    <button
                      key={submission.id}
                      type="button"
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-sm px-1 py-0.5 font-mono text-[15px] transition-colors ${hoveredSubmissionId === submission.id ? 'bg-blue-100' : 'hover:bg-gray-100'}`}
                      id={`ps-${submission.id}`}
                      data-submission-id={submission.id}
                      data-problem-id={problem.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        scrollToRecentSubmission(submission.id);
                      }}
                      onMouseEnter={() => setHoveredSubmissionId(submission.id)}
                      onMouseLeave={() => setHoveredSubmissionId(null)}
                    >
                      <span className="text-[#495057]">{submission.time}</span>
                      <span className={`text-[12px] underline underline-offset-2 ${submission.status === 'AC' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                        {submission.status}
                      </span>
                    </button>
                  ))}
                  {problemSubmissions.length < 8 && Array.from({ length: 8 - problemSubmissions.length }).map((_, emptyIndex) => (
                    <div key={`empty-${problem.id}-${emptyIndex}`} className="flex items-center justify-center py-0.5 font-mono text-[15px] text-[#ccc]">-</div>
                  ))}
                </div>
              </div>
            </td>
          );
        })}
      </tr>
    );
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
    <div className="min-w-0 w-full max-w-full text-[#333]">
      <div className="min-w-0 w-full max-w-full">
        {passwordVerified ? (
          <div className="min-w-0 w-full max-w-full overflow-hidden rounded-3xl bg-white p-5">
            <div className="mb-6 flex min-w-0 max-w-full items-center justify-between gap-4 overflow-hidden">
              <div
                className="hidden h-14 w-[13.25rem] shrink-0 bg-contain bg-left bg-no-repeat md:block"
                style={{ backgroundImage: 'url("http://111.230.105.54:9000/cover/6b1e0341-7a1c-4bbb-9716-015f86c00cd1.png")' }}
              >
              </div>
              <div className="min-w-0 flex-1 text-center">
                <Title level={1} className="!mb-0 truncate !text-xl !font-bold !tracking-[0.08em] !text-gray-800 sm:!text-2xl lg:!text-3xl lg:!tracking-[0.25em]">
                  {competition.title}
                </Title>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-3">
                <div className="whitespace-nowrap rounded border-4 border-inset border-[#333] bg-black px-2 py-1 font-mono text-2xl leading-none text-[#00ff00] shadow-[0_0_10px_rgba(0,0,0,0.5)] sm:px-3 sm:text-4xl lg:text-[2.8rem]">
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
              <div className="h-[calc(100vh-220px)] w-full max-w-full overflow-auto rounded-2xl [scrollbar-gutter:stable]">
                <table className="table-fixed border-separate border-spacing-[1px]" style={{ width: ranklistTableWidth, minWidth: ranklistTableWidth }}>
                  <thead>
                    <tr>
                      <th className="sticky left-0 top-0 z-30 w-[55px] bg-white/90 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">排名</th>
                      <th className="sticky left-[55px] top-0 z-30 w-[300px] bg-white/90 py-2.5 pl-5 text-left text-[13px] font-normal text-[#777] backdrop-blur-[2px]">队伍</th>
                      <th className="sticky left-[355px] top-0 z-30 w-20 bg-white/90 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">过题数</th>
                      <th className="sticky left-[435px] top-0 z-30 w-20 bg-white/90 py-2.5 text-center text-[13px] font-normal text-[#777] backdrop-blur-[2px]">总用时</th>
                      {problemHeaders.map((problem) => (
                        <th key={problem.id} className="sticky top-0 z-20 w-[90px] bg-white py-2.5 text-center text-[13px] font-normal text-[#777]">
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
                    {users.map((user, index) => {
                      const userKey = getUserKey(user);
                      return (
                      <Fragment key={userKey}>
                        <tr
                          className="cursor-pointer"
                          onClick={() => setExpandedUserKeys((current) => {
                            const next = new Set(current);
                            if (next.has(userKey)) {
                              next.delete(userKey);
                            } else {
                              next.add(userKey);
                              loadRanklistSubmissions(user);
                            }
                            return next;
                          })}
                        >
                          <td className="sticky left-0 z-10 whitespace-nowrap bg-white/75 px-1.5 py-3 text-center text-sm font-bold text-gray-500 backdrop-blur-[2px]">{index + 1}</td>
                          <td className="sticky left-[55px] z-10 w-[300px] truncate whitespace-nowrap bg-white/75 py-3 pl-5 pr-1.5 text-left text-sm font-medium text-[#444] backdrop-blur-[2px]">
                            <button
                              type="button"
                              className={`max-w-full truncate text-left font-semibold hover:text-blue-700 ${expandedUserKeys.has(userKey) ? 'text-blue-700 underline' : 'text-blue-600'}`}
                            >
                              {user.name}
                            </button>
                          </td>
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
                        {renderTeamDetail(user, index + 1, expandedUserKeys.has(userKey))}
                      </Fragment>
                      );
                    })}
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
