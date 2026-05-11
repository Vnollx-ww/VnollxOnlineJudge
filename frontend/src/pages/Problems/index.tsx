import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { CheckCircle2, Circle, ChevronLeft, ChevronRight, Filter, Loader2, Search, X } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  submitCount: number;
  passCount: number;
  tags?: string[];
}

interface TagItem {
  name: string;
}

const Problems: React.FC = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());

  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

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

  const loadSolvedProblems = async () => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo?.id) return;
      const res = await api.get('/user/solved-problems', { 
        params: { uid: userInfo.id } 
      }) as ApiResponse<{ problemId: number }[]>;
      if (res.code === 200 && res.data) {
        setSolvedIds(new Set(res.data.map(p => p.problemId)));
      }
    } catch (error) {
      console.error('加载已解决题目失败:', error);
    }
  };

  const loadTags = async () => {
    try {
      const data = await api.get('/tag/list') as ApiResponse<TagItem[]>;
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
      if (keyword) {
        params.keyword = keyword;
      }
      if (selectedTags.length > 0) {
        params.tags = selectedTags.join(',');
      }

      const data = await api.get('/problem/list', { params }) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        const list = data.data || [];
        const enriched = await Promise.all(
          list.map(async (problem) => {
            if (problem.tags) return problem;
            try {
              const tagData = await api.get('/problem/tags', { params: { pid: problem.id } }) as ApiResponse<string[]>;
              return { ...problem, tags: tagData.code === 200 ? tagData.data || [] : [] };
            } catch {
              return { ...problem, tags: [] };
            }
          })
        );
        setProblems(enriched);
      }

      const countParams: Record<string, string> = {};
      if (keyword) {
        countParams.keyword = keyword;
      }
      if (selectedTags.length > 0) {
        countParams.tags = selectedTags.join(',');
      }
      const countData = await api.get('/problem/count', { params: countParams }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      toast.error('加载题目列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    setCurrentPage(nextPage);
    loadProblems(nextPage);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ));
  };

  const clearFilters = () => {
    setSearchKeyword('');
    setSelectedTags([]);
  };

  const getDifficultyClassName = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case '简单':
        return 'bg-green-50 text-green-600';
      case '中等':
        return 'bg-yellow-50 text-yellow-600';
      case '困难':
        return 'bg-red-50 text-red-500';
      default:
        return 'bg-slate-100 text-slate-500';
    }
  };

  const calculatePassRate = (submitCount: number, passCount: number) => {
    if (submitCount === 0) return '0%';
    return `${Math.round((passCount / submitCount) * 10000) / 100}%`;
  };

  return (
    <div className="min-h-full text-slate-800">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">题目列表</h1>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-col gap-4 lg:w-[70%]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="输入题目编号、名称..."
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 shadow-sm outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-blue-500"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
              />
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-sm text-slate-500">
                  <tr>
                    <th className="w-16 px-6 py-4 text-center font-semibold">状态</th>
                    <th className="w-16 px-4 py-4 font-semibold">题号</th>
                    <th className="px-4 py-4 font-semibold">题目名称</th>
                    <th className="w-24 px-4 py-4 font-semibold">难度</th>
                    <th className="w-24 px-4 py-4 text-right font-semibold">通过率</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          加载题目中...
                        </div>
                      </td>
                    </tr>
                  )}
                  {!loading && problems.map((problem) => {
                    const rate = calculatePassRate(problem.submitCount, problem.passCount);
                    return (
                      <tr
                        key={problem.id}
                        className="group cursor-pointer transition-colors hover:bg-blue-50/30"
                        onClick={() => navigate(`/problem/${problem.id}`)}
                      >
                        <td className="px-6 py-4 text-center">
                          {solvedIds.has(problem.id) ? (
                            <CheckCircle2 className="inline h-5 w-5 text-green-500" />
                          ) : (
                            <Circle className="inline h-5 w-5 text-slate-300" />
                          )}
                        </td>
                        <td className="px-4 py-4 font-mono text-sm text-slate-400">#{problem.id}</td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-slate-700 transition-colors group-hover:text-blue-600">
                            {problem.title}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {(problem.tags || []).slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${getDifficultyClassName(problem.difficulty)}`}>
                            {problem.difficulty}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`text-sm font-medium ${parseFloat(rate) < 15 ? 'text-red-400' : 'text-slate-600'}`}>
                            {rate}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && problems.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center text-slate-400">
                        未找到符合条件的题目
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm sm:flex-row">
              <span>共 {total} 题，当前第 {currentPage} / {totalPages} 页</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  上一页
                </button>
                <button
                  type="button"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  下一页
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <aside className="lg:w-[30%]">
            <div className="sticky top-6 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-700">
                  <Filter className="h-4 w-4" />
                  标签筛选
                </div>
                {(selectedTags.length > 0 || searchKeyword) && (
                  <button type="button" onClick={clearFilters} className="text-xs font-medium text-blue-500 hover:text-blue-600">
                    重置
                  </button>
                )}
              </div>

              {selectedTags.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-50 pb-4">
                  {selectedTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-xs text-white">
                      {tag}
                      <button type="button" onClick={() => toggleTag(tag)} className="rounded-full hover:bg-white/20">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="custom-scrollbar flex max-h-[500px] flex-wrap gap-2 overflow-y-auto pr-2">
                {tags.map((tag) => {
                  const selected = selectedTags.includes(tag.name);
                  return (
                    <button
                      key={tag.name}
                      type="button"
                      onClick={() => toggleTag(tag.name)}
                      className={`rounded-xl border px-3 py-1.5 text-sm transition-all duration-200 ${
                        selected
                          ? 'border-blue-200 bg-blue-50 font-medium text-blue-600 shadow-sm ring-2 ring-blue-100'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 border-t border-slate-50 pt-4 text-[11px] text-slate-400">
                <p>点击标签进行多选过滤。系统将显示同时包含所有已选标签的题目。</p>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
};

export default Problems;
