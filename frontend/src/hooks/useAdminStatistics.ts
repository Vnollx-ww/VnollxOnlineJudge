import { useEffect, useState } from 'react';
import { adminStatisticsApi, adminUserApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface SolvedProblemItem {
  problemId: number;
  title: string;
  difficulty?: string;
  tags?: string[];
}

export interface DailySubmission {
  date: string;
  count: number;
}

export interface LearningAnalytics {
  userId: number;
  userName: string;
  totalSolved: number;
  totalSubmit: number;
  passRate: number;
  dailySubmissions: DailySubmission[];
  solvedProblems: SolvedProblemItem[];
}

export interface ErrorPatternStat {
  status: string;
  count: number;
}

export interface LanguageStat {
  language: string;
  count: number;
}

export interface PlatformStats {
  problemCount: number;
  userCount: number;
  submissionCount: number;
  competitionCount: number;
  dailySubmissions: DailySubmission[];
  languageDistribution: LanguageStat[];
}

export const CHART_COLORS = ['#1a73e8', '#34a853', '#f9ab00', '#d93025', '#9334e6', '#0d9488', '#ea580c', '#4f46e5'];

export const CHART_ANIMATION = {
  duration: 1200,
  easing: 'ease-out' as const,
  begin: 0,
};

export type AdminStatisticsTab = 'error' | 'platform' | 'learning';

export const useAdminStatistics = () => {
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
  const [activeTab, setActiveTab] = useState<AdminStatisticsTab>('error');

  const loadErrorPatterns = async () => {
    setLoadingError(true);
    try {
      const res = (await adminStatisticsApi.errorPatterns<ErrorPatternStat[]>()) as ApiResponse<ErrorPatternStat[]>;
      if (res.code === 200 && res.data) setErrorPatterns(res.data);
    } catch {
      setErrorPatterns([]);
    } finally {
      setLoadingError(false);
    }
  };

  const loadPlatformStats = async () => {
    setLoadingPlatform(true);
    try {
      const res = (await adminStatisticsApi.platform<PlatformStats>(platformDays)) as ApiResponse<PlatformStats>;
      if (res.code === 200 && res.data) setPlatformStats(res.data);
      else setPlatformStats(null);
    } catch {
      setPlatformStats(null);
    } finally {
      setLoadingPlatform(false);
    }
  };

  const loadUserOptions = async () => {
    setLoadingUserOptions(true);
    try {
      const res = (await adminUserApi.list<{ id: number; name: string }[]>({ pageNum: 1, pageSize: 500 })) as ApiResponse<{ id: number; name: string }[]>;
      if (res.code === 200 && res.data) setUserOptions(res.data);
      else setUserOptions([]);
    } catch {
      setUserOptions([]);
    } finally {
      setLoadingUserOptions(false);
    }
  };

  const loadLearningAnalytics = async () => {
    setLoadingLearning(true);
    try {
      const params: Record<string, string | number> = { days: learningDays };
      if (learningUid > 0) params.uid = learningUid;
      const res = (await adminStatisticsApi.learning<LearningAnalytics>(params)) as ApiResponse<LearningAnalytics>;
      if (res.code === 200 && res.data) setLearningData(res.data);
      else setLearningData(null);
    } catch {
      setLearningData(null);
    } finally {
      setLoadingLearning(false);
    }
  };

  useEffect(() => {
    loadErrorPatterns();
  }, []);

  useEffect(() => {
    loadPlatformStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformDays]);

  useEffect(() => {
    loadUserOptions();
  }, []);

  useEffect(() => {
    loadLearningAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [learningDays, learningUid]);

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

  return {
    errorPatterns,
    platformStats,
    loadingError,
    loadingPlatform,
    platformDays,
    setPlatformDays,
    learningData,
    loadingLearning,
    learningDays,
    setLearningDays,
    learningUid,
    setLearningUid,
    userOptions,
    loadingUserOptions,
    activeTab,
    setActiveTab,
    loadErrorPatterns,
    loadPlatformStats,
    loadLearningAnalytics,
    totalError,
    errorChartData,
    languageChartData,
    dailyChartData,
  };
};
