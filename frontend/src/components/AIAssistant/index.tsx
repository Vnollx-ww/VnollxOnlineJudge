import { useState, useEffect, useRef, useCallback } from 'react';
import { Modal, Input, Button, message as antMessage, Avatar, Select } from 'antd';
import { Bot, Send, Trash2, User, Copy, Check, Code2, ChevronRight, Sparkles, Loader2, MessageSquarePlus, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';
import { usePermission } from '@/contexts/PermissionContext';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

const { TextArea } = Input;

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
  /** 仅 bot 消息：该条回复使用的模型 Logo（来自 ai_model） */
  modelLogoUrl?: string;
  /** 仅 bot 消息：思考过程内容（与最终答复区分展示） */
  thinkingContent?: string;
}

interface HistoryPageResponse {
  items: Array<{ role: string; content: string; thinkingContent?: string; modelLogoUrl?: string; timestamp?: number }>;
  nextCursor: number | null;
  hasMore: boolean;
  total: number;
}

interface AiModelOption {
  id: number;
  name: string;
  modelId: string;
  logoUrl?: string;
  provider?: string;
}

// 规范化 Markdown 格式（修复 AI 输出的格式问题）
const normalizeMarkdown = (text: string): string => {
  if (!text) return text;
  // 修复标题格式：### 后面需要空格
  text = text.replace(/^(#{1,6})([^\s#])/gm, '$1 $2');
  // 修复列表格式：- 或 * 后面需要空格
  text = text.replace(/^([-*])([^\s])/gm, '$1 $2');
  // 修复数字列表格式：1. 后面需要空格
  text = text.replace(/^(\d+\.)([^\s])/gm, '$1 $2');
  // 修复代码块语言标识后缺少换行：```cpp int main() → ```cpp\nint main()
  text = text.replace(/(^|\n)```([A-Za-z0-9_+#.-]+)[ \t]+([^\n])/gm, '$1```$2\n$3');
  return text;
};

// 对流式中的不完整 Markdown 做兜底，避免代码围栏半截时整段无法渲染
const balanceCodeFences = (text: string): string => {
  const fenceCount = (text.match(/```/g) || []).length;
  return fenceCount % 2 === 1 ? `${text}\n\`\`\`` : text;
};

// rehypeRaw 会把 #include <bits/stdc++.h> 之类的内容当成 HTML，先转义常见 C/C++ 片段
const escapeCodeLikeHtml = (text: string): string => {
  if (!text) return text;

  const lines = text.split('\n');
  let inCodeFence = false;

  return lines
    .map((line) => {
      const trimmed = line.trimStart();
      if (trimmed.startsWith('```')) {
        inCodeFence = !inCodeFence;
        return line;
      }
      if (inCodeFence) return line;
      if (/#include\s*</.test(line)) {
        return line.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      }
      return line;
    })
    .join('\n');
};

const prepareMarkdownForDisplay = (text: string): string => {
  if (!text) return text;
  return balanceCodeFences(escapeCodeLikeHtml(normalizeMarkdown(text)));
};

// 渲染 LaTeX 公式
const renderLatex = (text: string): string => {
  if (!text) return text;
  // 先规范化 Markdown 格式
  text = normalizeMarkdown(text);
  // 处理块级公式 $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });
  // 处理行内公式 $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });
  return text;
};


// 复制按钮组件
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const cleanedText = text;
    try {
      await navigator.clipboard.writeText(cleanedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = cleanedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
      title="复制代码"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
};

// 同步到代码编辑器按钮组件
const SyncToEditorButton: React.FC<{ code: string; language: string }> = ({ code, language }) => {
  const handleSync = () => {
    const cleanedCode = code;
    // 触发自定义事件，将代码同步到题目详情页的代码编辑器
    window.dispatchEvent(new CustomEvent('sync-code-to-editor', { 
      detail: { code: cleanedCode, language } 
    }));
  };

  return (
    <button
      onClick={handleSync}
      className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white transition-colors"
      title="同步到代码编辑器"
    >
      <Code2 className="w-3.5 h-3.5" />
    </button>
  );
};

const AI_ASSISTANT_MODEL_KEY = 'ai_assistant_model_id';
const AI_ASSISTANT_SESSION_KEY = 'ai_assistant_session_id';

interface AiChatSession {
  id: string;
  title: string;
  lastModelId?: number | null;
  lastModelLogoUrl?: string | null;
  messageCount?: number | null;
  lastMessagePreview?: string | null;
  lastMessageAt?: number | null;
  createTime?: number | null;
  /** 标记为临时会话（尚未在后端创建） */
  isPending?: boolean;
}

interface OpenAssistantDetail {
  message?: string;
  forceNewSession?: boolean;
  problemContext?: ProblemChatContext | null;
}

interface ProblemChatContext {
  problemId: number;
  title: string;
  difficulty?: string;
  description?: string;
  inputFormat?: string;
  outputFormat?: string;
  hint?: string;
  timeLimit?: number;
  memoryLimit?: number;
  language?: string;
  code?: string;
}

const buildProblemInfoPrompt = (context: ProblemChatContext): string => `请基于下面这道题的信息，为我分析解题思路、核心算法、注意事项和可能的坑点：

【题号】${context.problemId}
【题目】${context.title}
【难度】${context.difficulty || '未知'}
【题目描述】${context.description || '无'}
【输入格式】${context.inputFormat || '无'}
【输出格式】${context.outputFormat || '无'}
【提示】${context.hint || '无'}
【时间限制】${context.timeLimit ?? '未知'}ms
【内存限制】${context.memoryLimit ?? '未知'}MB

请优先给出：
1. 解题思路
2. 推荐算法与复杂度
3. 容易出错的边界情况
4. 实现建议`;

const buildCodePrompt = (context: ProblemChatContext): string => `请分析我当前在这道题里的代码实现，指出正确性、复杂度、边界情况和可优化点：

【题号】${context.problemId}
【题目】${context.title}
【语言】${context.language || '未知'}

\`\`\`${context.language || ''}
${context.code || ''}
\`\`\`

如果代码有问题，请直接说明原因，并给出修改建议。`;

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [sessions, setSessions] = useState<AiChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(AI_ASSISTANT_SESSION_KEY);
    } catch (_) {
      return null;
    }
  });
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<number | null>(() => {
    try {
      const cached = localStorage.getItem(AI_ASSISTANT_MODEL_KEY);
      if (cached) {
        const id = parseInt(cached, 10);
        if (Number.isFinite(id)) return id;
      }
    } catch (_) {}
    return null;
  });
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  /** 由「AI分析」等外部事件带入的待执行动作 */
  const [pendingAction, setPendingAction] = useState<OpenAssistantDetail | null>(null);
  const [problemContext, setProblemContext] = useState<ProblemChatContext | null>(null);
  /** 分页游标 */
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  /** 是否应该滚动到底部 */
  const shouldScrollToBottomRef = useRef(true);
  /** 首次打开后，历史消息落地时直接定位到底部，但不播放动画 */
  const shouldJumpToBottomOnceRef = useRef(false);
  /** 新建会话后跳过一次空历史拉取，避免覆盖本地首条消息 */
  const skipNextHistoryLoadSessionRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const { hasPermission } = usePermission();
  const currentSessionIdRef = useRef<string | null>(currentSessionId);
  const streamSessionIdRef = useRef<string | null>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    if (messages.length === 0) return;
    // 首次打开：历史消息加载完后直接跳到底部（无动画），优先级最高
    if (shouldJumpToBottomOnceRef.current) {
      shouldJumpToBottomOnceRef.current = false;
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }
    // 会话切换 / 历史加载时不滚动
    if (!shouldScrollToBottomRef.current) return;
    // 发新消息时平滑滚动
    scrollToBottom(true);
  }, [messages, thinking]);

  // 解析历史消息列表
  const parseHistoryItems = (data: HistoryPageResponse['items']): Message[] => {
    return data
      .filter((item) => {
        const c = (item.content || '').trim();
        return c && !c.startsWith('[系统]') && !c.includes('你是一个专业的编程助手');
      })
      .map((item) => ({
        role: item.role === 'user' ? 'user' : 'bot',
        content: (item.content || '').trim(),
        timestamp: item.timestamp ?? Date.now(),
        ...(item.role === 'bot' && item.modelLogoUrl != null ? { modelLogoUrl: item.modelLogoUrl } : {}),
        ...(item.role === 'bot' && item.thinkingContent != null && item.thinkingContent.trim() !== '' ? { thinkingContent: item.thinkingContent.trim() } : {}),
      })) as Message[];
  };

  const sortSessions = useCallback((list: AiChatSession[]) => {
    return [...list].sort((a, b) => {
      const timeA = a.lastMessageAt ?? a.createTime ?? 0;
      const timeB = b.lastMessageAt ?? b.createTime ?? 0;
      return timeB - timeA;
    });
  }, []);

  const loadHistory = useCallback(async (sessionId: string, beforeId?: number | null, append = false) => {
    if (!isAuthenticated()) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setHistoryLoaded(true);
      return;
    }

    if (append) {
      setLoadingMore(true);
    } else {
      shouldScrollToBottomRef.current = false;
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setHistoryLoaded(false);
    }

    const container = messagesContainerRef.current;
    const prevScrollHeight = append ? (container?.scrollHeight ?? 0) : 0;

    try {
      const query = new URLSearchParams({
        sessionId,
        limit: String(beforeId ? 5 : 10),
      });
      if (beforeId) {
        query.set('beforeId', String(beforeId));
      }
      const response = await api.get(`/ai/history/page?${query.toString()}`) as ApiResponse<HistoryPageResponse>;
      if (response.code === 200 && response.data) {
        const { items, nextCursor: cursor, hasMore: more } = response.data;
        const list = parseHistoryItems(items || []);
        setNextCursor(cursor);
        setHasMore(more);
        if (append) {
          if (list.length > 0) {
            setMessages((prev) => [...list, ...prev]);
            requestAnimationFrame(() => {
              if (container) {
                container.scrollTop = container.scrollHeight - prevScrollHeight;
              }
            });
          }
        } else {
          setMessages(list);
        }
      }
      setHistoryLoaded(true);
    } catch (error) {
      console.error('加载会话历史失败:', error);
      if (!append) {
        setMessages([]);
      }
      setHistoryLoaded(true);
    } finally {
      if (append) {
        setLoadingMore(false);
      }
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (!currentSessionId || !hasMore || loadingMore || !nextCursor) return;
    shouldScrollToBottomRef.current = false;
    await loadHistory(currentSessionId, nextCursor, true);
  }, [currentSessionId, hasMore, loadingMore, nextCursor, loadHistory]);

  // 滚动事件处理：滚动到顶部时加载更多
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 50 && hasMore && !loadingMore) {
      void loadMoreHistory();
    }
    const atBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 80;
    setInputCollapsed(!atBottom);
  }, [hasMore, loadingMore, loadMoreHistory]);

  // 缓存选中的模型到 localStorage
  useEffect(() => {
    if (selectedModelId != null) {
      try {
        localStorage.setItem(AI_ASSISTANT_MODEL_KEY, String(selectedModelId));
      } catch (_) {}
    }
  }, [selectedModelId]);

  useEffect(() => {
    if (currentSessionId && !currentSessionId.startsWith('pending_')) {
      try {
        localStorage.setItem(AI_ASSISTANT_SESSION_KEY, currentSessionId);
      } catch (_) {}
    } else if (!currentSessionId) {
      try {
        localStorage.removeItem(AI_ASSISTANT_SESSION_KEY);
      } catch (_) {}
    }
  }, [currentSessionId]);

  // 打开抽屉时加载可选模型列表，并恢复缓存的模型选择
  const loadModels = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await api.get('/ai/models') as ApiResponse<AiModelOption[]>;
      if (res.code === 200 && res.data?.length) {
        setModels(res.data);
        setSelectedModelId((prev) => {
          const list = res.data!;
          const cachedValid = prev != null && list.some((m) => m.id === prev);
          return cachedValid ? prev : list[0].id;
        });
      }
    } catch (e) {
      console.error('加载模型列表失败:', e);
    }
  }, []);

  // 打开抽屉时拉取用户头像（用于用户消息展示）
  const loadUserProfile = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const res = await api.get('/user/profile') as ApiResponse<{ avatar?: string }>;
      if (res.code === 200 && res.data?.avatar) {
        setUserAvatar(res.data.avatar);
      } else {
        setUserAvatar(null);
      }
    } catch (_) {
      setUserAvatar(null);
    }
  }, []);

  const loadSessions = useCallback(async (preferredSessionId?: string | null) => {
    if (!isAuthenticated()) {
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
      return;
    }
    setSessionsLoading(true);
    try {
      const res = await api.get('/ai/sessions') as ApiResponse<AiChatSession[]>;
      const list = sortSessions(res.code === 200 && Array.isArray(res.data) ? res.data : []);
      setSessions(list);
      const preferred = preferredSessionId ?? currentSessionIdRef.current;
      const nextSessionId =
        (preferred && list.some((item) => item.id === preferred) ? preferred : null)
        || list[0]?.id
        || null;
      setCurrentSessionId(nextSessionId);
      if (!nextSessionId) {
        setMessages([]);
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (e) {
      console.error('加载会话列表失败:', e);
      setSessions([]);
      setCurrentSessionId(null);
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
    } finally {
      setSessionsLoading(false);
    }
  }, [sortSessions]);

  useEffect(() => {
    if (open) {
      loadModels();
      loadUserProfile();
      void loadSessions();
    }
  }, [open, loadModels, loadSessions, loadUserProfile]);

  useEffect(() => {
    if (!open) return;
    if (!currentSessionId) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      return;
    }
    // 临时会话不存在于后端，跳过历史加载
    if (currentSessionId.startsWith('pending_')) {
      setMessages([]);
      setHasMore(false);
      setNextCursor(null);
      setHistoryLoaded(true);
      return;
    }
    if (skipNextHistoryLoadSessionRef.current === currentSessionId) {
      skipNextHistoryLoadSessionRef.current = null;
      setHasMore(false);
      setNextCursor(null);
      return;
    }
    shouldJumpToBottomOnceRef.current = true;
    void loadHistory(currentSessionId);
  }, [currentSessionId, open, loadHistory]);

  const createSessionApi = useCallback(async (title?: string) => {
    const res = await api.post('/ai/sessions', title ? { title } : {}) as ApiResponse<AiChatSession>;
    if (res.code !== 200 || !res.data) {
      throw new Error((res as any).msg || '创建会话失败');
    }
    return res.data;
  }, []);

  const upsertSession = useCallback((session: AiChatSession) => {
    setSessions((prev) => sortSessions([session, ...prev.filter((item) => item.id !== session.id)]));
  }, [sortSessions]);

  const handleCreateSession = useCallback(() => {
    if (loading) {
      messageApi.info('当前正在生成回复，请稍后再新建会话');
      return null;
    }
    // 延迟创建：不调用后端，不在左侧列表创建记录
    // 仅设置一个 pending ID，右侧显示空聊天界面
    const pendingId = `pending_${Date.now()}`;
    setCurrentSessionId(pendingId);
    setMessages([]);
    setHasMore(false);
    setNextCursor(null);
    setHistoryLoaded(true);
    return pendingId;
  }, [loading, messageApi]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (loading) {
      messageApi.info('当前正在生成回复，请稍后再删除');
      return;
    }
    setDeletingSessionId(sessionId);
  }, [loading, messageApi]);

  const confirmDeleteSession = useCallback(async (sessionId: string) => {
    try {
      const res = await api.delete(`/ai/sessions/${sessionId}`) as ApiResponse<void>;
      if (res.code === 200) {
        setSessions((prev) => {
          const newList = prev.filter((s) => s.id !== sessionId);
          if (currentSessionIdRef.current === sessionId) {
            const next = newList[0]?.id ?? null;
            setCurrentSessionId(next);
            if (!next) {
              setMessages([]);
              setHasMore(false);
              setNextCursor(null);
              setHistoryLoaded(true);
            }
          }
          return newList;
        });
        messageApi.success('会话已删除');
      } else {
        messageApi.error((res as any).msg || '删除失败');
      }
    } catch {
      messageApi.error('删除失败，请稍后重试');
    } finally {
      setDeletingSessionId(null);
    }
  }, [messageApi]);

  const cancelDeleteSession = useCallback(() => {
    setDeletingSessionId(null);
  }, []);

  /** 如果当前是临时会话，切回最近的真实会话 */
  const cleanupPendingSessions = useCallback(() => {
    if (currentSessionIdRef.current?.startsWith('pending_')) {
      const next = sessions.find((s) => !s.isPending)?.id ?? null;
      setCurrentSessionId(next);
      if (!next) {
        setMessages([]);
        setHasMore(false);
        setNextCursor(null);
        setHistoryLoaded(true);
      }
    }
  }, [sessions]);

  const handleCloseAssistant = useCallback(() => {
    cleanupPendingSessions();
    setPendingAction(null);
    setProblemContext(null);
    setOpen(false);
  }, [cleanupPendingSessions]);

  const sendChatRef = useRef<(msg: string, targetSessionId?: string | null) => void>(() => {});
  useEffect(() => {
    sendChatRef.current = sendChat;
  });
  useEffect(() => {
    if (!open || models.length === 0 || sessionsLoading || !pendingAction) return;
    let cancelled = false;
    const run = async () => {
      const action = pendingAction;
      setPendingAction(null);
      let targetSessionId = currentSessionIdRef.current;
      if (action.forceNewSession || !targetSessionId) {
        try {
          const created = await createSessionApi();
          if (cancelled) return;
          skipNextHistoryLoadSessionRef.current = created.id;
          upsertSession(created);
          setCurrentSessionId(created.id);
          setMessages([]);
          setHasMore(false);
          setNextCursor(null);
          setHistoryLoaded(true);
          targetSessionId = created.id;
        } catch (error: any) {
          if (!cancelled) {
            messageApi.error(error?.message || '创建会话失败');
          }
          return;
        }
      }
      if (action.message?.trim()) {
        sendChatRef.current(action.message.trim(), targetSessionId);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [open, models.length, sessionsLoading, pendingAction, createSessionApi, upsertSession, messageApi]);

  // 监听外部事件打开 AI 助手并发送消息（等模型加载后再发，避免 Logo 不显示）
  useEffect(() => {
    const handleOpenAiAssistant = (event: CustomEvent<OpenAssistantDetail>) => {
      setOpen(true);
      setProblemContext(event.detail?.problemContext ?? null);
      setPendingAction({
        message: event.detail?.message,
        forceNewSession: Boolean(event.detail?.forceNewSession),
      });
    };

    window.addEventListener('open-ai-assistant', handleOpenAiAssistant as EventListener);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenAiAssistant as EventListener);
    };
  }, []);

  // WebSocket 引用与流式累加
  const wsRef = useRef<WebSocket | null>(null);
  const accumulatedTextRef = useRef<string>('');
  const accumulatedThinkingRef = useRef<string>('');
  const botMessageCreatedRef = useRef<boolean>(false);

  // WebSocket 发送消息
  const sendChat = async (userMessage: string, targetSessionId?: string | null) => {
    let sessionId = targetSessionId ?? currentSessionIdRef.current;
    if (!sessionId) {
      messageApi.warning('请先选择或创建一个会话');
      return;
    }
    if (!isAuthenticated()) {
      messageApi.warning('请先登录后再使用AI助手');
      return;
    }

    const uid = localStorage.getItem('id');
    if (!uid) {
      messageApi.warning('请先登录');
      return;
    }

    // 临时会话：发送第一条消息时，先在后端创建真实会话
    if (sessionId.startsWith('pending_')) {
      try {
        const created = await createSessionApi();
        skipNextHistoryLoadSessionRef.current = created.id;
        upsertSession(created);
        setCurrentSessionId(created.id);
        sessionId = created.id;
      } catch (error: any) {
        messageApi.error(error?.message || '创建会话失败');
        return;
      }
    }

    streamSessionIdRef.current = sessionId;
    setLoading(true);
    setThinking(true);
    shouldScrollToBottomRef.current = true;

    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');

    // 关闭旧连接
    if (wsRef.current) {
      wsRef.current.close();
    }

    // 创建 WebSocket 连接
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/ai?uid=${uid}`);
    wsRef.current = ws;
    accumulatedTextRef.current = '';
    accumulatedThinkingRef.current = '';
    botMessageCreatedRef.current = false;

    ws.onopen = () => {
      const payload: { type: string; message: string; sessionId: string; modelId?: number } = {
        type: 'chat',
        message: userMessage,
        sessionId,
      };
      if (selectedModelId != null && selectedModelId > 0) payload.modelId = selectedModelId;
      ws.send(JSON.stringify(payload));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          // AI 开始响应，不在这里创建气泡，等有实际内容时再创建
        } else if (data.type === 'thinking_token') {
          // 思考过程流式片段
          accumulatedThinkingRef.current += data.content ?? '';
          if (!botMessageCreatedRef.current) {
            // 第一次收到内容，创建 bot 消息并关闭思考中状态
            botMessageCreatedRef.current = true;
            setThinking(false);
            const modelLogo = models.find((m) => m.id === selectedModelId)?.logoUrl;
            setMessages((prev) => [
              ...prev,
              { role: 'bot', content: '', thinkingContent: accumulatedThinkingRef.current, timestamp: Date.now(), modelLogoUrl: modelLogo },
            ]);
          } else {
            setMessages((prev) => {
              const newMessages = [...prev];
              const last = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...last,
                thinkingContent: accumulatedThinkingRef.current,
              };
              return newMessages;
            });
          }
        } else if (data.type === 'token') {
          // 最终答复流式片段
          accumulatedTextRef.current += data.content ?? '';
          if (!botMessageCreatedRef.current) {
            // 第一次收到内容，创建 bot 消息并关闭思考中状态
            botMessageCreatedRef.current = true;
            setThinking(false);
            const modelLogo = models.find((m) => m.id === selectedModelId)?.logoUrl;
            setMessages((prev) => [
              ...prev,
              { role: 'bot', content: accumulatedTextRef.current, thinkingContent: '', timestamp: Date.now(), modelLogoUrl: modelLogo },
            ]);
          } else {
            setMessages((prev) => {
              const newMessages = [...prev];
              const last = newMessages[newMessages.length - 1];
              newMessages[newMessages.length - 1] = {
                ...last,
                content: accumulatedTextRef.current,
              };
              return newMessages;
            });
          }
        } else if (data.type === 'done') {
          setLoading(false);
          const finalSessionId = streamSessionIdRef.current;
          if (finalSessionId) {
            const preview = accumulatedTextRef.current.slice(0, 50).replace(/\n/g, ' ') || userMessage.slice(0, 50);
            setSessions((prev) =>
              sortSessions(
                prev.map((s) => {
                  if (s.id !== finalSessionId) return s;
                  let updatedTitle = s.title;
                  if (data.title) {
                    updatedTitle = data.title;
                  } else if (!s.title || s.title === '新会话') {
                    updatedTitle = userMessage.length > 30 ? userMessage.slice(0, 30) + '...' : userMessage;
                  }
                  return {
                    ...s,
                    title: updatedTitle,
                    lastMessagePreview: preview,
                    lastMessageAt: Date.now(),
                    lastModelLogoUrl: models.find((m) => m.id === selectedModelId)?.logoUrl,
                  };
                })
              )
            );
          }
          ws.close();
        } else if (data.type === 'error') {
          // 错误
          const modelLogo = models.find((m) => m.id === selectedModelId)?.logoUrl;
          setThinking(false);
          setLoading(false);
          setMessages((prev) => [
            ...prev,
            { role: 'bot', content: `错误: ${data.message}`, timestamp: Date.now(), modelLogoUrl: modelLogo },
          ]);
          ws.close();
        }
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket 错误');
      const modelLogo = models.find((m) => m.id === selectedModelId)?.logoUrl;
      setThinking(false);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: '连接错误，请重试', timestamp: Date.now(), modelLogoUrl: modelLogo },
      ]);
    };

    ws.onclose = () => {
      setLoading(false);
    };
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || loading || !currentSessionId) return;
    sendChat(text, currentSessionId);
  };

  const handleQuickSend = async (builder: (context: ProblemChatContext) => string) => {
    if (!problemContext || loading || sessionsLoading) return;
    let targetSessionId = currentSessionIdRef.current;
    if (!targetSessionId) {
      targetSessionId = handleCreateSession();
    }
    if (!targetSessionId) return;
    await sendChat(builder(problemContext), targetSessionId);
  };

  return (
    <>
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scaleY(0.92); }
          to   { opacity: 1; transform: scaleY(1); }
        }
        .ai-modal {
          width: 100vw !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding-bottom: 0 !important;
          top: 0 !important;
        }
        .ai-modal .ant-modal-content {
          padding: 0 !important;
        }
        .ai-modal .ant-modal-header {
          padding: 20px 24px 0 !important;
          margin-bottom: 0 !important;
        }
        .ai-modal .ant-modal-body {
          width: 100% !important;
        }
      `}</style>
      {contextHolder}

      {/* 悬浮按钮 - 需要AI使用权限 */}
      {hasPermission(PermissionCode.AI_CHAT) && (
        <button
          onClick={() => {
            setProblemContext(null);
            setOpen(true);
          }}
          title="AI 助手"
          className="fixed right-10 bottom-12 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-[22px] border border-white/60 bg-white/75 shadow-[0_18px_40px_rgba(15,23,42,0.18)] backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.24)]"
        >
          <div className="relative flex h-[44px] w-[44px] items-center justify-center rounded-[16px] bg-gradient-to-br from-slate-900 via-slate-700 to-blue-500 shadow-[0_10px_24px_rgba(37,99,235,0.22)]">
            <div className="absolute inset-[1.5px] rounded-[15px] bg-white/88 backdrop-blur-xl" />
            <div className="absolute inset-[6px] rounded-[11px] bg-gradient-to-br from-sky-50 via-white to-violet-50" />
            <Sparkles className="relative z-10 h-5 w-5 text-slate-700" />
            <span className="absolute top-[5px] right-[5px] h-2.5 w-2.5 rounded-full bg-blue-500 ring-2 ring-white" />
          </div>
        </button>
      )}

      {/* 聊天弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-2xl bg-blue-400 flex items-center justify-content shadow-lg shadow-blue-400/25">
                <Sparkles className="w-5 h-5 text-white mx-auto" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-base">AI 智能助手</h3>
              <p className="text-xs text-gray-400 font-normal">随时为您解答编程问题</p>
            </div>
          </div>
        }
        onCancel={handleCloseAssistant}
        open={open}
        footer={null}
        width="100vw"
        style={{ top: 0, paddingBottom: 0, maxWidth: '100vw', margin: 0 }}
        styles={{
          content: { height: '100vh', overflow: 'hidden', paddingBottom: 0, borderRadius: 0 },
          header: { borderBottom: 'none', paddingBottom: 0 },
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)' },
        }}
        className="ai-modal"
      >
        <div className="flex-1 flex h-full min-h-0 bg-gradient-to-b from-slate-50 to-gray-100">
          {/* 左侧会话列表 */}
          <div className="w-64 shrink-0 border-r border-gray-200 bg-white/60 backdrop-blur-sm flex flex-col h-full">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">会话列表</span>
              <button
                onClick={handleCreateSession}
                disabled={loading}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-blue-50 hover:text-blue-500 transition-colors disabled:opacity-50"
                title="新建会话"
              >
                <MessageSquarePlus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8 text-gray-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>暂无会话</p>
                  <p className="text-xs mt-1">点击右上角新建</p>
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className={`group rounded-xl transition-all ${loading ? 'pointer-events-none opacity-60' : ''}`}
                  >
                    <div
                      onClick={() => {
                        if (!loading && session.id !== currentSessionId && deletingSessionId !== session.id) {
                          setCurrentSessionId(session.id);
                        }
                      }}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                        session.id === currentSessionId
                          ? 'bg-blue-50/80 text-gray-900'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <MessageSquare className={`w-4 h-4 shrink-0 ${
                        session.id === currentSessionId ? 'text-blue-500' : 'text-gray-400'
                      }`} />
                      <span className={`text-sm truncate flex-1 ${
                        session.id === currentSessionId ? 'font-medium' : ''
                      }`}>
                        {session.title || '新会话'}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSession(session.id);
                        }}
                        className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-gray-200/60 text-gray-400 hover:text-gray-600 transition-all"
                        title="删除会话"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {deletingSessionId === session.id && (
                      <div
                        className="mx-1 mt-1 mb-1 p-3 rounded-xl bg-white border border-gray-200/80 shadow-lg shadow-gray-200/40"
                        style={{ animation: 'fadeScaleIn 0.15s ease-out', transformOrigin: 'top center' }}
                      >
                        <p className="text-xs text-gray-500 mb-2.5">确定删除此会话及所有消息？</p>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={cancelDeleteSession}
                            className="px-3 py-1.5 text-xs text-gray-600 rounded-lg hover:bg-gray-100 transition-colors font-medium"
                          >
                            取消
                          </button>
                          <button
                            onClick={() => confirmDeleteSession(session.id)}
                            className="px-3 py-1.5 text-xs text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium"
                          >
                            删除
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 右侧消息区域 */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            {/* 消息列表 */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-5 space-y-5"
            >
              {!currentSessionId ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-medium">选择或新建一个会话开始聊天</p>
                </div>
              ) : !historyLoaded ? (
                // 加载中，显示加载指示器
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : messages.length === 0 && !thinking && !loadingMore ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="mb-6 relative">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center shadow-xl">
                      <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">
                    你好，我是 AI 助手
                  </h2>
                  <p className="text-gray-500 text-base mb-8 max-w-md">
                    我可以帮助你解答编程问题、分析代码、提供算法思路等。试着向我提问吧！
                  </p>
                  <div className="grid grid-cols-2 gap-3 max-w-2xl w-full">
                    <button
                      onClick={() => setInputValue('帮我分析这道题的解题思路')}
                      className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <MessageSquare className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">解题思路</span>
                      </div>
                      <p className="text-xs text-gray-500">分析算法题目的解决方案</p>
                    </button>
                    <button
                      onClick={() => setInputValue('这段代码有什么问题？')}
                      className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                          <Bot className="w-4 h-4 text-purple-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">代码审查</span>
                      </div>
                      <p className="text-xs text-gray-500">帮助检查和优化代码</p>
                    </button>
                    <button
                      onClick={() => setInputValue('能帮我优化一下算法复杂度吗？')}
                      className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-green-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-green-100 transition-colors">
                          <Sparkles className="w-4 h-4 text-green-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">性能优化</span>
                      </div>
                      <p className="text-xs text-gray-500">提升代码执行效率</p>
                    </button>
                    <button
                      onClick={() => setInputValue('讲解一下这个算法的原理')}
                      className="group p-4 bg-white rounded-xl border border-gray-200 hover:border-orange-300 hover:shadow-md transition-all text-left"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center group-hover:bg-orange-100 transition-colors">
                          <MessageSquarePlus className="w-4 h-4 text-orange-500" />
                        </div>
                        <span className="text-sm font-medium text-gray-700">算法讲解</span>
                      </div>
                      <p className="text-xs text-gray-500">深入理解算法原理</p>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* 加载更多提示 */}
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 text-gray-400 text-sm py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>加载历史消息...</span>
                    </div>
                  )}
                  {hasMore && !loadingMore && (
                    <div className="text-center py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-white/60 px-3 py-1.5 rounded-full backdrop-blur-sm">
                        <ChevronRight className="w-3 h-3 -rotate-90" />
                        滚动加载更多
                      </span>
                    </div>
                  )}
                  {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
              >
                <Avatar
                  size={38}
                  src={msg.role === 'bot' ? (msg.modelLogoUrl || undefined) : (userAvatar || undefined)}
                  className={`flex-shrink-0 shadow-md ${
                    msg.role === 'bot'
                      ? 'ring-2 ring-white'
                      : 'ring-2 ring-white bg-blue-400'
                  }`}
                  style={msg.role === 'user' && userAvatar ? { background: 'transparent' } : undefined}
                >
                  {msg.role === 'bot' ? (msg.modelLogoUrl ? null : <Bot className="w-4 h-4 text-blue-500" />) : <User className="w-4 h-4 text-white" />}
                </Avatar>
                <div
                  className={`
                    max-w-[85%] px-4 py-3 rounded-2xl transition-all duration-200
                    ${msg.role === 'bot'
                      ? 'bg-white shadow-sm shadow-gray-200/50 rounded-tl-sm border border-gray-100/80'
                      : 'bg-blue-400 text-white rounded-tr-sm shadow-lg shadow-blue-400/20'
                    }
                  `}
                >
                  {msg.role === 'bot' ? (
                    <div className="space-y-2">
                      {msg.thinkingContent != null && msg.thinkingContent.trim() !== '' && (
                        <details className="group rounded-lg bg-gray-50 border border-gray-100 overflow-hidden">
                          <summary className="flex items-center gap-2 px-3 py-2 text-acg-secondary text-sm cursor-pointer list-none select-none hover:bg-gray-100 [&::-webkit-details-marker]:hidden">
                            <ChevronRight className="w-4 h-4 shrink-0 transition-transform group-open:rotate-90" />
                            <span>思考过程</span>
                          </summary>
                          <div className="px-3 py-2 border-t border-gray-100 max-h-48 overflow-y-auto prose prose-sm max-w-none text-acg-secondary prose-pre:bg-gray-900 prose-pre:rounded-lg prose-code:text-acg-accent">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              rehypePlugins={[rehypeRaw]}
                              components={{
                                code({ inline, className, children, ...props }: any) {
                                  const match = /language-(\w+)/.exec(className || '');
                                  const codeString = String(children).replace(/\n$/, '');
                                  return !inline && match ? (
                                    <div className="relative group">
                                      <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                        <CopyButton text={codeString} />
                                      </div>
                                      <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                      >
                                        {codeString}
                                      </SyntaxHighlighter>
                                    </div>
                                  ) : (
                                    <code className={`${className} bg-acg-btn/50 px-1.5 py-0.5 rounded`} {...props}>
                                      {children}
                                    </code>
                                  );
                                },
                              }}
                            >
                              {renderLatex(prepareMarkdownForDisplay(msg.thinkingContent.trim()))}
                            </ReactMarkdown>
                          </div>
                        </details>
                      )}
                      {msg.content != null && msg.content.trim() !== '' && (
                        <ReactMarkdown
                          className="prose prose-sm max-w-none text-acg-primary prose-pre:bg-gray-900 prose-pre:rounded-xl prose-code:text-acg-accent"
                          remarkPlugins={[remarkGfm]}
                          rehypePlugins={[rehypeRaw]}
                          components={{
                            code({ inline, className, children, ...props }: any) {
                              const match = /language-(\w+)/.exec(className || '');
                              const codeString = String(children).replace(/\n$/, '');
                              return !inline && match ? (
                                <div className="relative group">
                                  <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                    <CopyButton text={codeString} />
                                    <SyncToEditorButton code={codeString} language={match[1]} />
                                  </div>
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    {...props}
                                  >
                                    {codeString}
                                  </SyntaxHighlighter>
                                </div>
                              ) : (
                                <code className={`${className} bg-acg-btn/50 px-1.5 py-0.5 rounded`} {...props}>
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {renderLatex(prepareMarkdownForDisplay(msg.content))}
                        </ReactMarkdown>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            
                  {/* 思考中指示器：使用当前选中模型的 Logo */}
                  {thinking && (
                    <div className="flex gap-3 animate-fade-in">
                      <Avatar
                        size={38}
                        src={models.find((m) => m.id === selectedModelId)?.logoUrl}
                        className="flex-shrink-0 shadow-md ring-2 ring-white"
                      >
                        {!models.find((m) => m.id === selectedModelId)?.logoUrl && <Bot className="w-4 h-4 text-blue-500" />}
                      </Avatar>
                      <div className="bg-white shadow-sm shadow-gray-200/50 rounded-2xl rounded-tl-sm border border-gray-100/80 px-4 py-3">
                        <div className="flex items-center gap-3 text-gray-500 text-sm">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                            <span>正在思考中</span>
                          </div>
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:0ms]" />
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:150ms]" />
                            <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:300ms]" />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
          <div className="p-4 bg-white/80 backdrop-blur-xl">
            <div
              className="rounded-[20px] bg-gray-100 transition-all"
              onClick={() => inputCollapsed && setInputCollapsed(false)}
            >
              <div
                className="overflow-hidden transition-all duration-300 ease-in-out"
                style={{ maxHeight: inputCollapsed ? 0 : 300, opacity: inputCollapsed ? 0 : 1 }}
              >
                <TextArea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onPressEnter={(e) => {
                    if (!e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={currentSessionId ? '输入您的问题...' : '请先选择或新建一个会话'}
                  autoSize={{ minRows: 4, maxRows: 8 }}
                  disabled={loading || !isAuthenticated() || !currentSessionId}
                  bordered={false}
                  className="!bg-transparent px-5 pt-4 pb-2 text-[15px]"
                />
              </div>
              <div className={`flex items-center gap-2 px-4 py-3 ${inputCollapsed ? 'cursor-pointer' : ''}`}>
                {inputCollapsed && (
                  <span className="text-sm text-gray-400 select-none">点击展开输入框...</span>
                )}
                {!inputCollapsed && problemContext && (
                  <>
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                      #{problemContext.problemId} {problemContext.title}
                    </span>
                    <button
                      onClick={() => void handleQuickSend(buildProblemInfoPrompt)}
                      disabled={loading || sessionsLoading}
                      className="h-9 px-4 text-xs font-medium text-gray-600 bg-white rounded-xl shadow-md shadow-gray-200/30 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      发送题目信息
                    </button>
                    <button
                      onClick={() => void handleQuickSend(buildCodePrompt)}
                      disabled={loading || sessionsLoading || !problemContext.code?.trim()}
                      className="h-9 px-4 text-xs font-medium text-gray-600 bg-white rounded-xl shadow-md shadow-gray-200/30 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                      发送当前代码
                    </button>
                  </>
                )}
                <div className="flex-1" />
                {models.length > 0 && (
                  <Select
                    value={selectedModelId ?? undefined}
                    onChange={(v) => setSelectedModelId(v ?? null)}
                    options={models.map((m) => ({
                      value: m.id,
                      label: m.name,
                    }))}
                    labelRender={({ value }) => {
                      const m = models.find((x) => x.id === value);
                      if (!m) return <span className="text-gray-400">选择模型</span>;
                      return (
                        <span className="flex items-center gap-2">
                          {m.logoUrl ? (
                            <img src={m.logoUrl} alt="" className="w-5 h-5 rounded-lg object-cover shrink-0 ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-5 h-5 rounded-lg bg-blue-400 flex items-center justify-center shrink-0">
                              <Bot className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <span className="truncate text-gray-600 text-sm">{m.name}</span>
                        </span>
                      );
                    }}
                    optionRender={(opt) => {
                      const m = models.find((x) => x.id === opt.value);
                      return (
                        <span className="flex items-center gap-2.5 py-0.5">
                          {m?.logoUrl ? (
                            <img src={m.logoUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0 ring-1 ring-gray-200" />
                          ) : (
                            <div className="w-6 h-6 rounded-lg bg-blue-400 flex items-center justify-center shrink-0">
                              <Bot className="w-3.5 h-3.5 text-white" />
                            </div>
                          )}
                          <span className="text-gray-700">{opt.label}</span>
                        </span>
                      );
                    }}
                    className="w-[220px] max-w-full shrink-0 [&_.ant-select-selector]:!bg-white [&.ant-select-focused_.ant-select-selector]:!bg-white"
                    variant="borderless"
                    popupMatchSelectWidth={false}
                    placeholder="选择模型"
                    placement="topLeft"
                    getPopupContainer={(node) => node.parentElement ?? document.body}
                    style={{
                      background: '#fff',
                      borderRadius: 10,
                      minHeight: 34,
                    }}
                  />
                )}
                <Button
                  type="primary"
                  icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  onClick={handleSend}
                  disabled={!inputValue.trim() || !isAuthenticated() || loading || !currentSessionId}
                  className="!h-9 !px-5 shrink-0 !rounded-xl !bg-blue-500 !border-none hover:!bg-blue-600 !shadow-md !shadow-blue-500/20 disabled:!opacity-50 disabled:!shadow-none transition-all duration-200"
                >
                  发送
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default AIAssistant;

