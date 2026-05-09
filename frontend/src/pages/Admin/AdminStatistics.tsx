import { useState, useEffect } from 'react';
import { Card, Tabs, Spin, Progress, Statistic, Button, DataTable, DataColumn, Grid } from '@/components';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AlertCircle, BarChart3, RefreshCw, BookOpen, Users, Code2, Trophy, GraduationCap, TrendingUp } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
import type { ApiResponse } from '@/types';

interface SolvedProblemItem {
  problemId: number;
  title: string;
  difficulty?: string;
  tags?: string[];
}

interface LearningAnalytics {
  userId: number;
  userName: string;
  totalSolved: number;
  totalSubmit: number;
  passRate: number;
  dailySubmissions: DailySubmission[];
  solvedProblems: SolvedProblemItem[];
}

interface PracticeProgressItem {
  problemId: number;
  title: string;
  solvedCount: number;
}

interface TeachingProgressItem {
  practiceId: number;
  practiceTitle: string;
  totalProblems: number;
  problemProgressList: PracticeProgressItem[];
}

interface ErrorPatternStat {
  status: string;
  count: number;
}

interface LanguageStat {
  language: string;
  count: number;
}

interface DailySubmission {
  date: string;
  count: number;
}

interface PlatformStats {
  problemCount: number;
  userCount: number;
  submissionCount: number;
  competitionCount: number;
  dailySubmissions: DailySubmission[];
  languageDistribution: LanguageStat[];
}

const CHART_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#d93025', '#9334e6', '#0d9488', '#ea580c', '#4f46e5'];

const CHART_ANIMATION = {
  duration: 1200,
  easing: 'ease-out' as const,
  begin: 0,
};

