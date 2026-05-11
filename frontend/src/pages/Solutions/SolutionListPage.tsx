import { Tag, Empty, Button } from '../../components';
import { ArrowLeft, Edit3, User, Clock } from 'lucide-react';
import dayjs from 'dayjs';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useSolutionList } from '@/hooks/useSolutionList';

const SolutionListPage: React.FC = () => {
  const {
    navigate,
    pid,
    solutions,
    loading,
    fetchError,
    pageTitle,
    loadSolutions,
    handlePublish,
    handleSolveClick,
    getPreviewText,
  } = useSolutionList();

  if (!pid) {
    return (
      <div className="gemini-card text-center py-16">
        <div className="text-3xl font-bold mb-2" style={{ color: 'var(--gemini-error)' }}>404</div>
        <div className="text-lg font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>缺少题目 ID</div>
        <p style={{ color: 'var(--gemini-text-secondary)' }}>无法加载题解列表，请返回题目页面重试</p>
        <Button
          type="primary"
          onClick={() => navigate('/problems')}
          style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
        >
          返回题目列表
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full">
      <div className="w-full space-y-6">
        {/* Header Card - Gemini 风格 */}
        <div className="gemini-card">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
              <Button
                icon={<ArrowLeft className="w-4 h-4" />}
                onClick={() => navigate(`/problem/${pid}`)}
                className="gemini-btn gemini-btn-outlined"
              >
                返回题目详情
              </Button>
            </div>
            <div className="mb-4">
              <h2 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{pageTitle}</h2>
              <p style={{ color: 'var(--gemini-text-secondary)' }}>分享你的解题思路，帮助更多同学</p>
            </div>
            <div className="flex gap-4 mb-4">
              <div 
                className="rounded-2xl px-6 py-4"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <span style={{ color: 'var(--gemini-text-tertiary)' }} className="text-sm">题目 ID</span>
                <div className="text-xl font-bold" style={{ color: 'var(--gemini-accent-strong)' }}>{pid}</div>
              </div>
              <div 
                className="rounded-2xl px-6 py-4"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <span style={{ color: 'var(--gemini-text-tertiary)' }} className="text-sm">题解数量</span>
                <div className="text-xl font-bold" style={{ color: 'var(--gemini-success)' }}>{solutions.length}</div>
              </div>
            </div>
            <PermissionGuard permission={PermissionCode.SOLVE_CREATE}>
              <Button 
                type="primary" 
                icon={<Edit3 className="w-4 h-4" />} 
                onClick={handlePublish}
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                发布题解
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Solutions List - Gemini 风格 */}
        <div className="space-y-4">
          {loading ? (
            <div className="gemini-card">
              <div className="animate-pulse space-y-3">
                <div className="h-5 w-1/3 rounded bg-slate-200" />
                <div className="h-4 w-full rounded bg-slate-200" />
                <div className="h-4 w-5/6 rounded bg-slate-200" />
                <div className="h-4 w-2/3 rounded bg-slate-200" />
              </div>
            </div>
          ) : fetchError ? (
            <div className="gemini-card text-center py-12">
              <div className="text-lg font-semibold mb-2" style={{ color: 'var(--gemini-error)' }}>加载题解失败</div>
              <p className="mb-4" style={{ color: 'var(--gemini-text-secondary)' }}>{fetchError}</p>
              <Button
                type="primary"
                onClick={loadSolutions}
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                重试
              </Button>
            </div>
          ) : solutions.length === 0 ? (
            <div className="gemini-card">
              <Empty description="暂无题解，快来成为第一位分享者吧" />
            </div>
          ) : (
            solutions.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSolveClick(item.id)}
                className="gemini-card cursor-pointer transition-all hover:shadow-gemini-hover"
              >
                <div className="flex flex-col gap-3">
                  <h4 className="mb-2 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{item.title}</h4>
                  <p
                    className="mb-4 line-clamp-3 leading-relaxed"
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    {getPreviewText(item.content)}
                  </p>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}
                      >
                        <User className="w-4 h-4" />
                      </span>
                      <div>
                        <div className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{item.name}</div>
                        <div className="text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>
                          发布于 {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
                        </div>
                      </div>
                      <Tag color="blue">题目 #{item.pid}</Tag>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" style={{ color: 'var(--gemini-text-tertiary)' }} />
                      <span style={{ color: 'var(--gemini-text-tertiary)' }}>{item.problemName}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default SolutionListPage;
