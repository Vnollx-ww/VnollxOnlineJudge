import { Button } from '@/components';
import { ArrowLeft } from 'lucide-react';
import dayjs from 'dayjs';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { useSolutionDetail } from '@/hooks/useSolutionDetail';

const SolutionDetailPage: React.FC = () => {
  const {
    navigate,
    pid,
    solveId,
    titleFromState,
    contentRef,
    solution,
    loading,
    error,
    renderedContent,
    loadSolution,
  } = useSolutionDetail();

  if (!pid || !solveId) {
    return (
      <div className="gemini-card text-center py-16">
        <div className="text-3xl font-bold mb-2" style={{ color: 'var(--gemini-error)' }}>404</div>
        <div className="text-lg font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>缺少题解信息</div>
        <p style={{ color: 'var(--gemini-text-secondary)' }}>请从题目详情页重新进入题解详情</p>
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
        {loading ? (
          <div className="gemini-card">
            <div className="animate-pulse space-y-3">
              <div className="h-5 w-1/3 rounded bg-slate-200" />
              {Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="h-4 w-full rounded bg-slate-200" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="gemini-card text-center py-12">
            <div className="text-lg font-semibold mb-2" style={{ color: 'var(--gemini-error)' }}>加载题解失败</div>
            <p className="mb-4" style={{ color: 'var(--gemini-text-secondary)' }}>{error}</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}>
                返回题解列表
              </Button>
              <Button
                type="primary"
                onClick={loadSolution}
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                重试
              </Button>
            </div>
          </div>
        ) : (
          <div className="gemini-card">
            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Button
                  icon={<ArrowLeft className="w-4 h-4" />}
                  onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}
                  className="gemini-btn gemini-btn-outlined"
                >
                  返回题解列表
                </Button>
              </div>
              <div>
                <h2 className="mb-2 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{solution?.title}</h2>
                <span style={{ color: 'var(--gemini-text-secondary)' }}>{solution?.problemName}</span>
              </div>
              <div className="flex gap-4 flex-wrap">
                <div 
                  className="rounded-2xl px-4 py-2"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>题目 ID</span>
                  <div className="font-bold" style={{ color: 'var(--gemini-accent-strong)' }}>#{solution?.pid}</div>
                </div>
                <div 
                  className="rounded-2xl px-4 py-2"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>作者</span>
                  <div className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>{solution?.name}</div>
                </div>
                <div 
                  className="rounded-2xl px-4 py-2"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>发布时间</span>
                  <div className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>{dayjs(solution?.createTime).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
              <div 
                className="markdown-body" 
                ref={contentRef} 
                dangerouslySetInnerHTML={{ __html: renderedContent }} 
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolutionDetailPage;
