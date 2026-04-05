import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Button,
  Spin,
  Select,
  Alert,
  Input,
  Avatar,
  Popconfirm,
  App,
  Tag,
} from 'antd';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Code2,
  MessageSquare,
  BookOpen,
  Edit,
  Maximize2,
  Minimize2,
  Copy,
  Bot,
} from 'lucide-react';
import dayjs from 'dayjs';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/useJudgeWebSocket';
import { CodeEditor, PermissionGuard } from '@/components';
import { PermissionCode } from '@/constants/permissions';
import SuccessCelebration from '@/components/SuccessCelebration';
import type { ApiResponse, JudgeMessage } from '@/types';

const { TextArea } = Input;

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface ProblemExampleItem {
  id?: number;
  input: string;
  output: string;
  sortOrder?: number;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  /** 多组样例 */
  examples?: ProblemExampleItem[];
  inputExample?: string;
  outputExample?: string;
  hint: string;
  submitCount: number;
  passCount: number;
}

interface Comment {
  id: number;
  userId: number;
  username: string;
  userAvatar?: string;
  content: string;
  createTime: string;
  subcommentList?: Comment[];
  children?: Comment[];
}

interface LanguageOption {
  label: string;
  value: string;
  template: string;
}

const languageOptions: LanguageOption[] = [
  {
    label: 'C++',
    value: 'cpp',
    template: `#include <bits/stdc++.h>
using namespace std;

int main() {

    // 请在此处编写你的代码

    return 0;
}
`,
  },
  {
    label: 'Python 3',
    value: 'python',
    template: `# 请在此处编写你的代码
def main():
    pass

if __name__ == "__main__":
    main()
`,
  },
  {
    label: 'Java',
    value: 'java',
    template: `import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws Exception {
        // 请在此处编写你的代码
    }
}
`,
  },
];

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty?.toLowerCase()) {
    case '简单':
      return 'green';
    case '中等':
      return 'orange';
    case '困难':
      return 'red';
    default:
      return 'default';
  }
};

const ProblemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const _app = App.useApp();
  void _app;
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(languageOptions[0].template);

  // 生成代码缓存的key
  const getCodeCacheKey = useCallback((problemId: string, lang: string) => {
    return `problem_code_${problemId}_${lang}`;
  }, []);

  // 保存代码到LocalStorage
  const saveCodeToCache = useCallback((problemId: string, lang: string, codeContent: string) => {
    try {
      const key = getCodeCacheKey(problemId, lang);
      localStorage.setItem(key, codeContent);
    } catch (e) {
      console.warn('保存代码缓存失败:', e);
    }
  }, [getCodeCacheKey]);

  // 从LocalStorage读取代码
  const loadCodeFromCache = useCallback((problemId: string, lang: string): string | null => {
    try {
      const key = getCodeCacheKey(problemId, lang);
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('读取代码缓存失败:', e);
      return null;
    }
  }, [getCodeCacheKey]);
  const [testResult, setTestResult] = useState<{ type: string; message: string; detail?: string } | null>(null);
  const [submitResult, setSubmitResult] = useState<{ type: string; message: string; detail?: string } | null>(null);
  const [codeLoading, setCodeLoading] = useState({ test: false, submit: false });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentContent, setCommentContent] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [currentSnowflakeId, setCurrentSnowflakeId] = useState<string | null>(null);
  const [isEditorFullscreen, setIsEditorFullscreen] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const commentRefs = useRef<Record<number, HTMLDivElement | null>>({});
  /** 调试输入：默认第一组样例输入，用户可修改 */
  const [exampleInputs, setExampleInputs] = useState<Record<number, string>>({});
  /** 当前选中的样例 Tab 索引 */
  const [activeExampleTab, setActiveExampleTab] = useState(0);
  /** 记录每个样例是否被修改过（用于显示"自定义"标识） */
  const [modifiedExamples, setModifiedExamples] = useState<Record<number, boolean>>({});
  const userInfo = getUserInfo();

  // 监听浏览器全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsEditorFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 监听 AI 助手同步代码到编辑器的事件
  useEffect(() => {
    const handleSyncCode = (event: CustomEvent<{ code: string; language: string }>) => {
      const { code, language: lang } = event.detail;
      // 如果语言匹配或可以转换，则设置代码
      const langMap: Record<string, string> = {
        'cpp': 'cpp', 'c++': 'cpp', 'c': 'cpp',
        'python': 'python', 'py': 'python', 'python3': 'python',
        'java': 'java'
      };
      const mappedLang = langMap[lang.toLowerCase()] || language;
      if (mappedLang !== language) {
        setLanguage(mappedLang);
      }
      setCode(code);
      toast.success('代码已同步到编辑器');
    };

    window.addEventListener('sync-code-to-editor', handleSyncCode as EventListener);
    return () => {
      window.removeEventListener('sync-code-to-editor', handleSyncCode as EventListener);
    };
  }, [language]);

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    if (msg && currentSnowflakeId && String(msg.snowflakeId) === String(currentSnowflakeId)) {
      const status = msg.status || '未知状态';
      let type = 'info';
      if (status === '答案正确') type = 'success';
      else if (status === '评测中') type = 'info';
      else if (status === '编译错误') type = 'warning';
      else type = 'error';

      let detail = '';
      if (status === '评测中') {
        detail = '正在进行评测...';
      } else {
        detail = `运行时间: ${msg.time || 0}ms, 内存: ${msg.memory || 0}MB`;
        if (msg.testCount != null && msg.testCount > 0) {
          detail += `\n测试点：${msg.passCount ?? 0}/${msg.testCount}`;
        }
        if (msg.errorInfo) {
          detail += `\n\n${msg.errorInfo}`;
        }
      }

      setSubmitResult({ type, message: status, detail });

      // 答案正确时触发庆祝动画
      if (status === '答案正确') {
        setShowCelebration(true);
      }

      if (status !== '评测中') {
        window.dispatchEvent(new Event('notification-updated'));
      }
    }
  }, [currentSnowflakeId]);

  useJudgeWebSocket(handleWebSocketMessage);

  // 渲染 LaTeX 公式
  const renderLatex = useCallback((text: string): string => {
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      } catch {
        return match;
      }
    });
    text = text.replace(/\$([^$\n]+?)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch {
        return match;
      }
    });
    return text;
  }, []);

  const renderMarkdown = useCallback((content: string, fallback = '暂无内容') => {
    const raw = content && content.trim() ? content : fallback;
    const withLatex = renderLatex(raw);
    const html = marked.parse(withLatex) as string;
    // 配置 DOMPurify 允许更多标签和属性
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 'u', 's', 'del', 'code', 'pre', 
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'ul', 'ol', 'li', 'blockquote',
        'a', 'img', 'hr',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span'
      ],
      ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'id', 'style'],
      ALLOW_DATA_ATTR: false,
    });
  }, [renderLatex]);

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      return;
    }
    loadProblem();
  }, [id, navigate]);

  useEffect(() => {
    if (problem?.id) {
      loadTags(problem.id);
      loadComments(problem.id);
    }
  }, [problem?.id]);

  // 处理 URL 中的 commentId 参数，滚动到目标评论并高亮
  useEffect(() => {
    const commentId = searchParams.get('commentId');
    if (commentId && comments.length > 0 && !commentLoading) {
      const targetId = Number(commentId);
      setHighlightedCommentId(targetId);
      
      // 延迟执行滚动，确保 DOM 已渲染
      setTimeout(() => {
        const targetElement = commentRefs.current[targetId];
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);

      // 5秒后取消高亮
      const timer = setTimeout(() => {
        setHighlightedCommentId(null);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [searchParams, comments, commentLoading]);

  // 语言切换时，优先使用缓存的代码，否则使用模板
  useEffect(() => {
    if (!id) return;
    const cachedCode = loadCodeFromCache(id, language);
    if (cachedCode) {
      setCode(cachedCode);
    } else {
      const template = languageOptions.find((item) => item.value === language)?.template || languageOptions[0].template;
      setCode(template);
    }
  }, [language, id, loadCodeFromCache]);

  // 代码变化时保存到缓存（防抖）
  useEffect(() => {
    if (!id || !code) return;
    const timer = setTimeout(() => {
      saveCodeToCache(id, language, code);
    }, 500);
    return () => clearTimeout(timer);
  }, [code, id, language, saveCodeToCache]);

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = await api.get('/problem/get', { params: { id } }) as ApiResponse<Problem>;
      if (data.code === 200) {
        setProblem(data.data);
      } else {
        toast.error((data as any).msg || '加载题目失败');
      }
    } catch {
      toast.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTags = async (pid: number) => {
    try {
      const data = await api.get('/problem/tags', { params: { pid } }) as ApiResponse<string[]>;
      if (data.code === 200) {
        setTags(data.data || []);
      }
    } catch (error) {
      console.warn('加载标签失败:', error);
    }
  };

  const formatComments = (list: Comment[] = []): Comment[] =>
    list.map((item) => ({
      ...item,
      children: formatComments(item.subcommentList || []),
    }));

  const loadComments = async (pid: number) => {
    setCommentLoading(true);
    try {
      const data = await api.get('/comment/list', { params: { pid } }) as ApiResponse<Comment[]>;
      if (data.code === 200) {
        setComments(formatComments(data.data || []));
      }
    } catch {
      toast.error('加载评论失败');
    } finally {
      setCommentLoading(false);
    }
  };

  const infoItems = useMemo(() => {
    const submitCount = problem?.submitCount ?? 0;
    const passCount = problem?.passCount ?? 0;

    return [
      { label: '时间限制', value: problem?.timeLimit ? `${problem.timeLimit} ms` : '无限制' },
      { label: '内存限制', value: problem?.memoryLimit ? `${problem.memoryLimit} MB` : '无限制' },
      { label: '提交', value: submitCount },
      { label: '通过', value: passCount },
      {
        label: '通过率',
        value: submitCount > 0 ? `${Math.round((passCount / submitCount) * 10000) / 100}%` : '0%',
      },
    ];
  }, [problem]);

  // 当前选中的样例（用于测试）
  const currentExample = useMemo(() => {
    if (problem?.examples?.length && activeExampleTab < problem.examples.length) {
      return { 
        input: problem.examples[activeExampleTab].input, 
        output: problem.examples[activeExampleTab].output,
        index: activeExampleTab
      };
    }
    return null;
  }, [problem?.examples, activeExampleTab]);

  const normalizeTestText = useCallback((text?: string | null) => (text ?? '').replace(/\r\n/g, '\n').trim(), []);
  const currentTestInput = exampleInputs[activeExampleTab] ?? '';

  const matchedExample = useMemo(() => {
    if (!problem?.examples?.length) {
      return null;
    }
    const normalizedInput = normalizeTestText(currentTestInput);
    return problem.examples.find((example) => normalizeTestText(example.input) === normalizedInput) ?? null;
  }, [currentTestInput, problem?.examples, normalizeTestText]);

  // 判断当前输入是否为自定义（与当前选中的样例不同）
  const isCustomTest = useMemo(() => {
    if (!problem?.examples?.length || !currentExample) return false;
    return normalizeTestText(currentTestInput) !== normalizeTestText(currentExample.input);
  }, [currentTestInput, currentExample, problem?.examples?.length, normalizeTestText]);

  // 题目变化时，重置所有状态
  useEffect(() => {
    if (problem?.examples?.length) {
      setExampleInputs(
        problem.examples.reduce<Record<number, string>>((acc, example, index) => {
          acc[index] = example.input || '';
          return acc;
        }, {})
      );
      setActiveExampleTab(0);
      setModifiedExamples({});
    } else {
      setExampleInputs({});
    }
  }, [problem?.id]);

  // 切换样例 Tab 时保留各自输入内容
  const handleExampleTabChange = useCallback((index: number) => {
    if (!problem?.examples?.length) return;
    setActiveExampleTab(index);
  }, [problem?.examples]);

  // 输入内容变化时，检查是否被修改
  const handleTestInputChange = useCallback((value: string) => {
    setExampleInputs((prev) => ({ ...prev, [activeExampleTab]: value }));
    // 检查当前输入是否与当前样例原始输入不同
    if (currentExample && normalizeTestText(value) !== normalizeTestText(currentExample.input)) {
      setModifiedExamples(prev => ({ ...prev, [activeExampleTab]: true }));
    } else {
      setModifiedExamples(prev => ({ ...prev, [activeExampleTab]: false }));
    }
  }, [currentExample, activeExampleTab, normalizeTestText]);

  const handleResetCurrentExample = useCallback(() => {
    if (!currentExample) return;
    setExampleInputs((prev) => ({
      ...prev,
      [activeExampleTab]: currentExample.input || '',
    }));
    setModifiedExamples((prev) => ({ ...prev, [activeExampleTab]: false }));
  }, [currentExample, activeExampleTab]);

  const handleTestCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!currentExample?.output) {
      toast('该题目没有提供样例，无法测试');
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setTestResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem!.id),
        inputExample: currentTestInput,
        outputExample: matchedExample?.output ?? currentExample.output,
        time: String(problem!.timeLimit || 1000),
        memory: String(problem!.memoryLimit || 256),
        customTest: isCustomTest,
      };
      const data = await api.post('/judge/test', payload) as ApiResponse<{
        status?: string;
        errorInfo?: string;
        actualOutput?: string;
        passCount?: number | null;
        testCount?: number | null;
      }>;
      if (data.code === 200) {
        if (isCustomTest) {
          setTestResult({
            type: 'info',
            message: '自定义测试完成',
            detail: `程序输出:\n${data.data.actualOutput || '无输出'}`,
          });
        } else {
          let detail = data.data.errorInfo || '';
          if (data.data.testCount != null && data.data.testCount > 0) {
            const tcLine = `测试点：${data.data.passCount ?? 0}/${data.data.testCount}`;
            detail = detail ? `${detail}\n\n${tcLine}` : tcLine;
          }
          setTestResult({
            type: data.data.status === '答案正确' ? 'success' : 'warning',
            message: data.data.status || '测试完成',
            detail: detail || undefined,
          });
        }
      } else {
        setTestResult({ type: 'error', message: (data as any).msg || '测试失败' });
      }
    } catch (error: any) {
      setTestResult({
        type: 'error',
        message: error?.response?.data?.msg || '测试失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!problem) return;
    
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setSubmitResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem.id),
        title: problem.title,
        uname: userInfo.name,
        cid: '0',
        create_time: dayjs().format('YYYY-MM-DD HH:mm:ss'),
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = await api.post('/judge/submit', payload) as ApiResponse<{ snowflakeId?: string }>;
      if (data.code === 200) {
        if (data.data.snowflakeId) {
          setCurrentSnowflakeId(data.data.snowflakeId);
        }
        setSubmitResult({
          type: 'info',
          message: '等待评测',
          detail: '已提交，等待评测...',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setSubmitResult({ type: 'error', message: (data as any).msg || '提交失败' });
      }
    } catch (error: any) {
      setSubmitResult({
        type: 'error',
        message: error?.response?.data?.msg || '提交失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleSubmitComment = async () => {
    if (!commentContent.trim()) {
      toast('请输入评论内容');
      return;
    }
    if (!userInfo?.id || !problem) {
      toast.error('请先登录后再发表评论');
      return;
    }
    setCommentSubmitting(true);
    try {
      const payload = {
        problemId: Number(problem.id),
        parentId: replyTarget?.id || null,
        receiveUserId: replyTarget?.userId || null,
        username: userInfo.name,
        content: commentContent.trim(),
        createTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
      };
      const data = await api.post('/comment/publish', payload) as ApiResponse;
      if (data.code === 200) {
        toast.success('发布成功');
        setCommentContent('');
        setReplyTarget(null);
        loadComments(problem.id);
      } else {
        toast.error((data as any).msg || '发布失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '发布失败，请稍后重试');
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!problem) return;
    try {
      const data = await api.delete('/comment/delete', { params: { commentId } }) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除成功');
        loadComments(problem.id);
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除失败，请稍后重试');
    }
  };

  // 打开 AI 助手并发送分析请求
  const handleOpenAiAnalysis = () => {
    if (!problem) return;

    window.dispatchEvent(new CustomEvent('open-ai-assistant', {
      detail: {
        forceNewSession: true,
        problemContext: {
          problemId: problem.id,
          title: problem.title,
          difficulty: problem.difficulty,
          description: problem.description || '',
          inputFormat: problem.inputFormat || '',
          outputFormat: problem.outputFormat || '',
          hint: problem.hint || '',
          timeLimit: problem.timeLimit,
          memoryLimit: problem.memoryLimit,
          language,
          code,
        },
      },
    }));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`已复制${label}`);
    }).catch(() => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast.success(`已复制${label}`);
    });
  };

  const renderComments = (items: Comment[] = []): React.ReactNode =>
    items.map((item) => (
      <div 
        key={item.id} 
        ref={(el) => { commentRefs.current[item.id] = el; }}
        className={`py-4 last:border-0 transition-all duration-300 ${highlightedCommentId === item.id ? 'rounded-lg' : ''}`}
        style={{ 
          borderBottom: '1px solid var(--gemini-border-light)',
          ...(highlightedCommentId === item.id ? {
            backgroundColor: 'rgba(26, 115, 232, 0.15)',
            border: '2px solid var(--gemini-accent)',
            boxShadow: '0 0 12px rgba(26, 115, 232, 0.3)',
          } : {})
        }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              src={item.userAvatar}
              style={{ background: item.userAvatar ? 'transparent' : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}
            >
              {item.username?.charAt(0)?.toUpperCase() || 'U'}
            </Avatar>
            <div>
              <span className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>{item.username}</span>
              <span className="ml-3 text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                {dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setReplyTarget(item)}
              className="text-xs transition-colors"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              回复
            </button>
            {userInfo?.id && String(userInfo.id) === String(item.userId) && (
              <Popconfirm title="确定删除该评论？" onConfirm={() => handleDeleteComment(item.id)}>
                <button className="text-xs" style={{ color: 'var(--gemini-error)' }}>删除</button>
              </Popconfirm>
            )}
          </div>
        </div>
        <div
          className="mt-2 pl-11 prose prose-sm max-w-none"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(item.content) }}
        />
        {item.children?.length ? (
          <div className="ml-11 mt-4 pl-4" style={{ borderLeft: '2px solid var(--gemini-accent)' }}>
            {renderComments(item.children)}
          </div>
        ) : null}
      </div>
    ));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="gemini-card text-center py-12">
        <p style={{ color: 'var(--gemini-text-secondary)' }}>题目不存在</p>
      </div>
    );
  }

  const locationState = location.state as { from?: string; practiceId?: string } | null;

  return (
    <div className="space-y-6">
      {/* 题目信息卡片 */}
      <div className="gemini-card">
        {/* 标题和操作 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>
            #{problem.id} - {problem.title}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Button
              icon={<ArrowLeft className="w-4 h-4" />}
              onClick={() => {
                if (locationState?.from === 'practice' && locationState?.practiceId) {
                  navigate(`/practice/${locationState.practiceId}`);
                } else {
                  navigate('/problems');
                }
              }}
            >
              {locationState?.from === 'practice' ? '返回练习' : '返回题目列表'}
            </Button>
            <Button
              icon={<BookOpen className="w-4 h-4" />}
              onClick={() => navigate(`/problem/${problem.id}/solutions`, { state: { title: problem.title } })}
            >
              查看题解
            </Button>
            <Button
              type="primary"
              icon={<Edit className="w-4 h-4" />}
              onClick={() => navigate(`/problem/${problem.id}/solutions/publish`, { state: { title: problem.title } })}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              发布题解
            </Button>
          </div>
        </div>

        {/* 题目元信息 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {infoItems.map((item) => (
            <div key={item.label} className="rounded-3xl p-4 text-center" style={{ backgroundColor: 'var(--gemini-bg)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-disabled)' }}>{item.label}</div>
              <div className="text-lg font-bold" style={{ color: 'var(--gemini-text-primary)' }}>{item.value}</div>
            </div>
          ))}
        </div>

        {/* 难度和标签 */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--gemini-text-secondary)' }}>难度：</span>
            <Tag color={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Tag>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--gemini-text-secondary)' }}>标签：</span>
            {tags.length ? (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </div>
            ) : (
              <span style={{ color: 'var(--gemini-text-disabled)' }}>无标签</span>
            )}
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--gemini-border-light)', margin: '1.5rem 0' }} />

        {/* 题目描述 */}
        <section className="mb-6">
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--gemini-text-primary)' }}>题目描述</h2>
          <div
            className="prose prose-sm max-w-none"
            style={{ color: 'var(--gemini-text-primary)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
          />
        </section>

        {/* 输入输出格式 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--gemini-text-primary)' }}>输入格式</h2>
            <div
              className="prose prose-sm max-w-none"
              style={{ color: 'var(--gemini-text-primary)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat, '暂无输入格式说明') }}
            />
          </section>
          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--gemini-text-primary)' }}>输出格式</h2>
            <div
              className="prose prose-sm max-w-none"
              style={{ color: 'var(--gemini-text-primary)' }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat, '暂无输出格式说明') }}
            />
          </section>
        </div>

        {/* 样例：仅来自 problem_example 多组 */}
        {problem.examples?.length ? (
          problem.examples.map((ex, idx) => (
            <div key={idx} className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>输入样例 {idx + 1}</h3>
                  <button
                    onClick={() => ex.input && copyToClipboard(ex.input, '输入样例')}
                    className="transition-colors"
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="rounded-2xl p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: 'var(--gemini-surface)', color: 'var(--gemini-text-primary)' }}>
                  {ex.input || '暂无输入样例'}
                </pre>
              </div>
              <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>输出样例 {idx + 1}</h3>
                  <button
                    onClick={() => ex.output && copyToClipboard(ex.output, '输出样例')}
                    className="transition-colors"
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
                <pre className="rounded-2xl p-3 text-sm font-mono overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: 'var(--gemini-surface)', color: 'var(--gemini-text-primary)' }}>
                  {ex.output || '暂无输出样例'}
                </pre>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-3xl p-4 mb-6" style={{ backgroundColor: 'var(--gemini-bg)', color: 'var(--gemini-text-disabled)' }}>
            暂无样例
          </div>
        )}

        {/* 提示 */}
        <section>
          <h2 className="text-lg font-bold mb-3" style={{ color: 'var(--gemini-text-primary)' }}>提示</h2>
          <div
            className="prose prose-sm max-w-none"
            style={{ color: 'var(--gemini-text-primary)' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
          />
        </section>
      </div>

      {/* 代码编辑器 */}
      <div className="gemini-card">
        <div className="flex items-center gap-2 mb-4">
          <Code2 className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--gemini-text-primary)' }}>在线代码编辑器</h2>
        </div>

        {/* 工具栏 */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Select value={language} onChange={setLanguage} className="w-40">
              {languageOptions.map((opt) => (
                <Select.Option key={opt.value} value={opt.value}>
                  {opt.label}
                </Select.Option>
              ))}
            </Select>
            <button
              onClick={() => {
                const template = languageOptions.find((item) => item.value === language)?.template || '';
                setCode(template);
              }}
              className="text-sm transition-colors"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              重置模板
            </button>
          </div>
          <button
            onClick={() => {
              if (!isEditorFullscreen) {
                document.documentElement.requestFullscreen();
                setIsEditorFullscreen(true);
              } else {
                document.exitFullscreen();
                setIsEditorFullscreen(false);
              }
            }}
            className="inline-flex items-center gap-1 text-sm transition-colors"
            style={{ color: 'var(--gemini-text-secondary)' }}
          >
            {isEditorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            {isEditorFullscreen ? '退出全屏' : '全屏编辑'}
          </button>
        </div>

        {language === 'java' && (
          <Alert
            message="暂不支持用Java提交，请等待"
            type="info"
            showIcon
            className="mb-4 rounded-2xl"
          />
        )}

        {/* 全屏编辑器 */}
        {isEditorFullscreen && createPortal(
          <div className="fixed inset-0 z-[99999]" style={{ backgroundColor: 'var(--gemini-surface)' }}>
            <button
              onClick={() => {
                document.exitFullscreen();
                setIsEditorFullscreen(false);
              }}
              className="absolute bottom-4 right-4 z-[100000] px-4 py-2 rounded-full transition-colors"
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)' }}
            >
              <Minimize2 className="w-4 h-4 inline mr-2" />
              退出全屏
            </button>
            <CodeEditor value={code} onChange={setCode} language={language} height="100vh" />
          </div>,
          document.body
        )}

        {/* 普通编辑器 */}
        {!isEditorFullscreen && (
          <CodeEditor value={code} onChange={setCode} language={language} height={420} />
        )}

        {/* 调试输入：支持 Tab 切换多组样例 */}
        {problem.examples?.length ? (
          <div className="mt-4">
            {/* 样例 Tab 切换 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {problem.examples.map((_, index) => (
                <button
                  key={index}
                  onClick={() => handleExampleTabChange(index)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                    activeExampleTab === index
                      ? 'shadow-sm'
                      : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: activeExampleTab === index 
                      ? 'var(--gemini-accent)' 
                      : 'var(--gemini-bg)',
                    color: activeExampleTab === index 
                      ? 'var(--gemini-accent-text)' 
                      : 'var(--gemini-text-secondary)',
                    border: `1px solid ${activeExampleTab === index ? 'transparent' : 'var(--gemini-border-light)'}`,
                  }}
                >
                  样例 {index + 1}
                  {modifiedExamples[index] && (
                    <span 
                      className="ml-1 px-1.5 py-0.5 text-xs rounded"
                      style={{ 
                        backgroundColor: 'var(--gemini-warning)', 
                        color: '#fff' 
                      }}
                    >
                      已修改
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative">
              <Input.TextArea
                value={currentTestInput}
                onChange={(e) => handleTestInputChange(e.target.value)}
                placeholder="默认已填入当前样例输入，可修改后点击「测试样例」"
                rows={4}
                className="rounded-2xl font-mono text-sm"
                style={{
                  backgroundColor: 'var(--gemini-bg)',
                  borderColor: 'var(--gemini-border-light)',
                  paddingBottom: 36,
                }}
              />
              <button
                onClick={handleResetCurrentExample}
                className="absolute bottom-3 right-3 text-xs transition-colors"
                style={{
                  color: 'var(--gemini-text-secondary)',
                  backgroundColor: 'var(--gemini-surface)',
                  border: '1px solid var(--gemini-border-light)',
                  borderRadius: 9999,
                  padding: '2px 8px',
                }}
              >
                重置当前样例
              </button>
            </div>
            {isCustomTest && (
              <div className="mt-2 text-xs" style={{ color: 'var(--gemini-warning)' }}>
                输入已修改，测试时将使用自定义输入，结果只显示程序实际输出
              </div>
            )}
          </div>
        ) : null}

        {/* 操作按钮 */}
        <div className="flex flex-wrap items-center gap-3 mt-4">
          <PermissionGuard permission={PermissionCode.AI_CHAT}>
            <Button icon={<Bot className="w-4 h-4" />} onClick={handleOpenAiAnalysis}>
              AI分析
            </Button>
          </PermissionGuard>
          <Button loading={codeLoading.test} onClick={handleTestCode} disabled={language === 'java' || !problem.examples?.length}>
            测试样例
          </Button>
          <Button
            type="primary"
            loading={codeLoading.submit}
            onClick={handleSubmitCode}
            disabled={language === 'java'}
            style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
          >
            提交评测
          </Button>
        </div>

        {/* 结果显示 */}
        {(testResult || submitResult) && (
          <div className="mt-4 space-y-3">
            {testResult && (
              <Alert
                type={testResult.type as 'success' | 'info' | 'warning' | 'error'}
                message={`测试结果：${testResult.message}`}
                description={<pre className="whitespace-pre-wrap">{testResult.detail}</pre>}
                showIcon
                closable
                onClose={() => setTestResult(null)}
              />
            )}
            {submitResult && (
              <Alert
                type={submitResult.type as 'success' | 'info' | 'warning' | 'error'}
                message={`提交结果：${submitResult.message}`}
                description={<pre className="whitespace-pre-wrap">{submitResult.detail}</pre>}
                showIcon
                closable
                onClose={() => setSubmitResult(null)}
              />
            )}
          </div>
        )}
      </div>

      {/* 评论区 */}
      <div className="gemini-card">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
          <h2 className="text-lg font-bold" style={{ color: 'var(--gemini-text-primary)' }}>评论讨论</h2>
          <Tag color="blue">{comments.length}</Tag>
        </div>

        {/* 评论输入 */}
        <div className="mb-6">
          {replyTarget && (
            <div className="flex items-center gap-2 mb-2 text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
              回复 @{replyTarget.username}
              <button onClick={() => setReplyTarget(null)} style={{ color: 'var(--gemini-error)' }}>
                取消
              </button>
            </div>
          )}
          <TextArea
            rows={4}
            placeholder="分享你的想法、解题思路或遇到的问题..."
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            maxLength={500}
            className="rounded-3xl"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>{commentContent.length}/500</span>
            <Button 
              type="primary" 
              onClick={handleSubmitComment} 
              loading={commentSubmitting}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              发表评论
            </Button>
          </div>
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid var(--gemini-border-light)', margin: '1.5rem 0' }} />

        {/* 评论列表 */}
        {commentLoading ? (
          <div className="flex justify-center py-8">
            <Spin />
          </div>
        ) : comments.length ? (
          renderComments(comments)
        ) : (
          <p className="text-center py-8" style={{ color: 'var(--gemini-text-disabled)' }}>还没有评论，快来抢沙发吧！</p>
        )}
      </div>

      {/* 答案正确庆祝动画 */}
      <SuccessCelebration
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        title="🎉 恭喜通过！"
        subtitle="Accepted"
      />
    </div>
  );
};

export default ProblemDetail;

