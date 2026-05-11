import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userApi } from '@/lib';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface ProfileUser {
  id: number;
  name: string;
  signature?: string;
  avatar?: string;
  submitCount: number;
  passCount: number;
}

export interface SolvedProblem {
  problemId: number;
  problemName?: string;
}

export interface DailySubmission {
  date: string;
  count: number;
}

export interface LearningData {
  userId: number;
  userName: string;
  totalSolved: number;
  totalSubmit: number;
  passRate: number;
  dailySubmissions: DailySubmission[];
  solvedProblems: { problemId: number; title: string; difficulty?: string; tags?: string[] }[];
}

export const useUserProfile = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [learningData, setLearningData] = useState<LearningData | null>(null);
  const [learningLoading, setLearningLoading] = useState(false);
  const [learningDays, setLearningDays] = useState(30);
  const currentUserId = getUserInfo()?.id;
  const isOwnProfile = currentUserId === userId;

  const loadUserData = async () => {
    setLoading(true);
    try {
      const profileData = (await userApi.getById<ProfileUser>(userId)) as ApiResponse<ProfileUser>;
      if (profileData.code === 200) setUser(profileData.data);
      const solvedData = await userApi.getSolvedProblems<SolvedProblem[]>(userId!);
      if (solvedData.code === 200) setSolvedProblems(solvedData.data || []);
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
      const res = (await userApi.getLearningStats<LearningData>(learningDays)) as ApiResponse<LearningData>;
      if (res.code === 200 && res.data) setLearningData(res.data);
    } catch {
      setLearningData(null);
    } finally {
      setLearningLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！', { duration: 3000 });
      navigate('/login');
      return;
    }
    loadUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (user && isOwnProfile) loadLearningData();
    else setLearningData(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, learningDays, isOwnProfile]);

  const handleOpenAiLearningAdvice = () => {
    const passRate =
      user && user.submitCount > 0 ? Math.round((user.passCount / user.submitCount) * 10000) / 100 : 0;
    const solvedInfo =
      solvedProblems.length > 0
        ? solvedProblems.slice(0, 30).map((p) => `#${p.problemId} ${p.problemName || ''}`).join(', ')
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
    window.dispatchEvent(
      new CustomEvent('open-ai-assistant', {
        detail: { message: prompt, forceNewSession: true, modelId: 1 },
      }),
    );
  };

  return {
    user,
    solvedProblems,
    loading,
    learningData,
    learningLoading,
    learningDays,
    setLearningDays,
    isOwnProfile,
    handleOpenAiLearningAdvice,
  };
};
