import { Button, Space, Typography, Skeleton, Result } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';
import { useSolutionDetail } from '@/hooks/useSolutionDetail';

const { Title, Text } = Typography;

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
      <Result
        status="404"
        title="缺少题解信息"
        subTitle="请从题目详情页重新进入题解详情"
        extra={
          <Button 
            type="primary" 
            onClick={() => navigate('/problems')}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            返回题目列表
          </Button>
        }
      />
    );
  }

  return (
    <div className="min-h-full w-full">
      <div className="w-full space-y-6">
        {loading ? (
          <div className="gemini-card">
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : error ? (
          <div className="gemini-card">
            <Result
              status="error"
              title="加载题解失败"
              subTitle={error}
              extra={
                <Space>
                  <Button onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}>
                    返回题解列表
                  </Button>
                  <Button 
                    type="primary" 
                    onClick={loadSolution}
                    style={{ 
                      backgroundColor: 'var(--gemini-accent)',
                      color: 'var(--gemini-accent-text)',
                      border: 'none'
                    }}
                  >
                    重试
                  </Button>
                </Space>
              }
            />
          </div>
        ) : (
          <div className="gemini-card">
            <Space direction="vertical" size="large" className="w-full">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}
                  className="gemini-btn gemini-btn-outlined"
                >
                  返回题解列表
                </Button>
              </div>
              <div>
                <Title level={2} className="!mb-2" style={{ color: 'var(--gemini-text-primary)' }}>{solution?.title}</Title>
                <Text style={{ color: 'var(--gemini-text-secondary)' }}>{solution?.problemName}</Text>
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
            </Space>
          </div>
        )}
      </div>
    </div>
  );
};

export default SolutionDetailPage;
