import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Button,
  Spin,
  Select,
  Alert,
  Input,
  Avatar,
  Popconfirm,
  App,
  Modal,
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
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import { getUserInfo, isAuthenticated } from '@/utils/auth';
import { useJudgeWebSocket } from '@/hooks/useJudgeWebSocket';
import { CodeEditor } from '@/components';
import type { ApiResponse, JudgeMessage } from '@/types';

const { TextArea } = Input;

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
});

interface Problem {
  id: number;
  title: string;
  difficulty: string;
  timeLimit: number;
  memoryLimit: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  inputExample: string;
  outputExample: string;
  hint: string;
  submitCount: number;
  passCount: number;
}

interface Comment {
  id: number;
  userId: number;
  username: string;
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
    template: `#include <iostream>
// 注意：本平台禁止使用 #include <bits/stdc++.h>
// 请根据需要自行包含标准库头文件
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
  const { } = App.useApp();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [language, setLanguage] = useState(languageOptions[0].value);
  const [code, setCode] = useState(languageOptions[0].template);
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
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState('');

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

  const handleWebSocketMessage = useCallback((msg: JudgeMessage) => {
    if (msg && currentSnowflakeId && String((msg as any).snowflakeId) === String(currentSnowflakeId)) {
      const status = (msg as any).status || '未知状态';
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
        if ((msg as any).errorInfo) {
          detail += `\n\n${(msg as any).errorInfo}`;
        }
      }

      setSubmitResult({ type, message: status, detail });

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
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
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

  useEffect(() => {
    const template = languageOptions.find((item) => item.value === language)?.template || languageOptions[0].template;
    setCode(template);
  }, [language]);

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

  const handleTestCode = async () => {
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!problem?.inputExample || !problem?.outputExample) {
      toast('该题目没有提供样例，无法测试');
      return;
    }
    setCodeLoading((prev) => ({ ...prev, test: true }));
    setTestResult(null);
    try {
      const payload = {
        code,
        option: language,
        pid: String(problem.id),
        inputExample: problem.inputExample,
        outputExample: problem.outputExample,
        time: String(problem.timeLimit || 1000),
        memory: String(problem.memoryLimit || 256),
      };
      const data = await api.post('/judge/test', payload) as ApiResponse<{ status: string; errorInfo?: string }>;
      if (data.code === 200) {
        setTestResult({
          type: data.data.status === '答案正确' ? 'success' : 'warning',
          message: data.data.status || '测试完成',
          detail: data.data.errorInfo,
        });
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

  // 打开 AI 分析弹窗（不清空历史）
  const handleOpenAiAnalysis = () => {
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    setAiAnalysisVisible(true);
  };

  // 开始/重新分析
  const handleStartAiAnalysis = async () => {
    if (!code.trim()) {
      toast('请先输入代码');
      return;
    }
    if (!problem) return;
    
    setAiAnalysisLoading(true);
    setAiAnalysisResult(''); // 清空旧结果
    
    try {
      const prompt = `请分析以下代码，结合题目信息给出改进建议：

【题目】${problem.title}
【题目描述】${problem.description || '无'}
【输入格式】${problem.inputFormat || '无'}
【输出格式】${problem.outputFormat || '无'}
【时间限制】${problem.timeLimit}ms
【内存限制】${problem.memoryLimit}MB

【用户代码】(${language})
\`\`\`${language}
${code}
\`\`\`

请从以下方面分析：
1. 代码正确性：是否能正确解决题目
2. 算法复杂度：时间和空间复杂度是否满足限制
3. 潜在问题：边界条件、溢出等
4. 优化建议：如果有更优解法，请给出思路`;
      
      const token = localStorage.getItem('token');
      const response = await fetch('/ai/chat', {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'text/plain',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: prompt,
      });
      
      if (!response.ok || !response.body) {
        throw new Error('AI服务请求失败');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';
      
      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          setAiAnalysisLoading(false);
          return;
        }
        
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';
        
        for (const chunk of parts) {
          const lines = chunk.split(/\n/).map((l) => l.replace(/^data:\s?/, '')).filter(l => l.trim());
          const data = lines.join('\n');
          const cleanedData = data.replace(/\[DONE\]/g, '').replace(/"{1,10}/g, '');
          
          if (cleanedData) {
            accumulatedText += cleanedData;
            setAiAnalysisResult(accumulatedText);
          }
        }
        
        return pump();
      };
      
