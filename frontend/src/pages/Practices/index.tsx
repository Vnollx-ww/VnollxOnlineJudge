import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tag, Button, Progress } from 'antd';
import toast from 'react-hot-toast';
import { BookOpen, ArrowRight, FileText, Home } from 'lucide-react';
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
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadPractices();
  }, []);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/practice/list') as ApiResponse<Practice[]>;
      if (data.code === 200) {
        setPractices(data.data || []);
      }
    } catch (error) {
      toast.error('加载练习列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
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
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
          <BookOpen className="w-7 h-7" style={{ color: 'var(--gemini-accent-strong)' }} />
          练习中心
        </h1>
        <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')}>
          返回主页
        </Button>
      </div>

      {/* 练习列表 - Gemini 卡片风格 */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {practices.map((practice) => {
          const progress = calculateProgress(practice.solvedCount, practice.problemCount);

          return (
            <div
              key={practice.id}
              className="rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1"
              style={{ 
                backgroundColor: 'var(--gemini-surface)', 
                boxShadow: 'var(--shadow-gemini)' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini)'}
            >
              {/* 头部 */}
              <div className="flex items-start gap-4 mb-4">
                <div 
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)', boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)' }}
                >
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate mb-1" style={{ color: 'var(--gemini-text-primary)' }}>
                    {practice.title}
                  </h3>
                  <Tag color="blue">练习</Tag>
                </div>
              </div>

              {/* 信息 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-disabled)' }}>创建时间</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{formatTime(practice.createTime)}</div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-disabled)' }}>完成进度</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
                    {practice.solvedCount || 0} / {practice.problemCount || 0}
                  </div>
                </div>
              </div>

              {practice.description && (
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--gemini-text-secondary)' }}>
                  {practice.description}
                </p>
              )}

              {/* 进度条 */}
              <div className="mb-4">
                <Progress
                  percent={progress}
                  strokeColor={{
                    '0%': '#1a73e8',
                    '100%': '#34a853',
                  }}
                  showInfo={false}
                  className="mb-1"
                />
                <div className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                  {progress === 0
                    ? '尚未开始'
                    : progress === 100
                    ? '已全部完成'
                    : `已完成 ${progress}%`}
                </div>
              </div>

              {/* 底部操作 */}
              <div 
                className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid var(--gemini-border-light)' }}
              >
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
                  <FileText className="w-4 h-4" />
                  {practice.problemCount || 0} 道题目
                </div>
                <Button
                  type="primary"
                  icon={<ArrowRight className="w-4 h-4" />}
                  onClick={() => handleEnter(practice.id)}
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)', 
                    color: 'var(--gemini-accent-text)', 
                    border: 'none' 
                  }}
                >
                  进入练习
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {practices.length === 0 && !loading && (
        <div 
          className="rounded-3xl text-center py-12"
          style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
        >
          <BookOpen className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gemini-text-disabled)' }} />
          <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无练习数据</p>
        </div>
      )}
    </div>
  );
};

export default Practices;
