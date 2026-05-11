import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Tag } from 'antd';
import toast from 'react-hot-toast';
import { CalendarDays, Clock, Search } from 'lucide-react';
import { Select } from '../../components';
import { competitionApi } from '@/lib';
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
  const [statusFilter, setStatusFilter] = useState('all');
  const [keyword, setKeyword] = useState('');

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
  }, [statusFilter, keyword, allCompetitions]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = await competitionApi.list<Competition[]>() as ApiResponse<Competition[]>;
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
    const normalizedKeyword = keyword.trim().toLowerCase();
    const filtered = allCompetitions.filter((comp) => {
      const status = calculateStatus(comp.beginTime, comp.endTime);
      const matchStatus = statusFilter === 'all' || status === statusFilter;
      const matchKeyword = !normalizedKeyword || comp.title.toLowerCase().includes(normalizedKeyword);
      return matchStatus && matchKeyword;
    });
    setCompetitions(filtered);
  };

  const calculateStatus = (beginTime: string, endTime: string) => {
    const now = new Date();
    const begin = new Date(beginTime);
    const end = new Date(endTime);

    if (now < begin) return '暂未开始';
    if (now < end) return '进行中';
    return '已结束';
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

  const formatDuration = (beginTime: string, endTime: string) => {
    const diff = Math.max(0, new Date(endTime).getTime() - new Date(beginTime).getTime());
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}天${hours > 0 ? ` ${hours}小时` : ''}`;
    return `${Math.max(1, hours)}小时`;
  };

  const getStatusTag = (status: string) => {
    const configs: Record<string, { color: string; text: string }> = {
      '进行中': { color: 'green', text: '进行中' },
      '暂未开始': { color: 'blue', text: '暂未开始' },
      '已结束': { color: 'red', text: '已结束' },
    };
    const config = configs[status] || configs['暂未开始'];
    return <Tag color={config.color} className="!rounded-full !px-3">{config.text}</Tag>;
  };

  const handleJoin = async (id: number, status: string) => {
    if (status === '暂未开始') {
      toast('比赛暂未开始，无法进入', { icon: '⚠️' });
      return;
    }
    try {
      const data = await competitionApi.participation<void>(id) as ApiResponse<void>;
      if (data.code === 200) {
        navigate(`/competition/${id}`);
      } else {
        toast.error((data as any).msg || '无权参加该比赛');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '无权参加该比赛');
    }
  };

  return (
    <div className="w-full">
      {/* 标题栏 */}
      <div className="rounded-3xl" style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-6 py-4" style={{ borderBottom: '1px solid var(--gemini-border-light)' }}>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
            全部比赛
          </h1>
          <div className="flex flex-wrap items-center gap-3">
  
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-40"
              options={[
                { value: 'all', label: '全部' },
                { value: '进行中', label: '进行中' },
                { value: '暂未开始', label: '暂未开始' },
                { value: '已结束', label: '已结束' },
              ]}
            />
            <Input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索比赛"
              prefix={<Search className="w-4 h-4" />}
              className="w-56"
              allowClear
            />
          </div>
        </div>

        {/* 比赛列表 - Gemini 卡片风格 */}
        <ol className="divide-y" style={{ borderColor: 'var(--gemini-border-light)' }}>
          {competitions.map((comp) => {
          const status = calculateStatus(comp.beginTime, comp.endTime);

          return (
            <li
              key={comp.id}
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-6 py-5 transition-colors cursor-pointer"
              onClick={() => handleJoin(comp.id, status)}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-bg)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <div className="flex items-center gap-5 min-w-0 flex-1">
                <img
                  src="https://oss.vnollx.top/markdown/微信图片_20260509104335_470_9.jpg"
                  alt="比赛"
                  className="h-16 w-16 flex-shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold truncate mb-3" style={{ color: 'var(--gemini-text-primary)' }}>
                    {comp.title}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatTime(comp.beginTime)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
                      {formatDuration(comp.beginTime, comp.endTime)}
                    </span>
                    <Button size="small" shape="round">
                      ACM
                    </Button>
                  </div>
                </div>
              </div>
              <div className="md:w-32 md:text-center">
                {getStatusTag(status)}
              </div>
            </li>
          );
          })}
        </ol>

        {competitions.length === 0 && !loading && (
          <div className="text-center py-12">
            <img src="https://oss.vnollx.top/markdown/微信图片_20260509104335_470_9.jpg" alt="比赛" className="mx-auto mb-4 h-12 w-12 rounded-2xl object-cover opacity-60" />
            <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无比赛数据</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Competitions;