      await pump();
    } catch (error: any) {
      console.error('AI分析失败:', error);
      setAiAnalysisResult('AI分析失败，请稍后重试: ' + (error.message || '未知错误'));
      setAiAnalysisLoading(false);
    }
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
      <div key={item.id} className="py-4 last:border-0" style={{ borderBottom: '1px solid var(--gemini-border-light)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}>
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

        {/* 样例 */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>输入样例</h3>
              <button
                onClick={() => problem.inputExample && copyToClipboard(problem.inputExample, '输入样例')}
                className="transition-colors"
                style={{ color: 'var(--gemini-text-secondary)' }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="rounded-2xl p-3 text-sm font-mono overflow-x-auto" style={{ backgroundColor: 'var(--gemini-surface)', color: 'var(--gemini-text-primary)' }}>
              {problem.inputExample || '暂无输入样例'}
            </pre>
          </div>
          <div className="rounded-3xl p-4" style={{ backgroundColor: 'var(--gemini-bg)' }}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold" style={{ color: 'var(--gemini-text-primary)' }}>输出样例</h3>
              <button
                onClick={() => problem.outputExample && copyToClipboard(problem.outputExample, '输出样例')}
                className="transition-colors"
                style={{ color: 'var(--gemini-text-secondary)' }}
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <pre className="rounded-2xl p-3 text-sm font-mono overflow-x-auto" style={{ backgroundColor: 'var(--gemini-surface)', color: 'var(--gemini-text-primary)' }}>
              {problem.outputExample || '暂无输出样例'}
            </pre>
          </div>
        </div>

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

        {/* 操作按钮 */}
        <div className="flex items-center gap-3 mt-4">
          <Button icon={<Bot className="w-4 h-4" />} onClick={handleOpenAiAnalysis}>
            AI分析
          </Button>
          <Button loading={codeLoading.test} onClick={handleTestCode} disabled={language === 'java'}>
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

      {/* AI分析模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
            <span style={{ color: 'var(--gemini-text-primary)' }}>AI 智能分析</span>
            {aiAnalysisLoading && <Spin size="small" className="ml-2" />}
          </div>
        }
        open={aiAnalysisVisible}
        onCancel={() => setAiAnalysisVisible(false)}
        footer={null}
        width={900}
        styles={{
          body: { 
            maxHeight: '70vh',
            overflowY: 'auto'
          }
        }}
      >
        {/* 操作按钮区域 */}
        <div className="mb-4 flex justify-end">
          <Button 
            type="primary"
            icon={<Bot className="w-4 h-4" />}
            onClick={handleStartAiAnalysis}
            loading={aiAnalysisLoading}
            disabled={aiAnalysisLoading}
            style={{ 
              backgroundColor: 'var(--gemini-accent)', 
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            {aiAnalysisResult ? '重新分析' : '开始分析'}
          </Button>
        </div>

        {/* 分析结果区域 */}
        <div 
          className="prose prose-sm max-w-none rounded-2xl p-4 min-h-[200px]"
          style={{ backgroundColor: 'var(--gemini-bg)' }}
        >
          {aiAnalysisLoading && !aiAnalysisResult ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spin size="large" />
              <span className="mt-4" style={{ color: 'var(--gemini-text-secondary)' }}>AI正在分析您的代码，请稍候...</span>
              <span className="mt-2 text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>分析内容将实时显示</span>
            </div>
          ) : aiAnalysisResult ? (
            <ReactMarkdown
              className="prose prose-sm max-w-none text-acg-primary prose-pre:bg-gray-900 prose-pre:rounded-xl prose-code:text-acg-accent"
              rehypePlugins={[rehypeRaw]}
              components={{
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`${className} bg-acg-btn/50 px-1.5 py-0.5 rounded`} {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {renderLatex(aiAnalysisResult)}
            </ReactMarkdown>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Bot className="w-12 h-12 mb-4" style={{ color: 'var(--gemini-text-disabled)' }} />
              <p className="mb-2" style={{ color: 'var(--gemini-text-disabled)' }}>暂无分析结果</p>
              <p className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>点击上方"开始分析"按钮获取 AI 代码分析</p>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ProblemDetail;

