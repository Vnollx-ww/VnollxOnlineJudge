import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { problemApi, tagApi, userApi } from '@/lib';
import { isAuthenticated, getUserInfo } from '@/utils/auth';
import type { ApiResponse } from '@/types';

export interface Problem {
  id: number;
  title: string;
  difficulty: string;
  submitCount: number;
  passCount: number;
}

export interface TagItem {
  name: string;
}

export const PROBLEMS_PAGE_SIZE = 15;

export const useProblems = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());

  const pageSize = PROBLEMS_PAGE_SIZE;

  const loadSolvedProblems = async () => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo?.id) return;
      const res = (await userApi.getSolvedProblems<{ problemId: number }[]>(userInfo.id)) as ApiResponse<{ problemId: number }[]>;
      if (res.code === 200 && res.data) {
        setSolvedIds(new Set(res.data.map((p) => p.problemId)));
      }
    } catch (error) {
      console.error('加载已解决题目失败:', error);
    }
  };

  const loadTags = async () => {
    try {
      const data = (await tagApi.list<TagItem[]>()) as ApiResponse<TagItem[]>;
      if (data.code === 200) {
        setTags(data.data || []);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  const loadProblems = async (page: number) => {
    setLoading(true);
    try {
      const keyword = searchKeyword.trim();
      const params: Record<string, string> = {
        offset: String((page - 1) * pageSize),
        size: String(pageSize),
      };
      if (keyword) params.keyword = keyword;
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');

      const data = (await problemApi.list<Problem[]>(params)) as ApiResponse<Problem[]>;
      if (data.code === 200) setProblems(data.data || []);

      const countParams: Record<string, string> = {};
      if (keyword) countParams.keyword = keyword;
      if (selectedTags.length > 0) countParams.tags = selectedTags.join(',');
      const countData = (await problemApi.count(countParams)) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error) {
      toast.error('加载题目列表失败');
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
    loadTags();
    loadSolvedProblems();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    loadProblems(1);
  }, [searchKeyword, selectedTags]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProblems(page);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));
  };

  const resetFilters = () => {
    setSearchKeyword('');
    setSelectedTags([]);
  };

  return {
    problems,
    tags,
    loading,
    currentPage,
    total,
    pageSize,
    searchKeyword,
    setSearchKeyword,
    selectedTags,
    tagPanelOpen,
    setTagPanelOpen,
    solvedIds,
    handlePageChange,
    toggleTag,
    resetFilters,
    navigate,
  };
};
