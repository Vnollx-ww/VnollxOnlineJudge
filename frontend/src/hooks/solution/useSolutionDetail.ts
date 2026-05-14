import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import { solutionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

marked.setOptions({ gfm: true, breaks: true });

export interface Solution {
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

const renderLatex = (text: string) => {
  if (!text) return text;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false }); } catch { return match; }
  });
  text = text.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
    try { return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false }); } catch { return match; }
  });
  return text;
};

export const useSolutionDetail = () => {
  const { solveId, problemId } = useParams<{ solveId: string; problemId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = (location.state as LocationState)?.title;
  const contentRef = useRef<HTMLDivElement>(null);

  const [solution, setSolution] = useState<Solution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSolution = async () => {
    setLoading(true);
    try {
      const data = await solutionApi.detail<Solution>(solveId);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid, solveId]);

  const renderedContent = useMemo(() => {
    if (!solution?.content) return '<p>暂无内容</p>';
    const withLatex = renderLatex(solution.content);
    const html = marked.parse(withLatex) as string;
    return DOMPurify.sanitize(html);
  }, [solution?.content]);

  useEffect(() => {
    if (!contentRef.current || loading) return;
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

  return {
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
  };
};
