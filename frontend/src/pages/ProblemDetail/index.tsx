import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Button,
  Spin,
  Avatar,
  Popconfirm,
  App,
  Tag,
  Drawer,
} from 'antd';
import toast from 'react-hot-toast';
import Select from '../../components/Select';
import Input from '../../components/Input';
import {
  ArrowLeft,
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
import { copyTextToClipboard } from '@/utils/clipboard';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/useJudgeWebSocket';
import { CodeEditor, PermissionGuard, ProblemWorkbench, WorkbenchResult, mapJudgeStatusToVariant } from '@/components';
import type { WorkbenchResultData } from '@/components';
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
  const [runResult, setRunResult] = useState<WorkbenchResultData | null>(null);
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
  /** 工作台底部 Tab：运行结果 / 自测输入 */
  const [activeBottomTab, setActiveBottomTab] = useState<'result' | 'input'>('result');
  /** 评论抽屉开关 */
  const [commentsOpen, setCommentsOpen] = useState(false);
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
      if (status === '评测中') {
        setRunResult({
          variant: 'info',
          source: 'submit',
          headline: status,
          bodyText: '正在进行评测...',
        });
      } else {
        const hasTests = msg.testCount != null && msg.testCount > 0;
        setRunResult({
          variant: mapJudgeStatusToVariant(status),
          source: 'submit',
          headline: status,
          description: msg.description || status,
          metrics: {
            timeMs: msg.time ?? 0,
            memoryMb: msg.memory ?? 0,
            ...(hasTests ? { passCount: msg.passCount ?? 0, testCount: msg.testCount! } : {}),
          },
          errorInfo: msg.errorInfo || undefined,
        });
      }

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

  const handleTestCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!currentExample?.output) {
      toast('该题目没有提供样例，无法测试');
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setRunResult({
      variant: 'info',
      source: 'test',
      headline: '评测中',
      description: '评测中：正在执行自测运行，请稍候…',
    });
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
        description?: string;
        errorInfo?: string;
        input?: string;
        expectedOutput?: string;
        actualOutput?: string;
        passCount?: number | null;
        testCount?: number | null;
      }>;
      if (data.code === 200) {
        if (isCustomTest) {
          setRunResult({
            variant: 'info',
            source: 'test',
            headline: '自定义测试完成',
            description: '已使用自定义输入运行你的程序，下方为程序实际输出。',
            diff: {
              input: currentTestInput,
              actual: data.data.actualOutput || '',
            },
          });
        } else {
          const hasTests = data.data.testCount != null && data.data.testCount > 0;
          const status = data.data.status || '测试完成';
          const isCompileError = status === '编译错误' || status === 'Compile Error';
          setRunResult({
            variant: mapJudgeStatusToVariant(status),
            source: 'test',
            headline: status,
            description: data.data.description || status,
            metrics: hasTests
              ? { passCount: data.data.passCount ?? 0, testCount: data.data.testCount! }
              : undefined,
            errorInfo: data.data.errorInfo || undefined,
            diff: isCompileError
              ? undefined
              : {
                  input: data.data.input ?? currentTestInput,
                  expected: data.data.expectedOutput ?? (matchedExample?.output ?? currentExample.output ?? ''),
                  actual: data.data.actualOutput ?? '',
                },
          });
        }
      } else {
        setRunResult({
          variant: 'error',
          source: 'test',
          headline: (data as any).msg || '测试失败',
        });
      }
    } catch (error: any) {
      setRunResult({
        variant: 'error',
        source: 'test',
        headline: error?.response?.data?.msg || '测试失败，请稍后重试',
      });
    } finally {
      setCodeLoading((prev) => ({ ...prev, test: false }));
    }
  };

  const handleSubmitCode = async () => {
    setActiveBottomTab('result');
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!problem) return;
    
    setCodeLoading((prev) => ({ ...prev, submit: true }));
    setRunResult({
      variant: 'info',
      source: 'submit',
      headline: '评测中',
      description: '评测中：正在进行评测，请稍候…',
    });
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
      const data = await api.post('/judge/submit', payload) as ApiResponse<{
        snowflakeId?: string;
        status?: string;
        description?: string;
        queueAhead?: number | null;
      }>;
      if (data.code === 200) {
        if (data.data.snowflakeId) {
          setCurrentSnowflakeId(data.data.snowflakeId);
        }
        setRunResult({
          variant: 'info',
          source: 'submit',
          headline: data.data.status || '等待评测',
          description: data.data.description || '等待评测：已加入评测队列。',
        });
        window.dispatchEvent(new Event('notification-updated'));
      } else {
        setRunResult({
          variant: 'error',
          source: 'submit',
          headline: (data as any).msg || '提交失败',
        });
      }
    } catch (error: any) {
      setRunResult({
        variant: 'error',
        source: 'submit',
        headline: error?.response?.data?.msg || '提交失败，请稍后重试',
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

  const copyToClipboard = async (text: string, label: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      toast.success(`已复制${label}`);
    } else {
      toast.error('复制失败，请手动选择文本复制');
    }
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

  // ---- 顶部操作栏 ----
  const statPillStyle: React.CSSProperties = {
    backgroundColor: 'var(--gemini-bg)',
    border: '1px solid var(--gemini-border-light)',
    borderRadius: 9999,
    padding: '4px 12px',
    color: 'var(--gemini-text-secondary)',
  };
  const topBar = (
    <>
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
        {locationState?.from === 'practice' ? '返回练习' : '返回'}
      </Button>
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="font-semibold whitespace-nowrap"
          style={{ color: 'var(--gemini-text-primary)', fontSize: 15 }}
          title={`#${problem.id} - ${problem.title}`}
        >
          #{problem.id} · {problem.title}
        </span>
        <Tag color={getDifficultyColor(problem.difficulty)} style={{ margin: 0, fontSize: 12, padding: '2px 10px' }}>
          {problem.difficulty}
        </Tag>
      </div>
      <div
        className="hidden lg:flex items-center gap-2 text-xs flex-none"
      >
        <span style={statPillStyle}>时间 {problem.timeLimit || 1000} ms</span>
        <span style={statPillStyle}>内存 {problem.memoryLimit || 256} MB</span>
        <span style={statPillStyle}>提交 {problem.submitCount ?? 0}</span>
        <span style={statPillStyle}>通过 {problem.passCount ?? 0}</span>
      </div>
      <div className="flex-auto" />
      <div className="flex items-center gap-2 flex-none">
        <PermissionGuard permission={PermissionCode.AI_CHAT}>
          <Button icon={<Bot className="w-4 h-4" />} onClick={handleOpenAiAnalysis}>
            AI分析
          </Button>
        </PermissionGuard>
        <Button
          icon={<BookOpen className="w-4 h-4" />}
          onClick={() => navigate(`/problem/${problem.id}/solutions`, { state: { title: problem.title } })}
        >
          题解
        </Button>
        <Button
          icon={<Edit className="w-4 h-4" />}
          onClick={() => navigate(`/problem/${problem.id}/solutions/publish`, { state: { title: problem.title } })}
        >
          发布题解
        </Button>
        <Button
          icon={<MessageSquare className="w-4 h-4" />}
          onClick={() => setCommentsOpen(true)}
        >
          评论 {comments.length ? `(${comments.length})` : ''}
        </Button>
      </div>
    </>
  );

  // ---- 左侧题目描述面板 ----
  const leftPanel = (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: 'var(--gemini-text-secondary)' }}>
        <span>时间限制：{problem.timeLimit || 1000} ms</span>
        <span>·</span>
        <span>内存限制：{problem.memoryLimit || 256} MB</span>
      </div>
      {tags.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--gemini-text-secondary)' }}>标签：</span>
          {tags.map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
        </div>
      ) : null}
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>题目描述</h2>
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.description) }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输入格式</h2>
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.inputFormat, '暂无输入格式说明') }}
        />
      </section>
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>输出格式</h2>
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.outputFormat, '暂无输出格式说明') }}
        />
      </section>
      {problem.examples?.length ? (
        problem.examples.map((ex, idx) => (
          <section key={idx} className="space-y-3">
            <h2 className="text-base font-bold" style={{ color: 'var(--gemini-text-primary)' }}>示例 {idx + 1}</h2>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输入</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.input || '暂无输入样例'}
                </pre>
                <button
                  onClick={() => ex.input && copyToClipboard(ex.input, '输入样例')}
                  className="absolute top-2 right-2 p-1 rounded-md transition-colors hover:bg-black/5"
                  style={{ color: 'var(--gemini-text-secondary)' }}
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <div className="text-xs mb-1" style={{ color: 'var(--gemini-text-secondary)' }}>输出</div>
              <div className="relative">
                <pre className="rounded-xl p-3 pr-10 text-sm font-mono overflow-x-auto whitespace-pre-wrap border" style={{ backgroundColor: 'var(--gemini-bg)', borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-primary)' }}>
{ex.output || '暂无输出样例'}
                </pre>
                <button
                  onClick={() => ex.output && copyToClipboard(ex.output, '输出样例')}
                  className="absolute top-2 right-2 p-1 rounded-md transition-colors hover:bg-black/5"
                  style={{ color: 'var(--gemini-text-secondary)' }}
                  title="复制"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </section>
        ))
      ) : null}
      <section>
        <h2 className="text-base font-bold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>提示</h2>
        <div
          className="prose prose-sm max-w-none"
          style={{ color: 'var(--gemini-text-primary)' }}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(problem.hint, '暂无提示') }}
        />
      </section>
    </div>
  );

  // ---- 编辑器顶部工具栏 ----
  const editorHeader = (
    <>
      <Select
        value={language}
        onChange={setLanguage}
        className="w-36"
        options={languageOptions.map((opt) => ({ value: opt.value, label: opt.label }))}
      />
      <button
        onClick={() => {
          const template = languageOptions.find((item) => item.value === language)?.template || '';
          setCode(template);
        }}
        className="text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        重置模板
      </button>
      <div className="flex-auto" />
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
        className="inline-flex items-center gap-1 text-xs transition-colors px-2 py-1 rounded hover:bg-black/5"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        {isEditorFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        {isEditorFullscreen ? '退出全屏' : '全屏'}
      </button>
    </>
  );

  // 载入指定示例到自测输入
  const loadExampleInput = (i: number) => {
    if (!problem.examples?.[i]) return;
    setActiveExampleTab(i);
    setExampleInputs((prev) => ({ ...prev, [i]: problem.examples![i].input || '' }));
    setModifiedExamples((prev) => ({ ...prev, [i]: false }));
  };

  // ---- 自测输入区域 ----
  const inputArea = (
    <div className="flex flex-col h-full min-h-0">
      <Input.TextArea
        value={currentTestInput}
        onChange={(e) => handleTestInputChange(e.target.value)}
        placeholder="请输入示例或载入测试用例"
        className="!flex-auto !rounded-xl font-mono text-sm"
        style={{
          backgroundColor: '#fff',
          borderColor: 'var(--gemini-border-light)',
          resize: 'none',
          minHeight: 80,
        }}
      />
      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {problem.examples?.length ? (
          problem.examples.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => loadExampleInput(i)}
              className="px-3 py-1 text-xs rounded-md transition-colors"
              style={{
                backgroundColor: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent)'
                  : 'var(--gemini-bg)',
                color: activeExampleTab === i && !modifiedExamples[i]
                  ? 'var(--gemini-accent-text)'
                  : 'var(--gemini-text-secondary)',
                border: `1px solid ${activeExampleTab === i && !modifiedExamples[i]
                  ? 'transparent'
                  : 'var(--gemini-border-light)'}`,
              }}
            >
              载入示例 {i + 1}
            </button>
          ))
        ) : (
          <span className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>该题目未提供示例</span>
        )}
        {isCustomTest && (
          <span className="text-xs ml-2" style={{ color: 'var(--gemini-warning)' }}>
            自定义输入
          </span>
        )}
      </div>
    </div>
  );

  // ---- 运行结果区域 ----
  const resultsArea = runResult ? (
    <WorkbenchResult data={runResult} />
  ) : (
    <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
      点击右上角「自测运行」或「保存并提交」后，结果将显示在此处。
    </div>
  );

  // ---- Tab 右侧次级操作（自测运行） ----
  const tabActions = (
    <Button
      loading={codeLoading.test}
      onClick={handleTestCode}
      disabled={!problem.examples?.length}
      style={{ padding: '0 16px', height: 32, fontSize: 14 }}
    >
      自测运行
    </Button>
  );

  // ---- 最右主操作（保存并提交） ----
  const primaryAction = (
    <Button
      type="primary"
      loading={codeLoading.submit}
      onClick={handleSubmitCode}
      style={{
        padding: '0 18px',
        height: 34,
        fontSize: 14,
        fontWeight: 500,
        backgroundColor: 'var(--gemini-accent)',
        color: 'var(--gemini-accent-text)',
        border: 'none',
      }}
    >
      保存并提交
    </Button>
  );

  return (
    <div
      className="fixed z-[20]"
      style={{
        top: 0,
        left: 80,
        right: 0,
        bottom: 0,
        backgroundColor: 'var(--gemini-bg, #f7f8fa)',
      }}
    >
      <ProblemWorkbench
        storageKey={`problem-workbench:${problem.id}`}
        topBar={topBar}
        leftPanel={leftPanel}
        editorHeader={editorHeader}
        editor={
          isEditorFullscreen ? (
            <div className="w-full h-full flex items-center justify-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
              代码已在全屏中编辑…
            </div>
          ) : (
            <CodeEditor value={code} onChange={setCode} language={language} height="100%" />
          )
        }
        bottomTabs={[
          { key: 'result', label: '运行结果' },
          { key: 'input', label: '自测输入' },
        ]}
        activeBottomTab={activeBottomTab}
        onBottomTabChange={(k) => setActiveBottomTab(k as 'result' | 'input')}
        bottomContent={activeBottomTab === 'result' ? resultsArea : inputArea}
        tabActions={tabActions}
        primaryAction={primaryAction}
      />

      {/* 全屏编辑器（保留原全屏行为） */}
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

      {/* 评论抽屉 */}
      <Drawer
        title={(
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
            <span>评论讨论</span>
            <Tag color="blue">{comments.length}</Tag>
          </div>
        )}
        placement="right"
        width={Math.min(560, typeof window !== 'undefined' ? window.innerWidth : 560)}
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        destroyOnClose={false}
      >
        <div className="flex flex-col h-full">
          <div className="mb-4">
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
              className="rounded-2xl"
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
          <hr style={{ border: 'none', borderTop: '1px solid var(--gemini-border-light)', margin: '0.75rem 0' }} />
          <div className="flex-auto overflow-auto">
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
        </div>
      </Drawer>

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
