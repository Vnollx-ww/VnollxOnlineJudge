import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { problemApi, solutionApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

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

export const getPreviewText = (content: string) => {
  if (!content) return '';
  let text = content;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, formula) => formula.trim());
  text = text.replace(/\$([^$\n]+?)\$/g, (_, formula) => formula.trim());
  const html = marked.parse(text) as string;
  const div = document.createElement('div');
  div.innerHTML = DOMPurify.sanitize(html);
  return div.textContent || div.innerText || '';
};

export const useSolutionList = () => {
  const navigate = useNavigate();
  const { problemId } = useParams<{ problemId: string }>();
  const location = useLocation();
  const pid = problemId;
  const titleFromState = (location.state as LocationState)?.title;

  const [problemInfo, setProblemInfo] = useState<{ title?: string; id?: string } | null>(null);
  const [solutions, setSolutions] = useState<Solution[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadProblemInfo = async () => {
    try {
      if (titleFromState) {
        setProblemInfo({ title: titleFromState, id: pid });
        return;
      }
      const data = await problemApi.get<{ title?: string; id?: string }>(pid);
      if (data.code === 200) setProblemInfo(data.data);
      else setFetchError(data.msg || '获取题目信息失败');
    } catch {
      setFetchError('获取题目信息失败');
    }
  };

  const loadSolutions = async () => {
    setLoading(true);
    try {
      const data = await solutionApi.list<Solution[]>(pid);
      if (data.code === 200) {
        setSolutions((data.data || []).reverse());
        setFetchError(null);
      } else {
        setFetchError(data.msg || '获取题解失败');
      }
    } catch {
      setFetchError('网络异常，获取题解失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pid) {
      setFetchError('缺少题目 ID，无法加载题解');
      setLoading(false);
      return;
    }
    loadProblemInfo();
    loadSolutions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const handlePublish = () => {
    if (!isAuthenticated()) {
      toast.error('请先登录后再发布题解');
      return;
    }
    navigate(`/problem/${pid}/solutions/publish`, { state: { title: problemInfo?.title } });
  };

  const handleSolveClick = (solveId: number) => {
    navigate(`/problem/${pid}/solutions/${solveId}`, { state: { title: problemInfo?.title } });
  };

  const pageTitle = useMemo(() => {
    if (problemInfo?.title) return `${problemInfo.title} - 题解列表`;
    return '题解列表';
  }, [problemInfo?.title]);

  return {
    navigate,
    pid,
    problemInfo,
    solutions,
    loading,
    fetchError,
    pageTitle,
    loadSolutions,
    handlePublish,
    handleSolveClick,
    getPreviewText,
  };
};
