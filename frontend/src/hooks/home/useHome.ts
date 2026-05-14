import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { statsApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface HomeStats {
  problemCount: number;
  userCount: number;
  submissionCount: number;
  competitionCount: number;
}

const openAuthModal = (mode: 'login' | 'register' = 'login') => {
  window.dispatchEvent(new CustomEvent('open-auth-modal', { detail: mode }));
};

export const useHome = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<HomeStats>({
    problemCount: 0,
    userCount: 0,
    submissionCount: 0,
    competitionCount: 0,
  });

  const loadStats = async () => {
    try {
      const [problemRes, userRes, submissionRes, competitionRes] = await Promise.all([
        statsApi.problemCount() as Promise<ApiResponse<number>>,
        statsApi.userCount() as Promise<ApiResponse<number>>,
        statsApi.submissionCount() as Promise<ApiResponse<number>>,
        statsApi.competitionCount() as Promise<ApiResponse<number>>,
      ]);

      setStats({
        problemCount: problemRes.code === 200 ? problemRes.data : 1000,
        userCount: userRes.code === 200 ? userRes.data : 5000,
        submissionCount: submissionRes.code === 200 ? submissionRes.data : 50000,
        competitionCount: competitionRes.code === 200 ? competitionRes.data : 100,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      setStats({
        problemCount: 1000,
        userCount: 5000,
        submissionCount: 50000,
        competitionCount: 100,
      });
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleStartCoding = () => {
    if (isAuthenticated()) {
      navigate('/problems');
    } else {
      toast('请先登录后开始刷题', { icon: '🔐', duration: 2000 });
      openAuthModal('login');
    }
  };

  const handleViewRank = () => {
    if (isAuthenticated()) {
      navigate('/ranklist');
    } else {
      toast('请先登录后查看榜单', { icon: '🔐', duration: 2000 });
      openAuthModal('login');
    }
  };

  const handleRegister = () => {
    if (isAuthenticated()) {
      toast('您已登录', { icon: '✅', duration: 2000 });
    } else {
      openAuthModal('register');
    }
  };

  return { stats, handleStartCoding, handleViewRank, handleRegister };
};
