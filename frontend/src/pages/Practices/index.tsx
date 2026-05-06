import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input, Progress, Tag } from 'antd';
import toast from 'react-hot-toast';
import { BookOpen, CalendarDays, FileText, Search } from 'lucide-react';
import { Select } from '../../components';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface Practice {
  id: number;
  title: string;
  description?: string;
  createTime: string;
  problemCount: number;
  solvedCount?: number;
}

const Practices: React.FC = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [allPractices, setAllPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [progressFilter, setProgressFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadPractices();
  }, []);

  useEffect(() => {
    filterPractices();
  }, [progressFilter, keyword, allPractices]);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/practice/list') as ApiResponse<Practice[]>;
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

  const filterPractices = () => {
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
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculateProgress = (solvedCount: number = 0, problemCount: number) => {
    if (problemCount === 0) return 0;
    return Math.round((solvedCount / problemCount) * 100);
  };

  const handleEnter = (id: number) => {
    navigate(`/practice/${id}`);
  };

  return (
    <div className="w-full">
      <div className="rounded-3xl" style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--gemini-border-light)' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
            全部练习
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={progressFilter}
              onChange={setProgressFilter}
              className="w-40"
              options={[
                { value: 'all', label: '全部' },
                { value: 'unfinished', label: '未完成' },
                { value: 'finished', label: '已完成' },
              ]}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索练习"
              prefix={<Search className="w-4 h-4" />}
              className="w-56"
              allowClear
            />
          </div>
        </div>

        <ol className="divide-y" style={{ borderColor: 'var(--gemini-border-light)' }}>
          {practices.map((practice) => {
          const progress = calculateProgress(practice.solvedCount, practice.problemCount);

          return (
            <li
              key={practice.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 transition-colors cursor-pointer"
              onClick={() => handleEnter(practice.id)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-5 min-w-0 flex-1">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)', boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)' }}
                >
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate mb-3" style={{ color: 'var(--gemini-text-primary)' }}>
                    {practice.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatTime(practice.createTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {practice.problemCount || 0} 道题目
                    </span>
                    <Tag color="blue" className="!rounded-full">练习</Tag>
                  </div>
                </div>
              </div>
              <div className="md:w-64">
                <div className="mb-2 flex items-center justify-between text-xs" style={{ color: 'var(--gemini-text-secondary)' }}>
                  <span>{practice.solvedCount || 0} / {practice.problemCount || 0}</span>
                  <span>{progress}%</span>
                </div>
                <Progress
                  percent={progress}
                  strokeColor={{
                    '0%': '#1a73e8',
                    '100%': '#34a853',
                  }}
                  showInfo={false}
                />
              </div>
            </li>
          );
          })}
        </ol>

        {practices.length === 0 && !loading && (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gemini-text-disabled)' }} />
            <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无练习数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Practices;
