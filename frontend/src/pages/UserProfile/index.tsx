import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography,
  Avatar,
  Statistic,
  Tag,
  Spin,
  Tooltip,
  Button,
  Progress,
  Select,
} from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { TrendingUp, Target, Bot, BarChart3 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import { usePermission } from '../../contexts/PermissionContext';
import { PermissionCode } from '../../constants/permissions';
import type { ApiResponse } from '../../types';

const { Title, Text } = Typography;

interface User {
  id: number;
  name: string;
  signature?: string;
  avatar?: string;
  submitCount: number;
  passCount: number;
}

interface SolvedProblem {
  problemId: number;
  problemName?: string;
}

interface DailySubmission {
  date: string;
  count: number;
}

interface LearningData {
  userId: number;
  userName: string;
  totalSolved: number;
  totalSubmit: number;
  passRate: number;
  dailySubmissions: DailySubmission[];
  solvedProblems: { problemId: number; title: string; difficulty?: string; tags?: string[] }[];
}

const CHART_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#d93025', '#9334e6', '#0d9488'];

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [user, setUser] = useState<User | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [learningData, setLearningData] = useState<LearningData | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningDays, setLearningDays] = useState(30);
  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！', { duration: 3000 });
      navigate('/login');
      return;
    }
    loadUserData();
  }, [userId]);

  const loadUserData = async () => {
    setLoading(true);
    try {
      const profileData = await api.get('/user/profile');
      if (profileData.code === 200 && profileData.data.id === parseInt(userId!)) {
        setUser(profileData.data);
      } else {
        setUser(profileData.data);
      }

      const solvedData = await api.get('/user/solved-problems', {
        params: { uid: userId },
      });
      if (solvedData.code === 200) {
        setSolvedProblems(solvedData.data || []);
      }
    } catch (error) {
      toast.error('加载用户信息失败', { duration: 3000 });
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadLearningData = async () => {
    setLearningLoading(true);
    try {
      const res = await api.get('/user/learning-stats', {
        params: { days: learningDays },
      }) as ApiResponse<LearningData>;
      if (res.code === 200 && res.data) {
        setLearningData(res.data);
      }
    } catch {
      // fallback: construct from existing data
      setLearningData(null);
    } finally {
      setLearningLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadLearningData();
  }, [user, learningDays]);

  // 打开 AI 对话弹窗并自动创建新会话、用学习建议提示词发起提问（固定使用 modelId=1）
  const handleOpenAiLearningAdvice = () => {
    const passRate = user && user.submitCount > 0
      ? Math.round((user.passCount / user.submitCount) * 10000) / 100
      : 0;
    const solvedInfo = solvedProblems.length > 0
      ? solvedProblems.slice(0, 30).map(p => `#${p.problemId} ${p.problemName || ''}`).join(', ')
      : '暂无做题记录';
    const prompt = `你是编程学习顾问。请根据以下学生数据，生成个性化学习进度报告和改进建议：

【用户】${user?.name || '未知'}
【总提交数】${user?.submitCount || 0}
【通过题数】${user?.passCount || 0}
【通过率】${passRate}%
【近期已通过题目（最近30道）】${solvedInfo}

请从以下方面给出分析和建议：
1. **学习进度评估**：基于数据评估当前学习阶段和水平
2. **薄弱环节分析**：根据做题记录分析可能的薄弱知识点
3. **短期目标设定**：建议未来1-2周的具体学习目标
4. **长期发展规划**：建议3-6个月的学习路线图
5. **学习方法建议**：针对当前水平推荐高效的学习方法
6. **每日计划**：推荐每日练习量和时间安排

请使用Markdown格式，结构清晰，语言鼓励性。`;

    window.dispatchEvent(new CustomEvent('open-ai-assistant', {
      detail: {
        message: prompt,
        forceNewSession: true,
        modelId: 1,
      },
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <div className="gemini-card">用户不存在</div>
      </div>
    );
  }

  const passRate =
    user.submitCount > 0
      ? Math.round((user.passCount / user.submitCount) * 10000) / 100
      : 0;

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* 用户信息卡片 - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <Avatar
                size={80}
                src={user.avatar}
                style={{ 
                  background: user.avatar ? 'transparent' : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                  fontSize: '2rem'
                }}
              >
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
              <div>
                <Title level={2} className="!mb-1" style={{ color: 'var(--gemini-text-primary)' }}>{user.name}</Title>
                <Text style={{ color: 'var(--gemini-text-secondary)' }} className="text-base">
                  {user.signature || '这个人很懒，还没有个性签名'}
                </Text>
              </div>
            </div>
            <div className="flex gap-4">
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>提交次数</span>}
                  value={user.submitCount || 0}
                  valueStyle={{ color: 'var(--gemini-accent-strong)', fontWeight: 'bold' }}
                />
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>通过题目</span>}
                  value={user.passCount || 0}
                  valueStyle={{ color: 'var(--gemini-success)', fontWeight: 'bold' }}
                />
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Statistic
                  title={<span style={{ color: 'var(--gemini-text-tertiary)' }}>通过率</span>}
                  value={passRate}
                  suffix="%"
                  valueStyle={{ color: 'var(--gemini-warning)', fontWeight: 'bold' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 学习进度管理 */}
        <div className="gemini-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
              <Title level={3} className="!mb-0" style={{ color: 'var(--gemini-text-primary)' }}>学习进度管理</Title>
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={learningDays}
                onChange={setLearningDays}
                options={[
                  { value: 7, label: '最近 7 天' },
                  { value: 14, label: '最近 14 天' },
                  { value: 30, label: '最近 30 天' },
                  { value: 60, label: '最近 60 天' },
                ]}
                style={{ width: 130 }}
              />
              {hasPermission(PermissionCode.AI_CHAT) && (
                <>
                  <Button
                    type="primary"
                    icon={<Bot className="w-4 h-4" />}
                    onClick={handleOpenAiLearningAdvice}
                    style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
                  >
                    AI学习建议
                  </Button>
                </>
              )}
            </div>
          </div>

          <Spin spinning={learningLoading}>
            {learningData && (
              <>
                {/* 概览统计 */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#e8f0fe' }}>
                    <div className="text-2xl font-bold" style={{ color: '#1a73e8' }}>{learningData.totalSolved}</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--gemini-text-secondary)' }}>已通过题目</div>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#e6f4ea' }}>
                    <div className="text-2xl font-bold" style={{ color: '#34a853' }}>{learningData.totalSubmit}</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--gemini-text-secondary)' }}>总提交数</div>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#fef7e0' }}>
                    <div className="text-2xl font-bold" style={{ color: '#f9ab00' }}>{learningData.passRate?.toFixed(1)}%</div>
                    <div className="text-sm mt-1" style={{ color: 'var(--gemini-text-secondary)' }}>通过率</div>
                  </div>
                  <div className="rounded-2xl p-4 text-center" style={{ backgroundColor: '#f3e8fd' }}>
                    <div className="text-2xl font-bold" style={{ color: '#9334e6' }}>
                      {learningData.dailySubmissions?.length > 0 ? Math.round(learningData.dailySubmissions.reduce((s, d) => s + d.count, 0) / learningData.dailySubmissions.length * 10) / 10 : 0}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--gemini-text-secondary)' }}>日均提交</div>
                  </div>
                </div>

                {/* 通过率进度条 */}
                <div className="mb-6 rounded-2xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>学习进度</span>
                    <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                      {learningData.totalSolved} / {learningData.totalSubmit} 提交通过
                    </span>
                  </div>
                  <Progress
                    percent={learningData.passRate ? Math.round(learningData.passRate * 10) / 10 : 0}
                    strokeColor={{ '0%': '#1a73e8', '100%': '#34a853' }}
                    trailColor="#e8eaed"
                    strokeWidth={12}
                    className="!mb-0"
                  />
                </div>

                {/* 提交趋势图表 */}
                <div className="grid md:grid-cols-2 gap-6 mb-6">
                  <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>提交趋势</span>
                    </div>
                    {learningData.dailySubmissions && learningData.dailySubmissions.length > 0 ? (
                      <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={learningData.dailySubmissions} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip formatter={(v: number) => [`${v} 次`, '提交数']} />
                            <Line type="monotone" dataKey="count" stroke="#1a73e8" strokeWidth={2} dot={{ fill: '#1a73e8', r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center" style={{ height: 220, color: 'var(--gemini-text-disabled)' }}>该时段暂无提交数据</div>
                    )}
                  </div>

                  {/* 难度分布 */}
                  <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Target className="w-4 h-4" style={{ color: '#34a853' }} />
                      <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>难度分布</span>
                    </div>
                    {(() => {
                      const diffMap: Record<string, number> = {};
                      (learningData.solvedProblems || []).forEach(p => {
                        const d = p.difficulty || '未知';
                        diffMap[d] = (diffMap[d] || 0) + 1;
                      });
                      const diffData = Object.entries(diffMap).map(([name, value], idx) => ({ name, value, fill: CHART_COLORS[idx % CHART_COLORS.length] }));
                      return diffData.length > 0 ? (
                        <div style={{ height: 250 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                              <Pie data={diffData} cx="50%" cy="45%" innerRadius={35} outerRadius={65} paddingAngle={3} dataKey="value" nameKey="name">
                                {diffData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                              </Pie>
                              <RechartsTooltip formatter={(v: number) => [`${v} 题`, '数量']} />
                              <Legend wrapperStyle={{ paddingTop: 10 }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center" style={{ height: 220, color: 'var(--gemini-text-disabled)' }}>暂无难度分布数据</div>
                      );
                    })()}
                  </div>
                </div>

                {/* 标签知识覆盖 */}
                {(() => {
                  const tagMap: Record<string, number> = {};
                  (learningData.solvedProblems || []).forEach(p => {
                    (p.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; });
                  });
                  const tagData = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([name, count], idx) => ({ name, count, fill: CHART_COLORS[idx % CHART_COLORS.length] }));
                  return tagData.length > 0 ? (
                    <div className="rounded-2xl p-4 mb-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                      <span className="font-medium block mb-3" style={{ color: 'var(--gemini-text-primary)' }}>知识点覆盖 (Top 12)</span>
                      <div style={{ height: 220 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={tagData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e8eaed" />
                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <RechartsTooltip formatter={(v: number) => [`${v} 题`, '通过数']} />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={40}>
                              {tagData.map((entry, index) => <Cell key={index} fill={entry.fill} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : null;
                })()}
              </>
            )}
            {!learningLoading && !learningData && (
              <div className="text-center py-8" style={{ color: 'var(--gemini-text-disabled)' }}>暂无学习数据</div>
            )}
          </Spin>
        </div>

        {/* 已解决问题列表 - Gemini 风格 */}
        <div className="gemini-card">
          <Title level={3} className="!mb-6" style={{ color: 'var(--gemini-text-primary)' }}>已解决问题列表</Title>
          {solvedProblems.length === 0 ? (
            <div className="py-12 text-center">
              <Text style={{ color: 'var(--gemini-text-tertiary)' }}>暂无已解决问题</Text>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {solvedProblems.map((problem) => (
                <Tooltip key={problem.problemId} title={problem.problemName || '查看题目'}>
                  <Link to={`/problem/${problem.problemId}`}>
                    <Tag 
                      className="!text-sm !px-4 !py-1.5 cursor-pointer hover:opacity-80 transition-opacity !rounded-full !border-0"
                      style={{ 
                        backgroundColor: 'var(--gemini-accent)',
                        color: 'var(--gemini-accent-text)'
                      }}
                    >
                      <CheckCircleOutlined className="mr-1" /> #{problem.problemId}
                    </Tag>
                  </Link>
                </Tooltip>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
