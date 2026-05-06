import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Pagination } from 'antd';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import type { ApiResponse } from '../../types';

interface RankUser {
  id: number;
  name: string;
  passCount: number;
  submitCount: number;
  signature?: string;
  avatar?: string;
}

interface DisplayRankUser extends RankUser {
  rank: number;
  passRate: string;
}

interface UserPageData {
  records: RankUser[];
  total: number;
  pageNum: number;
  pageSize: number;
}

type UserListData = UserPageData | RankUser[];

const Ranklist: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<DisplayRankUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

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
  }, [navigate]);

  useEffect(() => {
    loadRanking(currentPage, pageSize);
  }, [currentPage, pageSize]);

  const loadRanking = async (page = currentPage, size = pageSize) => {
    setLoading(true);
    try {
      const data = await api.get('/user/list', {
        params: { pageNum: page, pageSize: size },
      }) as ApiResponse<UserListData>;
      if (data.code === 200) {
        const records = Array.isArray(data.data) ? data.data : data.data.records || [];
        const ranked = records.map((user, index) => ({
          ...user,
          rank: (page - 1) * size + index + 1,
          passRate: user.submitCount > 0 
            ? ((user.passCount / user.submitCount) * 100).toFixed(2) + '%'
            : '0.00%',
        }));

        setUsers(ranked);
        setTotal(Array.isArray(data.data) ? data.data.length : data.data.total || 0);
      }
    } catch (error) {
      toast.error('加载排行榜失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    return users.slice(0, 10).map(user => ({
      name: user.name,
      AC: user.passCount,
      总数: user.submitCount,
    }));
  }, [users]);

  const handlePageChange = (page: number, size?: number) => {
    if (size && size !== pageSize) {
      setPageSize(size);
      setCurrentPage(1);
      return;
    }
    setCurrentPage(page);
  };

  const handleUserClick = (userId: number) => {
    navigate(`/user/${userId}`);
  };

  return (
    <div className="w-full">
      {/* 卡片容器 */}
      <div 
        className="rounded-3xl overflow-hidden"
        style={{ 
          backgroundColor: 'var(--gemini-surface)', 
          boxShadow: 'var(--shadow-gemini)'
        }}
      >
        {/* 卡片头部 */}
        <div 
          className="px-6 py-5 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--gemini-border-light)' }}
        >
          <div className="flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color: 'var(--gemini-accent-strong)' }} />
            <h1 className="m-0 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
              ACM 排名
            </h1>
          </div>
        </div>

        {/* 卡片内容 */}
        <div className="p-4">
            {loading ? (
              <div className="py-20 text-center">
                <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500"></div>
                <p style={{ color: 'var(--gemini-text-secondary)' }}>榜单加载中...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="py-20 text-center">
                <Trophy className="mx-auto mb-4 h-10 w-10" style={{ color: 'var(--gemini-text-disabled)' }} />
                <p style={{ color: 'var(--gemini-text-secondary)' }}>暂无排行榜数据</p>
              </div>
            ) : (
              <>
                {/* 图表区域 */}
                <div className="mb-6" style={{ height: 400 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartData}
                      margin={{ top: 40, right: 30, left: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.1)" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 12, fill: '#5f6368' }}
                        interval={0}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#5f6368' }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(50, 50, 50, 0.9)',
                          border: 'none',
                          borderRadius: 4,
                          color: '#fff',
                          fontSize: 14,
                        }}
                        labelStyle={{ color: '#fff', marginBottom: 4 }}
                        itemStyle={{ color: '#fff', padding: '2px 0' }}
                      />
                      <Legend 
                        verticalAlign="top"
                        wrapperStyle={{ paddingBottom: 20 }}
                        iconType="circle"
                      />
                      <Bar dataKey="AC" fill="#c23531" name="AC" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="总数" fill="#2f4554" name="总数" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 表格区域 */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr style={{ backgroundColor: 'var(--gemini-bg)' }}>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)', width: 60 }}>#</th>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>用户</th>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>格言</th>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>AC</th>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>总数</th>
                        <th className="px-4 py-3 text-center font-medium text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>评分</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr 
                          key={user.id}
                          className="transition-colors cursor-pointer"
                          style={{ 
                            borderBottom: '1px solid var(--gemini-border-light)',
                            backgroundColor: currentUserId === user.id ? 'rgba(26, 115, 232, 0.08)' : 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            if (currentUserId !== user.id) {
                              e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = currentUserId === user.id ? 'rgba(26, 115, 232, 0.08)' : 'transparent';
                          }}
                          onClick={() => handleUserClick(user.id)}
                        >
                          <td className="px-4 py-3 text-center" style={{ color: 'var(--gemini-text-primary)' }}>
                            {user.rank}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span 
                              className="inline-block max-w-[200px] truncate hover:underline"
                              style={{ color: 'var(--gemini-accent-strong)' }}
                            >
                              {user.name}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                            {user.signature || ''}
                          </td>
                          <td className="px-4 py-3 text-center" style={{ color: 'var(--gemini-text-primary)' }}>
                            {user.passCount}
                          </td>
                          <td className="px-4 py-3 text-center" style={{ color: 'var(--gemini-text-primary)' }}>
                            {user.submitCount}
                          </td>
                          <td className="px-4 py-3 text-center" style={{ color: 'var(--gemini-text-primary)' }}>
                            {user.passRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {users.length === 0 && (
                    <div className="py-8 text-center" style={{ color: 'var(--gemini-text-secondary)' }}>
                      暂无筛选结果
                    </div>
                  )}
                </div>

                {/* 分页区域 */}
                <div className="mt-4 flex items-center justify-end gap-3">
                  <Pagination
                    current={currentPage}
                    pageSize={pageSize}
                    total={total}
                    onChange={handlePageChange}
                    showSizeChanger
                    pageSizeOptions={['10', '30', '50', '100', '200']}
                    locale={{
                      items_per_page: '条/页',
                    }}
                  />
                </div>
              </>
            )}
        </div>
      </div>
    </div>
  );
};

export default Ranklist;
