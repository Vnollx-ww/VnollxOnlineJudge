import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { competitionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  number?: number;
}

export const calculateCompetitionStatus = (beginTime: string, endTime: string) => {
  const now = new Date();
  const begin = new Date(beginTime);
  const end = new Date(endTime);
  if (now < begin) return '暂未开始';
  if (now < end) return '进行中';
  return '已结束';
};

export const formatCompetitionTime = (timeStr: string) => {
  const date = new Date(timeStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatCompetitionDuration = (beginTime: string, endTime: string) => {
  const diff = Math.max(0, new Date(endTime).getTime() - new Date(beginTime).getTime());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}天${hours > 0 ? ` ${hours}小时` : ''}`;
  return `${Math.max(1, hours)}小时`;
};

export const useCompetitions = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [allCompetitions, setAllCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = (await competitionApi.list<Competition[]>()) as ApiResponse<Competition[]>;
      if (data.code === 200) {
        const sorted = data.data.sort(
          (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime(),
        );
        setAllCompetitions(sorted);
        setCompetitions(sorted);
      }
    } catch (error) {
      toast.error('加载比赛列表失败');
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
    loadCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = allCompetitions.filter((comp) => {
      const status = calculateCompetitionStatus(comp.beginTime, comp.endTime);
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      const matchKeyword = !normalizedKeyword || comp.title.toLowerCase().includes(normalizedKeyword);
      return matchStatus && matchKeyword;
    });
    setCompetitions(filtered);
  }, [statusFilter, keyword, allCompetitions]);

  const handleJoin = async (id: number, status: string) => {
    if (status === '暂未开始') {
      toast('比赛暂未开始，无法进入', { icon: '⚠️' });
      return;
    }
    try {
      const data = (await competitionApi.participation<void>(id)) as ApiResponse<void>;
      if (data.code === 200) {
        navigate(`/competition/${id}`);
      } else {
        toast.error((data as any).msg || '无权参加该比赛');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '无权参加该比赛');
    }
  };

  return {
    competitions,
    loading,
    statusFilter,
    setStatusFilter,
    keyword,
    setKeyword,
    handleJoin,
  };
};
