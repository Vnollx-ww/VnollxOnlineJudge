import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import katex from 'katex';
import { problemApi, solutionApi } from '@/lib';
import { getUserInfo, isAuthenticated } from '@/utils/auth';

marked.setOptions({ gfm: true, breaks: true });

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

export const useSolutionPublish = () => {
  const { problemId } = useParams<{ problemId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const pid = problemId;
  const problemTitleFromState = (location.state as LocationState)?.title;
  const [problemInfo, setProblemInfo] = useState<{ id?: string; title?: string } | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);

  const loadProblemInfo = async () => {
    if (problemTitleFromState) {
      setProblemInfo({ id: pid, title: problemTitleFromState });
      return;
    }
    try {
      const data = await problemApi.get<{ id?: string; title?: string }>(pid);
      if (data.code === 200) setProblemInfo(data.data);
      else toast.error(data.msg || '获取题目信息失败');
    } catch {
      toast.error('获取题目信息失败');
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录后再发布题解');
      navigate('/');
      return;
    }
    if (!pid) {
      toast.error('缺少题目 ID');
      navigate('/problems');
      return;
    }
    loadProblemInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const charCount = content.length;

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error('请输入题解标题'); return; }
    if (!content.trim()) { toast.error('请输入题解内容'); return; }
    setSubmitting(true);
    try {
      const user = getUserInfo();
      const payload = { pid, content, title, name: user?.name, problemName: problemInfo?.title };
      const data = await solutionApi.create(payload);
      if (data.code === 200) {
        toast.success('题解发布成功，审核通过后可见');
        navigate(`/problem/${pid}/solutions`, { state: { title: problemInfo?.title } });
      } else {
        toast.error(data.msg || '发布题解失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '发布题解失败');
    } finally {
      setSubmitting(false);
    }
  };

  const previewContent = useMemo(() => {
    if (!content.trim()) return '<p style="color: var(--gemini-text-disabled);">暂无内容</p>';
    const withLatex = renderLatex(content);
    const html = marked.parse(withLatex) as string;
    return DOMPurify.sanitize(html);
  }, [content]);

  useEffect(() => {
    if (previewVisible) {
      setTimeout(() => {
        document.querySelectorAll('.preview-content pre code').forEach((block) => {
          hljs.highlightElement(block as HTMLElement);
        });
      }, 100);
    }
  }, [previewVisible, previewContent]);

  return {
    navigate,
    pid,
    problemInfo,
    title,
    setTitle,
    content,
    setContent,
    submitting,
    previewVisible,
    setPreviewVisible,
    charCount,
    previewContent,
    handleSubmit,
  };
};
