import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Input, Select, Button, Pagination } from 'antd';
import toast from 'react-hot-toast';
import { Search } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
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

const Problems: React.FC = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const pageSize = 15;

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadTags();
    loadProblems(1);
  }, []);

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

  const handleSearch = () => {
    setCurrentPage(1);
    loadProblems(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    loadProblems(page);
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
            onPressEnter={handleSearch}
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
            type="primary"
            icon={<Search className="w-4 h-4" />}
            onClick={handleSearch}
            size="large"
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            搜索
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
