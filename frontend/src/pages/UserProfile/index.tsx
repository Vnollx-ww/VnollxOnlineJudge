import { Link } from 'react-router-dom';
import { Spin, Tag, Avatar, Button, Tooltip } from '../../components';
import { TrendingUp, Target, Bot, BarChart3, CheckCircle2 } from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from 'recharts';
import { PermissionCode } from '../../constants/permissions';
import Select from '../../components/select';
import { usePermission } from '../../contexts/PermissionContext';
import { useUserProfile } from '@/hooks/useUserProfile';

const CHART_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#d93025', '#9334e6', '#0d9488'];

const UserProfile: React.FC = () => {
  const { hasPermission } = usePermission();
  const {
    user,
    solvedProblems,
    loading,
    learningData,
    learningLoading,
    learningDays,
    setLearningDays,
    isOwnProfile,
    handleOpenAiLearningAdvice,
  } = useUserProfile();

  if (loading) {
    return (
      <div className="min-h-full w-full flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <Spin spinning />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-full w-full flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
        <div className="gemini-card">用户不存在</div>
      </div>
    );
  }

  const passRate =
    user.submitCount > 0
      ? Math.round((user.passCount / user.submitCount) * 10000) / 100
      : 0;

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="w-full space-y-6">
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
                <h2 className="mb-1 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{user.name}</h2>
                <span style={{ color: 'var(--gemini-text-secondary)' }} className="text-base">
                  {user.signature || '这个人很懒，还没有个性签名'}
                </span>
              </div>
            </div>
            <div className="flex gap-4">
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>提交次数</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--gemini-accent-strong)' }}>{user.submitCount || 0}</span>
                </div>
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>通过题目</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--gemini-success)' }}>{user.passCount || 0}</span>
                </div>
              </div>
              <div 
                className="rounded-2xl min-w-[100px] p-4 text-center"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <div className="flex flex-col gap-1">
                  <span className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>通过率</span>
                  <span className="text-2xl font-bold" style={{ color: 'var(--gemini-warning)' }}>{passRate}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 学习进度管理 */}
        <div className="gemini-card">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
              <h3 className="m-0 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>学习进度管理</h3>
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
              {isOwnProfile && hasPermission(PermissionCode.AI_CHAT) && (
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
          <h3 className="mb-6 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>已解决问题列表</h3>
          {solvedProblems.length === 0 ? (
            <div className="py-12 text-center">
              <span style={{ color: 'var(--gemini-text-tertiary)' }}>暂无已解决问题</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {solvedProblems.map((problem) => (
                <Tooltip key={problem.problemId} title={problem.problemName || '查看题目'}>
                  <Link to={`/problem/${problem.problemId}`}>
                    <Tag color="blue" className="cursor-pointer hover:opacity-80 transition-opacity">
                      <CheckCircle2 className="inline w-3.5 h-3.5" /> #{problem.problemId}
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
