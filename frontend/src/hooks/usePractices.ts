import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { practiceApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface Practice {
  id: number;
  title: string;
  description?: string;
  createTime: string;
  problemCount: number;
  solvedCount?: number;
}

export const calculateProgress = (solvedCount: number = 0, problemCount: number) => {
  if (problemCount === 0) return 0;
  return Math.round((solvedCount / problemCount) * 100);
};

export const usePractices = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressFilter, setProgressFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = (await practiceApi.list<Practice[]>()) as ApiResponse<Practice[]>;
      if (data.code === 200) {
        setAllPractices(data.data || []);
        setPractices(data.data || []);
      }
    } catch (error) {
      toast.error('加载练习列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadPractices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = allPractices.filter((practice) => {
      const progress = calculateProgress(practice.solvedCount, practice.problemCount);
      const matchKeyword = !normalizedKeyword || practice.title.toLowerCase().includes(normalizedKeyword);
      const matchProgress =
        progressFilter === 'all' ||
        (progressFilter === 'unfinished' && progress < 100) ||
        (progressFilter === 'finished' && progress === 100);
      return matchKeyword && matchProgress;
    });
    setPractices(filtered);
  }, [progressFilter, keyword, allPractices]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
  };

  const handleEnter = (id: number) => navigate(`/practice/${id}`);

  return {
    practices,
    loading,
    progressFilter,
    setProgressFilter,
    keyword,
    setKeyword,
    formatTime,
    calculateProgress,
    handleEnter,
  };
};
