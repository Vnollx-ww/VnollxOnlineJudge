import { Trophy } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PageSurface, PagePagination } from '@/components';
import { useRanklist } from '@/hooks/user/useRanklist';

const Ranklist: React.FC = () => {
  const {
    users,
    total,
    loading,
    currentUserId,
    currentPage,
    pageSize,
    chartData,
    handlePageChange,
    handleUserClick,
  } = useRanklist();

  return (
    <div className="w-full">
      <PageSurface
        variant="card"
        title={
          <span className="inline-flex items-center gap-3">
            <Trophy className="w-6 h-6" style={{ color: 'var(--gemini-accent-strong)' }} />
            <span>ACM 排名</span>
          </span>
        }
      >
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
                <PagePagination
                  current={currentPage}
                  pageSize={pageSize}
                  total={total}
                  onChange={handlePageChange}
                  showSizeChanger
                  pageSizeOptions={['10', '30', '50', '100', '200']}
                  align="end"
                  className="mt-4"
                />
              </>
            )}
        </div>
      </PageSurface>
    </div>
  );
};

export default Ranklist;
