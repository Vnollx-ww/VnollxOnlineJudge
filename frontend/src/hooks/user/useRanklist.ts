import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { userApi } from '@/lib';
import { isAuthenticated, getUserInfo } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface RankUser {
  id: number;
  name: string;
  passCount: number;
  submitCount: number;
  signature?: string;
  avatar?: string;
}

export interface DisplayRankUser extends RankUser {
  rank: number;
  passRate: string;
}

interface UserPageData {
  records: RankUser[];
  total: number;
  pageNum: number;
  pageSize: number;
}

type UserListData = UserPageData | RankUser[];

export const useRanklist = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<DisplayRankUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    const user = getUserInfo();
    if (user?.id) {
      setCurrentUserId(parseInt(user.id));
    }
  }, [navigate]);

  const loadRanking = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const data = (await userApi.list<UserListData>({ pageNum: page, pageSize: size })) as ApiResponse<UserListData>;
      if (data.code === 200) {
        const records = Array.isArray(data.data) ? data.data : data.data.records || [];
        const ranked = records.map((user, index) => ({
          ...user,
          rank: (page - 1) * size + index + 1,
          passRate:
            user.submitCount > 0
              ? ((user.passCount / user.submitCount) * 100).toFixed(2) + '%'
              : '0.00%',
        }));
        setUsers(ranked);
        setTotal(Array.isArray(data.data) ? data.data.length : data.data.total || 0);
      }
    } catch (error) {
      toast.error('加载排行榜失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRanking(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const chartData = useMemo(() => {
    return users.slice(0, 10).map((user) => ({
      name: user.name,
      AC: user.passCount,
      总数: user.submitCount,
    }));
  }, [users]);

  const handlePageChange = (page: number, size?: number) => {
    if (size && size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1);
      return;
    }
    setCurrentPage(page);
  };

  const handleUserClick = (userId: number) => {
    navigate(`/user/${userId}`);
  };

  return {
    users,
    total,
    loading,
    currentUserId,
    currentPage,
    pageSize,
    chartData,
    handlePageChange,
    handleUserClick,
  };
};
