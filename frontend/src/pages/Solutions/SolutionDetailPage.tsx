import { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Button, Space, Typography, Skeleton, Result } from 'antd';
import toast from 'react-hot-toast';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import 'highlight.js/styles/github.css';
import 'katex/dist/katex.min.css';

const { Title, Text } = Typography;

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface Solution {
  id: number;
  title: string;
  content: string;
  name: string;
  pid: number;
  problemName?: string;
  createTime: string;
}

interface LocationState {
  title?: string;
}

// 渲染 LaTeX 公式
const renderLatex = (text: string) => {
  if (!text) return text;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });
  return text;
};

const SolutionDetailPage: React.FC = () => {
  const { solveId, problemId } = useParams<{ solveId: string; problemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = (location.state as LocationState)?.title;
  const contentRef = useRef<HTMLDivElement>(null);

  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录后查看题解');
      navigate('/');
      return;
    }
    if (!pid || !solveId) {
      setError('缺少题目或题解信息');
      setLoading(false);
      return;
    }
    loadSolution();
  }, [pid, solveId]);

  const loadSolution = async () => {
    setLoading(true);
    try {
      const data = await api.get('/solve/detail', { params: { id: solveId } });
      if (data.code === 200) {
        setSolution(data.data);
        setError(null);
      } else {
        setError(data.msg || '获取题解失败');
      }
    } catch {
      setError('网络异常，获取题解失败');
    } finally {
      setLoading(false);
    }
  };

  const renderedContent = useMemo(() => {
    if (!solution?.content) return '<p>暂无内容</p>';
    const withLatex = renderLatex(solution.content);
    const html = marked.parse(withLatex) as string;
    return DOMPurify.sanitize(html);
  }, [solution?.content]);

  // 为代码块添加复制按钮和高亮
  useEffect(() => {
    if (!contentRef.current || loading) return;
    
    // 高亮代码块
    contentRef.current.querySelectorAll('pre code').forEach((block) => {
      hljs.highlightElement(block as HTMLElement);
    });

    const codeBlocks = contentRef.current.querySelectorAll('pre');
    codeBlocks.forEach((pre) => {
      if (pre.querySelector('.code-copy-btn')) return;
      pre.style.position = 'relative';
      const btn = document.createElement('button');
      btn.className = 'code-copy-btn absolute top-2 right-2 px-2 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-600';
      btn.innerHTML = '复制';
      btn.onclick = () => {
        const code = pre.querySelector('code')?.textContent || pre.textContent;
        navigator.clipboard.writeText(code || '').then(() => {
          toast.success('已复制代码');
        }).catch(() => {
          const textarea = document.createElement('textarea');
          textarea.value = code || '';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
          toast.success('已复制代码');
        });
      };
      pre.appendChild(btn);
    });
  }, [renderedContent, loading]);

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
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <Skeleton active paragraph={{ rows: 8 }} />
        ) : error ? (
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
        ) : (
          <>
            <Button
              type="link"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/problem/${pid}/solutions`, { state: { title: titleFromState } })}
              className="!pl-0 !mb-4"
              style={{ color: 'var(--gemini-accent-strong)' }}
            >
              返回题解列表
            </Button>
            <div className="gemini-card">
              <Space direction="vertical" size="large" className="w-full">
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
                  className="prose prose-blue max-w-none" 
                  ref={contentRef} 
                  dangerouslySetInnerHTML={{ __html: renderedContent }} 
                />
              </Space>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SolutionDetailPage;
