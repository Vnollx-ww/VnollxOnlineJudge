import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Checkbox, Progress } from 'antd';
import toast from 'react-hot-toast';
import { Trophy, Play, Clock, Flag, Users, Home } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  number?: number;
}

const Competitions: React.FC = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [allCompetitions, setAllCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterRunning, setFilterRunning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadCompetitions();
  }, []);

  useEffect(() => {
    filterCompetitions();
  }, [filterRunning, allCompetitions]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/competition/list') as ApiResponse<Competition[]>;
      if (data.code === 200) {
        const sorted = data.data.sort(
          (a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime()
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

  const filterCompetitions = () => {
    if (filterRunning) {
      const filtered = allCompetitions.filter(
        (comp) => calculateStatus(comp.beginTime, comp.endTime) === '进行中'
      );
      setCompetitions(filtered);
    } else {
      setCompetitions(allCompetitions);
    }
  };

  const calculateStatus = (beginTime: string, endTime: string) => {
    const now = new Date();
    const begin = new Date(beginTime);
    const end = new Date(endTime);

    if (now < begin) return '暂未开始';
    if (now < end) return '进行中';
    return '已结束';
  };

  const calculateProgress = (beginTime: string, endTime: string) => {
    const now = Date.now();
    const start = new Date(beginTime).getTime();
    const end = new Date(endTime).getTime();

    if (now < start) return 0;
    if (now > end) return 100;
    return ((now - start) / (end - start)) * 100;
  };

  const formatTime = (timeStr: string) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    const configs: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
      '进行中': { color: 'var(--gemini-info)', bg: 'var(--gemini-info-bg)', icon: <Play className="w-4 h-4" /> },
      '暂未开始': { color: 'var(--gemini-text-secondary)', bg: 'var(--gemini-surface-hover)', icon: <Clock className="w-4 h-4" /> },
      '已结束': { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)', icon: <Flag className="w-4 h-4" /> },
    };
    return configs[status] || configs['暂未开始'];
  };

  const handleJoin = (id: number, status: string) => {
    if (status === '暂未开始') {
      toast.warning('比赛暂未开始，无法进入');
      return;
    }
    navigate(`/competition/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* 标题栏 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
          <Trophy className="w-7 h-7" style={{ color: '#f59e0b' }} />
          竞赛练习中心
        </h1>
        <div className="flex items-center gap-4">
          <Checkbox
            checked={filterRunning}
            onChange={(e) => setFilterRunning(e.target.checked)}
          >
            <span style={{ color: 'var(--gemini-text-secondary)' }}>只显示进行中的</span>
          </Checkbox>
          <Button icon={<Home className="w-4 h-4" />} onClick={() => navigate('/')}>
            返回主页
          </Button>
        </div>
      </div>

      {/* 比赛列表 - Gemini 卡片风格 */}
      <div className="grid md:grid-cols-2 gap-6">
        {competitions.map((comp) => {
          const status = calculateStatus(comp.beginTime, comp.endTime);
          const progress = calculateProgress(comp.beginTime, comp.endTime);
          const statusStyle = getStatusStyle(status);

          return (
            <div
              key={comp.id}
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
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)' }}
                >
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold truncate mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
                    {comp.title}
                  </h3>
                  <span 
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ backgroundColor: statusStyle.bg, color: statusStyle.color }}
                  >
                    {statusStyle.icon}
                    {status}
                  </span>
                </div>
              </div>

              {/* 信息 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-disabled)' }}>开始时间</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{formatTime(comp.beginTime)}</div>
                </div>
                <div>
                  <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-disabled)' }}>结束时间</div>
                  <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{formatTime(comp.endTime)}</div>
                </div>
              </div>

              {comp.description && (
                <p className="text-sm mb-4 line-clamp-2" style={{ color: 'var(--gemini-text-secondary)' }}>
                  {comp.description}
                </p>
              )}

              {/* 进度条 */}
              <div className="mb-4">
                <Progress
                  percent={Math.round(progress)}
                  strokeColor={{
                    '0%': '#1a73e8',
                    '100%': '#34a853',
                  }}
                  showInfo={false}
                  className="mb-1"
                />
                <div className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                  {progress === 0
                    ? '比赛尚未开始'
                    : progress === 100
                    ? '比赛已结束'
                    : `进行中 ${Math.round(progress)}%`}
                </div>
              </div>

              {/* 底部操作 */}
              <div 
                className="flex items-center justify-between pt-4"
                style={{ borderTop: '1px solid var(--gemini-border-light)' }}
              >
                <div className="flex items-center gap-1 text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
                  <Users className="w-4 h-4" />
                  {comp.number || 0}人已参加
                </div>
                <Button
                  type="primary"
                  onClick={() => handleJoin(comp.id, status)}
                  disabled={status === '暂未开始'}
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)', 
                    color: 'var(--gemini-accent-text)', 
                    border: 'none' 
                  }}
                >
                  {status === '进行中' ? '立即参加' : status === '已结束' ? '查看结果' : '暂未开始'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {competitions.length === 0 && !loading && (
        <div 
          className="rounded-3xl text-center py-12"
          style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
        >
          <Trophy className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--gemini-text-disabled)' }} />
          <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无比赛数据</p>
        </div>
      )}
    </div>
  );
};

export default Competitions;