const AdminStatistics: React.FC = () => {
  const [errorPatterns, setErrorPatterns] = useState<ErrorPatternStat[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [loadingError, setLoadingError] = useState(false);
  const [loadingPlatform, setLoadingPlatform] = useState(false);
  const [platformDays, setPlatformDays] = useState(30);
  const [learningData, setLearningData] = useState<LearningAnalytics | null>(null);
  const [loadingLearning, setLoadingLearning] = useState(false);
  const [learningDays, setLearningDays] = useState(30);
  const [learningUid, setLearningUid] = useState<number>(0);
  const [userOptions, setUserOptions] = useState<{ id: number; name: string }[]>([]);
  const [loadingUserOptions, setLoadingUserOptions] = useState(false);
  const [teachingProgress, setTeachingProgress] = useState<TeachingProgressItem[]>([]);
  const [loadingTeaching, setLoadingTeaching] = useState(false);
  const [teachingPracticeId, setTeachingPracticeId] = useState<number>(0);
  const [practiceOptions, setPracticeOptions] = useState<{ id: number; title: string }[]>([]);
  const [loadingPracticeOptions, setLoadingPracticeOptions] = useState(false);

  const loadErrorPatterns = async () => {
    setLoadingError(true);
    try {
      const res = await api.get('/admin/statistics/error-patterns') as ApiResponse<ErrorPatternStat[]>;
      if (res.code === 200 && res.data) {
        setErrorPatterns(res.data);
      }
    } catch {
      setErrorPatterns([]);
    } finally {
      setLoadingError(false);
    }
  };

  const loadPlatformStats = async () => {
    setLoadingPlatform(true);
    try {
      const res = await api.get('/admin/statistics/platform', {
        params: { days: platformDays },
      }) as ApiResponse<PlatformStats>;
      if (res.code === 200 && res.data) {
        setPlatformStats(res.data);
      } else {
        setPlatformStats(null);
      }
    } catch {
      setPlatformStats(null);
    } finally {
      setLoadingPlatform(false);
    }
  };

  useEffect(() => {
    loadErrorPatterns();
  }, []);

  useEffect(() => {
    loadPlatformStats();
  }, [platformDays]);

  useEffect(() => {
    loadUserOptions();
  }, []);

  useEffect(() => {
    loadPracticeOptions();
  }, []);

  useEffect(() => {
    loadLearningAnalytics();
  }, [learningDays, learningUid]);

  useEffect(() => {
    loadTeachingProgress();
  }, [teachingPracticeId]);

  const loadUserOptions = async () => {
    setLoadingUserOptions(true);
    try {
      const res = await api.get('/admin/user/list', { params: { pageNum: 1, pageSize: 500 } }) as ApiResponse<{ id: number; name: string }[]>;
      if (res.code === 200 && res.data) {
        setUserOptions(res.data);
      } else {
        setUserOptions([]);
      }
    } catch {
      setUserOptions([]);
    } finally {
      setLoadingUserOptions(false);
    }
  };

  const loadPracticeOptions = async () => {
    setLoadingPracticeOptions(true);
    try {
      const res = await api.get('/admin/practice/list', { params: { pageNum: 1, pageSize: 500 } }) as ApiResponse<{ id: number; title: string }[]>;
      if (res.code === 200 && res.data) {
        setPracticeOptions(res.data);
      } else {
        setPracticeOptions([]);
      }
    } catch {
      setPracticeOptions([]);
    } finally {
      setLoadingPracticeOptions(false);
    }
  };

  const loadLearningAnalytics = async () => {
    setLoadingLearning(true);
    try {
      const params: Record<string, string | number> = { days: learningDays };
      if (learningUid > 0) params.uid = learningUid;
      const res = await api.get('/admin/statistics/learning', { params }) as ApiResponse<LearningAnalytics>;
      if (res.code === 200 && res.data) {
        setLearningData(res.data);
      } else {
        setLearningData(null);
      }
    } catch {
      setLearningData(null);
    } finally {
      setLoadingLearning(false);
    }
  };

  const loadTeachingProgress = async () => {
    setLoadingTeaching(true);
    try {
      const params = teachingPracticeId > 0 ? { practiceId: teachingPracticeId } : {};
      const res = await api.get('/admin/statistics/teaching-progress', { params }) as ApiResponse<TeachingProgressItem[]>;
      if (res.code === 200 && res.data) {
        setTeachingProgress(res.data);
      } else {
        setTeachingProgress([]);
      }
    } catch {
      setTeachingProgress([]);
    } finally {
      setLoadingTeaching(false);
    }
  };

  const totalError = errorPatterns.reduce((s, i) => s + (i.count || 0), 0);

  const errorChartData = errorPatterns.map((item, idx) => ({
    name: item.status || '(空)',
    value: item.count || 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const languageChartData = (platformStats?.languageDistribution || []).map((item, idx) => ({
    name: item.language || '(空)',
    count: item.count || 0,
    fill: CHART_COLORS[idx % CHART_COLORS.length],
  }));

  const dailyChartData = (platformStats?.dailySubmissions || []).map((d) => ({
    date: d.date,
    count: d.count,
  }));

  return (
    <div className="gemini-card space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
          数据统计
        </h2>
      </div>

      <Tabs defaultActiveKey="error" centered>
        <Tabs.Panel
          id="error"
          label={
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                常见错误模式统计
              </span>
          }
        >
              <Card>
                <div className="flex justify-end mb-4">
                  <RefreshCw
                    className="w-5 h-5 cursor-pointer hover:opacity-70"
                    onClick={loadErrorPatterns}
                  />
                </div>
                <Spin spinning={loadingError}>
                  {errorPatterns.length > 0 && (
                    <div className="mb-6" style={{ height: 320 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={errorChartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={120}
                            paddingAngle={3}
                            cornerRadius={6}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                            isAnimationActive
                            animationBegin={CHART_ANIMATION.begin}
                            animationDuration={CHART_ANIMATION.duration}
                            animationEasing={CHART_ANIMATION.easing}
                          >
                            {errorChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => [`${value} 次`, '提交数']} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  <DataTable<ErrorPatternStat> rowKey="status" rows={errorPatterns} pagination={false} size="middle">
                    <DataColumn<ErrorPatternStat> header="判题状态" cell={(pattern) => pattern.status || '(空)'} />
                    <DataColumn<ErrorPatternStat> header="提交数" width={120} cell={(pattern) => pattern.count || 0} />
                    <DataColumn<ErrorPatternStat>
                      header="占比"
                      width={200}
                      cell={(pattern) => {
                        const percent = totalError > 0 ? ((pattern.count || 0) / totalError) * 100 : 0;
                        return <Progress percent={Math.round(percent * 10) / 10} size="small" />;
                      }}
                    />
                  </DataTable>
                  {!loadingError && errorPatterns.length === 0 && (
                    <div className="text-center py-8" style={{ color: 'var(--gemini-text-secondary)' }}>
                      暂无提交记录
                    </div>
                  )}
                </Spin>
              </Card>
        </Tabs.Panel>
        <Tabs.Panel
          id="platform"
          label={
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                平台数据分析
              </span>
          }
        >
              <div className="space-y-6">
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <span style={{ color: 'var(--gemini-text-secondary)' }}>统计维度</span>
                    <Select
                      value={platformDays}
                      onChange={setPlatformDays}
                      options={[
                        { value: 7, label: '最近 7 天' },
                        { value: 14, label: '最近 14 天' },
                        { value: 30, label: '最近 30 天' },
                        { value: 60, label: '最近 60 天' },
                      ]}
                      style={{ width: 140 }}
                    />
                    <RefreshCw
                      className="w-5 h-5 cursor-pointer hover:opacity-70"
                      onClick={loadPlatformStats}
                    />
                  </div>
                  <Spin spinning={loadingPlatform}>
                    {platformStats && (
                      <>
                        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                          <Card size="small" className="text-center">
                            <Statistic
                              title="题目总数"
                              value={platformStats.problemCount}
                              prefix={<BookOpen className="w-5 h-5" style={{ color: 'var(--gemini-accent)' }} />}
                            />
                          </Card>
                          <Card size="small" className="text-center">
                            <Statistic
                              title="用户总数"
                              value={platformStats.userCount}
                              prefix={<Users className="w-5 h-5" style={{ color: '#34a853' }} />}
                            />
                          </Card>
                          <Card size="small" className="text-center">
                            <Statistic
                              title="提交总数"
                              value={platformStats.submissionCount}
                              prefix={<Code2 className="w-5 h-5" style={{ color: '#f9ab00' }} />}
                            />
                          </Card>
                          <Card size="small" className="text-center">
                            <Statistic
                              title="比赛场次"
                              value={platformStats.competitionCount}
                              prefix={<Trophy className="w-5 h-5" style={{ color: '#9334e6' }} />}
                            />
                          </Card>
                        </div>

                        <Grid largeColumns={2}>
                          <Grid.Item>
                            <Card size="small" title="每日提交趋势（折线图）" className="mb-4">
                              {dailyChartData.length > 0 ? (
                                <div style={{ height: 280 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gemini-border)" />
                                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                      <YAxis tick={{ fontSize: 12 }} />
                                      <Tooltip
                                        formatter={(value: number) => [`${value} 次`, '提交数']}
                                        labelFormatter={(label) => `日期: ${label}`}
                                      />
                                      <Legend />
                                      <Line
                                        type="monotone"
                                        dataKey="count"
                                        name="提交数"
                                        stroke="#1a73e8"
                                        strokeWidth={2}
                                        dot={{ fill: '#1a73e8', r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                                        isAnimationActive
                                        animationBegin={CHART_ANIMATION.begin}
                                        animationDuration={CHART_ANIMATION.duration}
                                        animationEasing={CHART_ANIMATION.easing}
                                      />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="py-8 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                                  该时段暂无提交数据
                                </div>
                              )}
                            </Card>
                          </Grid.Item>
                          <Grid.Item>
                            <Card size="small" title="语言分布（饼图）" className="mb-4">
                              {languageChartData.length > 0 ? (
                                <div style={{ height: 280 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={languageChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={100}
                                        paddingAngle={3}
                                        cornerRadius={6}
                                        dataKey="count"
                                        nameKey="name"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
                                        isAnimationActive
                                        animationBegin={CHART_ANIMATION.begin}
                                        animationDuration={CHART_ANIMATION.duration}
                                        animationEasing={CHART_ANIMATION.easing}
                                      >
                                        {languageChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value: number) => [`${value} 次`, '提交数']} />
                                      <Legend />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="py-8 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                                  暂无语言分布数据
                                </div>
                              )}
                            </Card>
                          </Grid.Item>
                        </Grid>

                        <Grid largeColumns={2}>
                          <Grid.Item>
                            <Card size="small" title="每日提交量（柱状图）" className="mb-4">
                              {dailyChartData.length > 0 ? (
                                <div style={{ height: 280 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={dailyChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gemini-border)" />
                                      <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                      <YAxis tick={{ fontSize: 12 }} />
                                      <Tooltip
                                        formatter={(value: number) => [`${value} 次`, '提交数']}
                                        labelFormatter={(label) => `日期: ${label}`}
                                      />
                                      <Bar
                                        dataKey="count"
                                        name="提交数"
                                        fill="#1a73e8"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={48}
                                        isAnimationActive
                                        animationBegin={CHART_ANIMATION.begin}
                                        animationDuration={CHART_ANIMATION.duration}
                                        animationEasing={CHART_ANIMATION.easing}
                                      />
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="py-8 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                                  该时段暂无提交数据
                                </div>
                              )}
                            </Card>
                          </Grid.Item>
                          <Grid.Item>
                            <Card size="small" title="语言分布（柱状图）">
                              {languageChartData.length > 0 ? (
                                <div style={{ height: 280 }}>
                                  <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={languageChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gemini-border)" />
                                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                      <YAxis tick={{ fontSize: 12 }} />
                                      <Tooltip formatter={(value: number) => [`${value} 次`, '提交数']} />
                                      <Bar
                                        dataKey="count"
                                        name="提交数"
                                        radius={[6, 6, 0, 0]}
                                        maxBarSize={56}
                                        isAnimationActive
                                        animationBegin={CHART_ANIMATION.begin}
                                        animationDuration={CHART_ANIMATION.duration}
                                        animationEasing={CHART_ANIMATION.easing}
                                      >
                                        {languageChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.fill} />
                                        ))}
                                      </Bar>
                                    </BarChart>
                                  </ResponsiveContainer>
                                </div>
                              ) : (
                                <div className="py-8 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                                  暂无语言分布数据
                                </div>
                              )}
                            </Card>
                          </Grid.Item>
                        </Grid>

                        <div className="grid gap-4">
                          <div>
                            <Card size="small" title="数据明细">
                              <DataTable<DailySubmission> rowKey="date" rows={platformStats.dailySubmissions || []} pagination={{ pageSize: 10 }} size="small">
                                <DataColumn<DailySubmission> header="日期" width={140} cell={(day) => day.date} />
                                <DataColumn<DailySubmission> header="提交数" width={120} cell={(day) => day.count} />
                              </DataTable>
                            </Card>
                          </div>
                          <div>
                            <Card size="small" title="语言分布明细">
                              <DataTable<LanguageStat> rowKey="language" rows={platformStats.languageDistribution || []} pagination={false} size="small">
                                <DataColumn<LanguageStat> header="语言" width={120} cell={(language) => language.language} />
                                <DataColumn<LanguageStat> header="提交数" width={120} cell={(language) => language.count} />
                              </DataTable>
                            </Card>
                          </div>
                        </div>
                      </>
                    )}
                    {!loadingPlatform && !platformStats && (
                      <div className="text-center py-8" style={{ color: 'var(--gemini-text-secondary)' }}>
                        加载失败或暂无数据
                      </div>
                    )}
                  </Spin>
                </Card>
              </div>
        </Tabs.Panel>
        <Tabs.Panel
          id="learning"
          label={
              <span className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                学习数据分析
              </span>
          }
        >
              <Card>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <span style={{ color: 'var(--gemini-text-secondary)' }}>选择用户</span>
                  <Select
                    placeholder="当前用户"
                    showSearch
                    optionFilterProp="label"
                    value={learningUid}
                    onChange={(v) => setLearningUid(v ?? 0)}
                    loading={loadingUserOptions}
                    style={{ width: 220 }}
                    options={[
                      { value: 0, label: '当前用户' },
                      ...userOptions.map((u) => ({ value: u.id, label: `${u.name} (ID:${u.id})` })),
                    ]}
                  />
                  <Select
                    value={learningDays}
                    onChange={setLearningDays}
                    options={[
                      { value: 7, label: '最近 7 天' },
                      { value: 14, label: '最近 14 天' },
                      { value: 30, label: '最近 30 天' },
                      { value: 60, label: '最近 60 天' },
                    ]}
                    style={{ width: 120 }}
                  />
                  <Button type="primary" onClick={loadLearningAnalytics} loading={loadingLearning}>
                    查询
                  </Button>
                  <RefreshCw className="w-5 h-5 cursor-pointer hover:opacity-70" onClick={loadLearningAnalytics} />
                </div>
                <Spin spinning={loadingLearning}>
                  {learningData && (
                    <>
                      <Grid columns={2} mediumColumns={4} className="mb-4">
                        <Grid.Item>
                          <Card size="small" className="text-center">
                            <Statistic title="用户" value={learningData.userName} />
                          </Card>
                        </Grid.Item>
                        <Grid.Item>
                          <Card size="small" className="text-center">
                            <Statistic title="通过题数" value={learningData.totalSolved} />
                          </Card>
                        </Grid.Item>
                        <Grid.Item>
                          <Card size="small" className="text-center">
                            <Statistic title="总提交数" value={learningData.totalSubmit} />
                          </Card>
                        </Grid.Item>
                        <Grid.Item>
                          <Card size="small" className="text-center">
                            <Statistic title="通过率(%)" value={learningData.passRate} precision={1} suffix="%" />
                          </Card>
                        </Grid.Item>
                      </Grid>
                      {learningData.dailySubmissions && learningData.dailySubmissions.length > 0 && (
                        <Card size="small" title="近期提交趋势" className="mb-4">
                          <div style={{ height: 260 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart data={learningData.dailySubmissions} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--gemini-border)" />
                                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip formatter={(v: number) => [`${v} 次`, '提交数']} labelFormatter={(l) => `日期: ${l}`} />
                                <Line type="monotone" dataKey="count" name="提交数" stroke="#34a853" strokeWidth={2} dot={{ r: 4 }} isAnimationActive animationDuration={CHART_ANIMATION.duration} animationEasing={CHART_ANIMATION.easing} />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        </Card>
                      )}
                      <Card size="small" title="已通过题目列表">
                        <DataTable<SolvedProblemItem> rowKey="problemId" size="small" pagination={{ pageSize: 10 }} rows={learningData.solvedProblems || []}>
                          <DataColumn<SolvedProblemItem> header="题号" width={90} cell={(problem) => problem.problemId} />
                          <DataColumn<SolvedProblemItem> header="标题" cell={(problem) => problem.title} />
                          <DataColumn<SolvedProblemItem> header="难度" width={90} cell={(problem) => problem.difficulty || '-'} />
                          <DataColumn<SolvedProblemItem> header="标签" width={180} cell={(problem) => problem.tags?.length ? problem.tags.join(', ') : '-'} />
                        </DataTable>
                      </Card>
                    </>
                  )}
                  {!loadingLearning && !learningData && (
                    <div className="text-center py-8" style={{ color: 'var(--gemini-text-secondary)' }}>选择条件后点击查询</div>
                  )}
                </Spin>
              </Card>
        </Tabs.Panel>
        <Tabs.Panel
          id="teaching"
          label={
              <span className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                教学进度跟踪
              </span>
          }
        >
              <Card>
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <span style={{ color: 'var(--gemini-text-secondary)' }}>选择练习</span>
                  <Select
                    placeholder="全部练习"
                    showSearch
                    optionFilterProp="label"
                    value={teachingPracticeId}
                    onChange={(v) => setTeachingPracticeId(v ?? 0)}
                    loading={loadingPracticeOptions}
                    style={{ width: 280 }}
                    options={[
                      { value: 0, label: '全部练习' },
                      ...practiceOptions.map((p) => ({ value: p.id, label: p.title })),
                    ]}
                  />
                  <Button type="primary" onClick={loadTeachingProgress} loading={loadingTeaching}>查询</Button>
                  <RefreshCw className="w-5 h-5 cursor-pointer hover:opacity-70" onClick={loadTeachingProgress} />
                </div>
                <Spin spinning={loadingTeaching}>
                  {teachingProgress.length > 0 ? (
                    <div className="space-y-4">
                      {teachingProgress.map((p) => (
                        <Card key={p.practiceId} size="small" title={`${p.practiceTitle}（共 ${p.totalProblems} 题）`}>
                          <DataTable<PracticeProgressItem> rowKey="problemId" size="small" pagination={false} rows={p.problemProgressList || []}>
                            <DataColumn<PracticeProgressItem> header="题号" width={90} cell={(problem) => problem.problemId} />
                            <DataColumn<PracticeProgressItem> header="题目" cell={(problem) => problem.title} />
                            <DataColumn<PracticeProgressItem> header="通过人数" width={110} cell={(problem) => problem.solvedCount} />
                          </DataTable>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8" style={{ color: 'var(--gemini-text-secondary)' }}>
                      {!loadingTeaching ? '选择条件后点击查询或暂无练习数据' : ''}
                    </div>
                  )}
                </Spin>
              </Card>
        </Tabs.Panel>
      </Tabs>
    </div>
  );
};

export default AdminStatistics;

