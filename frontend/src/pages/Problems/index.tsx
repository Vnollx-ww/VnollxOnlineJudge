import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Pagination, Button } from 'antd';
import toast from 'react-hot-toast';
import { CheckCircle, ChevronDown, Circle, X } from 'lucide-react';
import { problemApi, tagApi, userApi } from '@/lib';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';
import Input from '../../components/input';

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  submitCount: number;
  passCount: number;
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
  const [tagPanelOpen, setTagPanelOpen] = useState(false);
  const [solvedIds, setSolvedIds] = useState<Set<number>>(new Set());

  const pageSize = 15;

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadTags();
    loadSolvedProblems();
  }, []);

  const loadSolvedProblems = async () => {
    try {
      const userInfo = getUserInfo();
      if (!userInfo?.id) return;
      const res = await userApi.getSolvedProblems<{ problemId: number }[]>(userInfo.id) as ApiResponse<{ problemId: number }[]>;
      if (res.code === 200 && res.data) {
        setSolvedIds(new Set(res.data.map(p => p.problemId)));
      }
    } catch (error) {
      console.error('加载已解决题目失败:', error);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    loadProblems(1);
  }, [searchKeyword, selectedTags]);

  const loadTags = async () => {
    try {
      const data = await tagApi.list<TagItem[]>() as ApiResponse<TagItem[]>;
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

      const data = await problemApi.list<Problem[]>(params) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      const countParams: Record<string, string> = {};
      if (keyword) {
        countParams.keyword = keyword;
      }
      if (selectedTags.length > 0) {
        countParams.tags = selectedTags.join(',');
      }
      const countData = await problemApi.count(countParams) as ApiResponse<number>;
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
    setCurrentPage(page);
    loadProblems(page);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ));
  };


  const getDifficultyStyle = (difficulty: string) => {
    switch (difficulty?.toLowerCase()) {
      case '简单':
        return { color: 'var(--gemini-success)', bg: 'var(--gemini-success-bg)' };
      case '中等':
        return { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' };
      case '困难':
        return { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' };
      default:
        return { color: 'var(--gemini-text-secondary)', bg: 'var(--gemini-surface-hover)' };
    }
  };

  const calculatePassRate = (submitCount: number, passCount: number) => {
    if (submitCount === 0) return '0%';
    return `${Math.round((passCount / submitCount) * 10000) / 100}%`;
  };

  const columns = [
    {
      title: '状态',
      key: 'status',
      width: 80,
      align: 'center' as const,
      render: (_: unknown, record: Problem) => (
        <div className="flex items-center justify-center">
          {solvedIds.has(record.id) ? (
            <CheckCircle className="w-5 h-5" style={{ color: 'var(--gemini-success)' }} />
          ) : (
            <Circle className="w-5 h-5" style={{ color: 'var(--gemini-text-disabled)' }} />
          )}
        </div>
      ),
    },
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: number) => (
        <span 
          className="font-mono"
          style={{ color: 'var(--gemini-text-secondary)' }}
        >
          #{id}
        </span>
      ),
    },
    {
      title: '题目名称',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Problem) => (
        <button
          onClick={() => navigate(`/problem/${record.id}`)}
          className="text-left font-medium transition-colors duration-200"
          style={{ 
            color: 'var(--gemini-text-primary)',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--gemini-accent-strong)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--gemini-text-primary)'}
        >
          {title}
        </button>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 120,
      render: (difficulty: string) => {
        const style = getDifficultyStyle(difficulty);
        return (
          <span 
            className="inline-flex px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {difficulty}
          </span>
        );
      },
    },
    {
      title: '提交次数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{count}</span>
      ),
    },
    {
      title: '通过次数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span style={{ color: 'var(--gemini-text-secondary)' }}>{count}</span>
      ),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: Problem) => {
        const rate = calculatePassRate(record.submitCount, record.passCount);
        const rateNum = parseFloat(rate);
        let bgColor = 'var(--gemini-error-bg)';
        let textColor = 'var(--gemini-error)';
        if (rateNum >= 60) {
          bgColor = 'var(--gemini-success-bg)';
          textColor = 'var(--gemini-success)';
        } else if (rateNum >= 30) {
          bgColor = 'var(--gemini-warning-bg)';
          textColor = 'var(--gemini-warning)';
        }
        return (
          <span 
            className="inline-flex px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: bgColor, color: textColor }}
          >
            {rate}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页面标题卡片 - Gemini 风格 */}
      <div 
        className="flex min-h-[calc(100vh-3rem)] flex-col rounded-3xl p-6"
        style={{ 
          backgroundColor: 'var(--gemini-surface)',
          boxShadow: 'var(--shadow-gemini)'
        }}
      >
        <h1 
          className="text-2xl font-semibold mb-6"
          style={{ color: 'var(--gemini-text-primary)' }}
        >
          题目列表
        </h1>

        {/* 搜索栏 - Gemini 风格 */}
        <div className="flex flex-row items-center gap-3 mb-6">
          <Input
            placeholder="输入题目编号或名称和标签"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="min-w-0 flex-1"
            size="large"
          />
          <div className="relative w-60 shrink-0">
            <button
              type="button"
              onClick={() => setTagPanelOpen((open) => !open)}
              className="flex h-10 w-full items-center justify-between rounded-full border px-4 text-sm transition-all"
              style={{
                borderColor: tagPanelOpen ? 'var(--gemini-accent)' : 'var(--gemini-border)',
                backgroundColor: 'var(--gemini-surface)',
                color: selectedTags.length > 0 ? 'var(--gemini-text-primary)' : 'var(--gemini-text-secondary)',
                boxShadow: tagPanelOpen ? '0 0 0 3px var(--gemini-accent)' : 'none',
              }}
            >
              <span className="truncate">
                {selectedTags.length > 0 ? `已选择 ${selectedTags.length} 个标签` : '选择标签'}
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${tagPanelOpen ? 'rotate-180' : ''}`} />
            </button>

            {tagPanelOpen && (
              <div
                className="absolute right-0 top-12 z-30 w-[360px] rounded-2xl border p-4 shadow-xl"
                style={{
                  borderColor: 'var(--gemini-border)',
                  backgroundColor: 'var(--gemini-surface)',
                }}
              >
                {selectedTags.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2 border-b pb-3" style={{ borderColor: 'var(--gemini-border)' }}>
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white"
                        style={{ backgroundColor: '#3b82f6' }}
                      >
                        {tag}
                        <button type="button" onClick={() => toggleTag(tag)} className="rounded-full hover:bg-white/20">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="custom-scrollbar flex max-h-72 flex-wrap gap-2 overflow-y-auto pr-2">
                  {tags.map((tag) => {
                    const selected = selectedTags.includes(tag.name);
                    return (
                      <button
                        key={tag.name}
                        type="button"
                        onClick={() => toggleTag(tag.name)}
                        className="rounded-xl border px-3 py-1.5 text-sm transition-all duration-200"
                        style={{
                          borderColor: selected ? '#93c5fd' : 'var(--gemini-border)',
                          backgroundColor: selected ? '#dbeafe' : 'var(--gemini-surface)',
                          color: selected ? '#1d4ed8' : 'var(--gemini-text-secondary)',
                          boxShadow: selected ? '0 0 0 2px rgba(59, 130, 246, 0.16)' : 'none',
                          fontWeight: selected ? 500 : 400,
                        }}
                      >
                        {tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <Button
            onClick={() => {
              setSearchKeyword('');
              setSelectedTags([]);
            }}
            size="large"
          >
            重置
          </Button>
        </div>

        {/* 表格 */}
        <div className="flex-1">
          <Table
            columns={columns}
            dataSource={problems}
            loading={loading}
            rowKey="id"
            pagination={false}
          />
        </div>

        {/* 分页 */}
        <div className="mt-auto flex justify-center pt-6">
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => (
              <span style={{ color: 'var(--gemini-text-secondary)' }}>共 {total} 题</span>
            )}
          />
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
