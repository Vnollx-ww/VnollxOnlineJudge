import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  solvedCount: number;
}

export interface Problem {
  id: number;
  title: string;
  difficulty?: string;
  isSolved: boolean;
  submitCount: number;
  passCount: number;
}

export const PROBLEMS_BATCH_SIZE = 20;

export const usePracticeDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [practice, setPractice] = useState<Practice | null>(null);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProblems, setHasMoreProblems] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const loadPracticeData = async () => {
    setLoading(true);
    try {
      const [practiceRes, problemsRes] = await Promise.all([
        practiceApi.get<Practice>(id) as Promise<ApiResponse<Practice>>,
        practiceApi.problems<Problem[]>(id, { pageNum: 1, pageSize: PROBLEMS_BATCH_SIZE }) as Promise<ApiResponse<Problem[]>>,
      ]);
      if (practiceRes.code === 200) setPractice(practiceRes.data);
      if (problemsRes.code === 200) {
        const firstPageProblems = problemsRes.data || [];
        setProblems(firstPageProblems);
        setCurrentPage(1);
        const totalProblemCount = practiceRes.code === 200 ? (practiceRes.data?.problemCount || 0) : 0;
        setHasMoreProblems(firstPageProblems.length < totalProblemCount);
      }
    } catch (error) {
      toast.error('加载练习数据失败');
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
    loadPracticeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadMoreProblems = useCallback(async () => {
    if (!id || loading || loadingMore || !hasMoreProblems) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const problemsRes = (await practiceApi.problems<Problem[]>(id, { pageNum: nextPage, pageSize: PROBLEMS_BATCH_SIZE })) as ApiResponse<Problem[]>;
      if (problemsRes.code === 200) {
        const nextBatch = problemsRes.data || [];
        const nextProblems = [...problems, ...nextBatch];
        setProblems(nextProblems);
        setCurrentPage(nextPage);
        const totalProblemCount = practice?.problemCount || 0;
        setHasMoreProblems(nextProblems.length < totalProblemCount);
      }
    } catch (error) {
      console.error(error);
      toast.error('加载更多题目失败');
    } finally {
      setLoadingMore(false);
    }
  }, [id, loading, loadingMore, hasMoreProblems, currentPage, practice, problems]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || !hasMoreProblems || loading || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) void loadMoreProblems(); },
      { root: null, rootMargin: '120px 0px', threshold: 0.1 }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreProblems, loading, loadingMore, loadMoreProblems]);

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const calculateProgress = () => {
    if (!practice || practice.problemCount === 0) return 0;
    return Math.round((practice.solvedCount / practice.problemCount) * 100);
  };

  const handleProblemClick = (problemId: number) => {
    navigate(`/problem/${problemId}`, { state: { from: 'practice', practiceId: id } });
  };

  return {
    id,
    navigate,
    practice,
    problems,
    loading,
    hasMoreProblems,
    loadingMore,
    loadMoreRef,
    loadPracticeData,
    formatTime,
    calculateProgress,
    handleProblemClick,
  };
};
