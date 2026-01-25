import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Avatar } from 'antd';
import toast from 'react-hot-toast';
import { Trophy, Medal } from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface RankUser {
  id: number;
  name: string;
  passCount: number;
  submitCount: number;
}

const Ranklist: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<RankUser[]>([]);
  const [topUsers, setTopUsers] = useState<RankUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

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
    loadRanking();
  }, []);

  const loadRanking = async () => {
    setLoading(true);
    try {
      const data = await api.get('/user/list') as ApiResponse<RankUser[]>;
      if (data.code === 200) {
        const sorted = data.data.sort((a, b) => {
          if (b.passCount !== a.passCount) {
            return b.passCount - a.passCount;
          }
          if (a.submitCount !== b.submitCount) {
            return a.submitCount - b.submitCount;
          }
          return a.name.localeCompare(b.name);
        });

        setTopUsers(sorted.slice(0, 3));
        setUsers(sorted.slice(3));
      }
    } catch (error) {
      toast.error('加载排行榜失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePassRate = (pass: number, submit: number) => {
    if (submit === 0) return '0%';
    return `${Math.round((pass / submit) * 100)}%`;
  };

  const getRateStyle = (pass: number, submit: number) => {
    const rate = submit === 0 ? 0 : (pass / submit) * 100;
    if (rate >= 70) return { color: 'var(--gemini-success)', bg: 'var(--gemini-success-bg)' };
    if (rate >= 40) return { color: 'var(--gemini-warning)', bg: 'var(--gemini-warning-bg)' };
    return { color: 'var(--gemini-error)', bg: 'var(--gemini-error-bg)' };
  };

  const getMedalStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return { bg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', size: 64 };
      case 2:
        return { bg: 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)', size: 56 };
      case 3:
        return { bg: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', size: 56 };
      default:
        return { bg: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)', size: 48 };
    }
  };

  const columns = [
    {
      title: '排名',
      key: 'rank',
      width: 100,
      render: (_: unknown, __: unknown, index: number) => (
        <span className="font-mono" style={{ color: 'var(--gemini-text-secondary)' }}>{index + 4}</span>
      ),
    },
    {
      title: '用户',
      key: 'user',
      render: (_: unknown, record: RankUser) => (
        <div className="flex items-center gap-3">
          <Avatar style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}>
            {record.name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <span 
            className="font-medium"
            style={{ color: currentUserId === record.id ? 'var(--gemini-accent-strong)' : 'var(--gemini-text-primary)' }}
          >
            {record.name}
          </span>
        </div>
      ),
    },
    {
      title: '已通过',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span className="text-lg font-bold" style={{ color: 'var(--gemini-success)' }}>{count}</span>
      ),
    },
    {
      title: '总提交',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 120,
      align: 'center' as const,
      render: (count: number) => (
        <span className="text-lg font-bold" style={{ color: 'var(--gemini-accent-strong)' }}>{count}</span>
      ),
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      align: 'center' as const,
      render: (_: unknown, record: RankUser) => {
        const rate = calculatePassRate(record.passCount, record.submitCount);
        const style = getRateStyle(record.passCount, record.submitCount);
        return (
          <span 
            className="inline-flex px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: style.bg, color: style.color }}
          >
            {rate}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <div 
        className="rounded-3xl p-6"
        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
      >
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-2">
            <Trophy className="w-8 h-8" style={{ color: '#f59e0b' }} />
            <h1 className="text-3xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>排行榜</h1>
          </div>
          <p style={{ color: 'var(--gemini-text-secondary)' }}>
            根据用户通过题目数量排名，通过数相同则提交少的靠前
          </p>
        </div>

        {/* 前三名展示 - Gemini 卡片风格 */}
        {topUsers.length > 0 && (
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {topUsers.map((user, index) => {
              const rank = index + 1;
              const medalStyle = getMedalStyle(rank);
              const isCurrentUser = currentUserId === user.id;

              return (
                <div
                  key={user.id}
                  className="relative p-6 rounded-3xl text-center transition-all duration-300 hover:-translate-y-1"
                  style={{ 
                    backgroundColor: rank === 1 ? '#fef7e0' : 'var(--gemini-bg)',
                    boxShadow: rank === 1 ? 'var(--shadow-gemini-hover)' : 'var(--shadow-gemini)',
                    marginTop: rank === 1 ? '-16px' : 0,
                    border: isCurrentUser ? '2px solid var(--gemini-accent-strong)' : 'none'
                  }}
                >
                  {/* 奖牌图标 */}
                  <div 
                    className="mx-auto mb-4 rounded-full flex items-center justify-center"
                    style={{ 
                      width: medalStyle.size, 
                      height: medalStyle.size, 
                      background: medalStyle.bg,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                    }}
                  >
                    {rank === 1 ? (
                      <Trophy className="w-8 h-8 text-white" />
                    ) : (
                      <Medal className="w-6 h-6 text-white" />
                    )}
                  </div>

                  {/* 排名 */}
                  <div 
                    className="text-sm font-bold mb-2"
                    style={{ color: rank === 1 ? '#b45309' : rank === 2 ? '#6b7280' : '#92400e' }}
                  >
                    第 {rank} 名
                  </div>

                  {/* 用户名 */}
                  <div 
                    className="text-xl font-bold mb-3"
                    style={{ color: isCurrentUser ? 'var(--gemini-accent-strong)' : 'var(--gemini-text-primary)' }}
                  >
                    {user.name}
                  </div>

                  {/* 通过题数 */}
                  <div style={{ color: 'var(--gemini-text-secondary)' }}>
                    已通过{' '}
                    <span className="text-2xl font-bold" style={{ color: 'var(--gemini-success)' }}>{user.passCount}</span>
                    {' '}题
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 排行榜列表 */}
        <Table
          columns={columns}
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={false}
          rowClassName={(record) =>
            currentUserId === record.id ? 'bg-blue-50/50' : ''
          }
        />
      </div>
    </div>
  );
};

export default Ranklist;
