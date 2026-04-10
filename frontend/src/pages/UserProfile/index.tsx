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
import { TrendingUp, Target, Bot, BarChart3, BookOpen } from 'lucide-react';
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

interface PracticeProgress {
  id: number;
  title: string;
  problemCount: number;
  solvedCount: number;
  creatorName?: string;
  isPublic: boolean;
  createTime: string;
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
  const [practiceProgress, setPracticeProgress] = useState<PracticeProgress[]>([]);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [aiContextLoading, setAiContextLoading] = useState(false);
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
    if (user) {
      loadLearningData();
      loadPracticeProgress();
    }
  }, [user, learningDays]);

  const loadPracticeProgress = async () => {
    setPracticeLoading(true);
    try {
      const res = await api.get('/practice/my-progress') as ApiResponse<PracticeProgress[]>;
      if (res.code === 200 && res.data) {
        setPracticeProgress(res.data);
      }
    } catch {
      setPracticeProgress([]);
    } finally {
      setPracticeLoading(false);
    }
  };

  const handleOpenAiLearningAdvice = async () => {
    setAiContextLoading(true);
    try {
      const res = await api.get('/user/ai-learning-context') as ApiResponse<{
        errorPatterns: { status: string; count: number }[];
        recentErrors: { problemId: number; problemName: string; status: string }[];
        practiceProgress: { practiceId: number; practiceTitle: string; totalProblems: number; solvedCount: number; creatorName: string }[];
        solvedProblems: { problemId: number; title: string; difficulty: string; tags: string[] }[];
        userId: number; userName: string; totalSubmit: number; totalSolved: number; passRate: number;
      }>;
      const ctx = res.code === 200 ? res.data : null;

      const errorSummary = ctx?.errorPatterns?.length
        ? ctx.errorPatterns.map(e => `${e.status}: ${e.count}次`).join(', ')
        : '暂无错误统计';
      const recentErrorInfo = ctx?.recentErrors?.length
        ? ctx.recentErrors.slice(0, 5).map(e => `#${e.problemId} ${e.problemName || ''} (${e.status})`).join(', ')
        : '暂无近期错题';
      const practiceSummary = ctx?.practiceProgress?.length
        ? ctx.practiceProgress.map(p => `【${p.practiceTitle}】${p.solvedCount}/${p.totalProblems}${p.creatorName ? ' (教师:' + p.creatorName + ')' : ''}`).join('\n')
        : '暂无练习进度';
      const difficultyMap: Record<string, number> = {};
      (ctx?.solvedProblems || []).forEach(p => { difficultyMap[p.difficulty || '未知'] = (difficultyMap[p.difficulty || '未知'] || 0) + 1; });
      const difficultySummary = Object.entries(difficultyMap).map(([k, v]) => `${k}:${v}题`).join(', ');
      const tagMap: Record<string, number> = {};
      (ctx?.solvedProblems || []).forEach(p => { (p.tags || []).forEach(t => { tagMap[t] = (tagMap[t] || 0) + 1; }); });
      const topTags = Object.entries(tagMap).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, v]) => `${k}:${v}题`);
      const dailyAvg = learningData?.dailySubmissions?.length
        ? Math.round(learningData.dailySubmissions.reduce((s, d) => s + d.count, 0) / learningData.dailySubmissions.length * 10) / 10
        : 0;

      const prompt = `你是编程学习顾问。请根据以下学生完整数据，生成深度个性化学习分析和改进建议：

【基本信息】
- 用户: ${user?.name || '未知'}
- 总提交数: ${user?.submitCount || 0} (日均${dailyAvg}次)
- 通过题数: ${user?.passCount || 0}
- 通过率: ${ctx?.passRate?.toFixed(1) || '0'}%

【练习进度】
${practiceSummary}

【能力分布】
- 难度分布: ${difficultySummary || '暂无'}
- 知识点覆盖(Top8): ${topTags.join(', ') || '暂无'}

【错误分析】
- 错误类型: ${errorSummary}
- 近期错题: ${recentErrorInfo}

请从以下维度给出专业分析和建议：
1. **学习阶段评估**：基于通过率和难度分布评估编程水平
2. **知识薄弱点诊断**：根据错误类型和错题识别需加强的知识点
3. **练习进度评价**：分析各练习表现，指出重点完成的练习
4. **个性化题目推荐**：基于能力和薄弱点推荐练习题目类型
5. **学习方法优化**：根据错误模式建议调试和代码审查方法
6. **阶段目标设定**：设定未来2周和3个月的具体目标
7. **每日训练计划**：建议每日练习量、难度配比和知识点策略

请使用Markdown格式，结构清晰，语言专业且鼓励性强。`;

      window.dispatchEvent(new CustomEvent('open-ai-assistant', {
        detail: { message: prompt, forceNewSession: true, modelId: 1 },
      }));
    } catch (error) {
      toast.error('获取AI分析数据失败');
      console.error(error);
    } finally {
      setAiContextLoading(false);
    }
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
                    loading={aiContextLoading}
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

        {/* 练习完成进度 */}
        <div className="gemini-card">
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
            <Title level={3} className="!mb-0" style={{ color: 'var(--gemini-text-primary)' }}>练习完成进度</Title>
          </div>
          <Spin spinning={practiceLoading}>
            {practiceProgress.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--gemini-text-disabled)' }}>暂无练习数据</div>
            ) : (
              <div className="space-y-4">
                {practiceProgress.map((practice) => (
                  <Link key={practice.id} to={`/practice/${practice.id}`} className="block">
                    <div className="rounded-2xl p-4 hover:shadow-md transition-shadow" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{practice.title}</span>
                          {practice.creatorName && (
                            <span className="ml-2 text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>教师: {practice.creatorName}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: practice.solvedCount === practice.problemCount && practice.problemCount > 0 ? 'var(--gemini-success)' : 'var(--gemini-accent-strong)' }}>
                          {practice.solvedCount} / {practice.problemCount} 题
                        </span>
                      </div>
                      <Progress
                        percent={practice.problemCount > 0 ? Math.round(practice.solvedCount / practice.problemCount * 100) : 0}
                        strokeColor={practice.solvedCount === practice.problemCount && practice.problemCount > 0 ? 'var(--gemini-success)' : { '0%': '#1a73e8', '100%': '#34a853' }}
                        trailColor="#e8eaed"
                        strokeWidth={8}
                        showInfo={false}
                        className="!mb-0"
                      />
                    </div>
                  </Link>
                ))}
              </div>
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
