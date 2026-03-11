import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Pagination, Select, Button, Spin, Tag } from 'antd';
import toast from 'react-hot-toast';
import { Sparkles, CheckCircle, Circle } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';

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

interface RecommendedProblem {
  id: number;
  title: string;
  difficulty: string;
  submitCount: number;
  passCount: number;
  reason?: string;
}

const Problems: React.FC = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [recommendProblems, setRecommendProblems] = useState<RecommendedProblem[]>([]);
  const [recommendLoading, setRecommendLoading] = useState(false);
  const [showRecommend, setShowRecommend] = useState(false);
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

  useEffect(() => {
    setCurrentPage(1);
    loadProblems(1);
  }, [searchKeyword, selectedTag]);

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
      const keyword = searchKeyword || selectedTag || '';
      const params: Record<string, string> = {
        offset: String((page - 1) * pageSize),
        size: String(pageSize),
      };
      if (keyword) {
        params.keyword = keyword;
      }

      const data = await api.get('/problem/list', { params }) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      const countParams = keyword ? { keyword } : {};
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
    setCurrentPage(page);
    loadProblems(page);
  };

  const handleGetRecommendation = async () => {
    setRecommendLoading(true);
    setShowRecommend(true);
    try {
      // 获取用户已通过的题目ID列表
      const solvedRes = await api.get('/user/solved-problems') as ApiResponse<{ problemId: number; problemName?: string }[]>;
      const solvedIds = new Set(
        solvedRes.code === 200 && solvedRes.data
          ? solvedRes.data.map(p => p.problemId)
          : []
      );

      // 获取全部题目用于推荐（取较多题目来筛选）
      const allRes = await api.get('/problem/list', {
        params: { offset: '0', size: '200' },
      }) as ApiResponse<Problem[]>;
      const allProblems: Problem[] = allRes.code === 200 && allRes.data ? allRes.data : [];

      // 过滤掉已通过的题目
      const unsolved = allProblems.filter(p => !solvedIds.has(p.id));

      // 推荐策略：综合考虑通过率和提交热度
      const scored = unsolved.map(p => {
        const passRate = p.submitCount > 0 ? p.passCount / p.submitCount : 0;
        // 优先推荐：有一定提交量 + 适中通过率（30%-70%）的题目
        const hotScore = Math.min(p.submitCount / 50, 1); // 热度分，上限1
        const diffScore = passRate >= 0.3 && passRate <= 0.7 ? 1 : (passRate > 0.7 ? 0.6 : 0.4);
        const score = hotScore * 0.4 + diffScore * 0.6 + Math.random() * 0.2; // 加随机因子保证多样性
        let reason = '';
        if (passRate >= 0.6) reason = '通过率较高，适合巩固基础';
        else if (passRate >= 0.3) reason = '难度适中，推荐挑战';
        else if (p.submitCount > 10) reason = '通过率较低，适合提升能力';
        else reason = '尝试人数较少，值得探索';
        return { ...p, score, reason };
      });

      // 按分数排序取前8个
      scored.sort((a, b) => b.score - a.score);
      setRecommendProblems(scored.slice(0, 8).map((item) => {
        const { score: _unusedScore, ...rest } = item;
        void _unusedScore;
        return rest;
      }));
    } catch (error) {
      toast.error('获取推荐失败');
      console.error(error);
    } finally {
      setRecommendLoading(false);
    }
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
      {/* 个性化习题推荐 */}
      <div
        className="rounded-3xl p-6"
        style={{
          backgroundColor: 'var(--gemini-surface)',
          boxShadow: 'var(--shadow-gemini)',
          background: 'linear-gradient(135deg, rgba(26,115,232,0.05) 0%, rgba(52,168,83,0.05) 100%)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#e8f0fe' }}>
              <Sparkles className="w-5 h-5" style={{ color: '#1a73e8' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>个性化习题推荐</h2>
              <p className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>基于您的做题记录，智能推荐适合您的练习题目</p>
            </div>
          </div>
          <Button
            type="primary"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={handleGetRecommendation}
            loading={recommendLoading}
            style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
          >
            {showRecommend ? '换一批' : '获取推荐'}
          </Button>
        </div>

        {/* 推荐结果 */}
        {recommendLoading && (
          <div className="flex items-center justify-center py-8">
            <Spin />
            <span className="ml-3" style={{ color: 'var(--gemini-text-secondary)' }}>正在为您筛选推荐题目...</span>
          </div>
        )}
        {!recommendLoading && showRecommend && recommendProblems.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
            {recommendProblems.map((p) => {
              const style = getDifficultyStyle(p.difficulty);
              const rate = p.submitCount > 0 ? Math.round((p.passCount / p.submitCount) * 100) : 0;
              return (
                <div
                  key={p.id}
                  className="rounded-2xl p-4 cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                  style={{ backgroundColor: 'var(--gemini-surface)', border: '1px solid var(--gemini-border-light)' }}
                  onClick={() => navigate(`/problem/${p.id}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono" style={{ color: 'var(--gemini-text-disabled)' }}>#{p.id}</span>
                    <Tag color={p.difficulty === '简单' ? 'green' : p.difficulty === '中等' ? 'orange' : p.difficulty === '困难' ? 'red' : 'default'} className="!text-xs !mr-0">
                      {p.difficulty}
                    </Tag>
                  </div>
                  <div className="font-medium text-sm mb-2 line-clamp-1" style={{ color: 'var(--gemini-text-primary)' }}>{p.title}</div>
                  <div className="text-xs mb-2" style={{ color: 'var(--gemini-text-disabled)' }}>通过率 {rate}% · {p.submitCount} 次提交</div>
                  {p.reason && (
                    <div className="text-xs px-2 py-1 rounded-full inline-block" style={{ backgroundColor: style.bg, color: style.color }}>
                      {p.reason}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!recommendLoading && showRecommend && recommendProblems.length === 0 && (
          <div className="text-center py-6" style={{ color: 'var(--gemini-text-disabled)' }}>暂无可推荐的题目，您已经做完所有题目了！</div>
        )}
      </div>

      {/* 页面标题卡片 - Gemini 风格 */}
      <div 
        className="rounded-3xl p-6"
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
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Input
            placeholder="输入题目编号或名称和标签"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="flex-1"
            size="large"
          />
          <Select
            placeholder="选择标签"
            value={selectedTag}
            onChange={setSelectedTag}
            className="w-full sm:w-48"
            size="large"
            allowClear
          >
            <Select.Option value="">所有标签</Select.Option>
            {tags.map((tag) => (
              <Select.Option key={tag.name} value={tag.name}>
                {tag.name}
              </Select.Option>
            ))}
          </Select>
          <Button
            onClick={() => {
              setSearchKeyword('');
              setSelectedTag('');
            }}
            size="large"
          >
            重置
          </Button>
        </div>

        {/* 表格 */}
        <Table
          columns={columns}
          dataSource={problems}
          loading={loading}
          rowKey="id"
          pagination={false}
        />

        {/* 分页 */}
        <div className="flex justify-center mt-6">
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
    </div>
  );
};

export default Problems;
