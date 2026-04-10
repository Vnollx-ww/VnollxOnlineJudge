import { useState, useEffect, useRef, useCallback } from 'react';
import { message as antMessage, Avatar } from 'antd';
import { Bot, Send, Trash2, User, Copy, Check, Code2, ChevronRight, ChevronDown, Sparkles, Loader2, MessageSquarePlus, Menu, Plus, X } from 'lucide-react';
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
  logoUrl?: string;
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
  /** 本次发送使用的模型 ID，不传则用当前选中模型 */
  modelId?: number;
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

  const sendChatRef = useRef<(msg: string, targetSessionId?: string | null, modelIdOverride?: number | null) => void>(() => {});
  useEffect(() => {
    sendChatRef.current = sendChat;
  });
  // 外部入口（如 AI 学习建议）：先创建临时会话并切换，再自动用提示词发送（发送时再落库真实会话）
  useEffect(() => {
    if (!open || models.length === 0 || sessionsLoading || !pendingAction) return;
    const run = () => {
      const action = pendingAction;
      setPendingAction(null);
      let targetSessionId = currentSessionIdRef.current;
      if (action.forceNewSession || !targetSessionId) {
        // 创建临时会话并切换，不先调后端
        const pendingId = `pending_${Date.now()}`;
        upsertSession({
          id: pendingId,
          title: '新会话',
          isPending: true,
        });
        setCurrentSessionId(pendingId);
        setMessages([]);
        setHasMore(false);
        setNextCursor(null);
        setHistoryLoaded(true);
        targetSessionId = pendingId;
      }
      if (action.message?.trim()) {
        sendChatRef.current(action.message.trim(), targetSessionId, action.modelId);
      }
    };
    run();
  }, [open, models.length, sessionsLoading, pendingAction, upsertSession]);

  // 监听外部事件打开 AI 助手并发送消息（等模型加载后再发，避免 Logo 不显示）
  useEffect(() => {
    const handleOpenAiAssistant = (event: CustomEvent<OpenAssistantDetail>) => {
      setOpen(true);
      setProblemContext(event.detail?.problemContext ?? null);
      setPendingAction({
        message: event.detail?.message,
        forceNewSession: Boolean(event.detail?.forceNewSession),
        modelId: event.detail?.modelId,
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
  const thinkingModelLogoRef = useRef<string | undefined>(undefined);

  // WebSocket 发送消息（modelIdOverride 用于外部入口如「AI学习建议」固定使用某模型）
  const sendChat = async (userMessage: string, targetSessionId?: string | null, modelIdOverride?: number | null) => {
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

    // 捕获发送时的模型信息，避免用户在等待响应时切换模型导致 Logo 错乱
    const effectiveModelId = modelIdOverride ?? selectedModelId;
    const currentModelLogo = models.find((m) => m.id === effectiveModelId)?.logoUrl;
    thinkingModelLogoRef.current = currentModelLogo;

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
      const modelToUse = modelIdOverride ?? selectedModelId;
      if (modelToUse != null && modelToUse > 0) payload.modelId = modelToUse;
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
            const modelLogo = models.find((m) => m.id === effectiveModelId)?.logoUrl;
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
            setMessages((prev) => [
              ...prev,
              { role: 'bot', content: accumulatedTextRef.current, thinkingContent: '', timestamp: Date.now(), modelLogoUrl: currentModelLogo },
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
                    lastModelLogoUrl: currentModelLogo,
                  };
                })
              )
            );
          }
          ws.close();
        } else if (data.type === 'error') {
          // 错误
          setThinking(false);
          setLoading(false);
          setMessages((prev) => [
            ...prev,
            { role: 'bot', content: `错误: ${data.message}`, timestamp: Date.now(), modelLogoUrl: currentModelLogo },
          ]);
          ws.close();
        }
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };

    ws.onerror = () => {
      console.error('WebSocket 错误');
      setThinking(false);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: '连接错误，请重试', timestamp: Date.now(), modelLogoUrl: currentModelLogo },
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

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const modelDropdownRef = useRef<HTMLDivElement>(null);
  const [expandedThinking, setExpandedThinking] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setModelDropdownOpen(false);
      }
    };
    if (modelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [modelDropdownOpen]);

  return (
    <>
      <style>{`
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scaleY(0.92); }
          to   { opacity: 1; transform: scaleY(1); }
        }
        .gemini-scrollbar::-webkit-scrollbar { width: 4px; }
        .gemini-scrollbar::-webkit-scrollbar-thumb { background: #ced4da; border-radius: 10px; }
        .gemini-scrollbar-light::-webkit-scrollbar { width: 6px; }
        .gemini-scrollbar-light::-webkit-scrollbar-thumb { background: #e9ecef; border-radius: 10px; }
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

      {/* 聊天弹窗 - 全屏覆盖 */}
      {open && (
        <div className="fixed inset-0 z-50 flex w-full h-full bg-white">
          {/* 侧边栏 */}
          <aside className={`${sidebarOpen ? 'w-[280px]' : 'w-0'} bg-[#f0f4f9] flex flex-col transition-all duration-300 ease-in-out relative overflow-hidden shrink-0`}>
            <div className="flex flex-col h-full p-3">
              <button 
                onClick={handleCreateSession}
                disabled={loading}
                className="flex items-center gap-3 px-4 py-3 bg-[#e9eef6] hover:bg-[#dfe4ea] rounded-xl text-sm font-medium transition-colors mb-4 text-[#444746] disabled:opacity-50"
              >
                <Plus size={20} />
                <span>发起新对话</span>
              </button>

              <div className="flex-1 overflow-y-auto gemini-scrollbar">
                <div className="px-2 mb-3">
                  <span className="text-xs font-bold text-[#444746] uppercase tracking-wider">对话</span>
                </div>
                <div className="space-y-1">
                  {sessionsLoading ? (
                    <div className="flex items-center justify-center py-8 text-[#444746]">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center py-8 text-[#444746] text-sm">
                      <MessageSquarePlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>暂无会话</p>
                      <p className="text-xs mt-1 opacity-70">点击上方按钮新建</p>
                    </div>
                  ) : (
                    sessions.map((session) => (
                      <div
                        key={session.id}
                        className={`group transition-all ${loading ? 'pointer-events-none opacity-60' : ''}`}
                      >
                        <div
                          onClick={() => {
                            if (!loading && session.id !== currentSessionId && deletingSessionId !== session.id) {
                              setCurrentSessionId(session.id);
                            }
                          }}
                          className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] cursor-pointer truncate transition-colors ${
                            session.id === currentSessionId 
                              ? 'bg-[#d3e3fd] text-[#041e49] font-medium' 
                              : 'hover:bg-[#dfe4ea] text-[#444746]'
                          }`}
                        >
                          <span className="truncate flex-1">{session.title || '新会话'}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#c8d4e6] text-[#5f6368] hover:text-[#202124] transition-all shrink-0"
                            title="删除会话"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {deletingSessionId === session.id && (
                          <div
                            className="mx-2 mt-1 mb-1 p-3 rounded-xl bg-white border border-gray-200/80 shadow-lg"
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
            </div>
          </aside>

          {/* 主界面 */}
          <main className="flex-1 flex flex-col relative bg-white min-w-0">
            {/* 顶部栏 */}
            <header className="flex justify-between items-center px-4 py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)} 
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <Menu size={20} className="text-[#5f6368]" />
                </button>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-500" />
                  <span className="text-xl font-normal text-[#1f1f1f]">AI 助手</span>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleCloseAssistant}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-[#5f6368]" />
                </button>
              </div>
            </header>

            {/* 聊天区域 */}
            <div 
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto gemini-scrollbar-light"
            >
              <div className="max-w-[800px] mx-auto px-6 py-6">
              {!currentSessionId ? (
                <div className="flex flex-col items-center justify-center h-[60vh] text-[#5f6368]">
                  <Sparkles className="w-12 h-12 mb-4 opacity-50" />
                  <p className="text-lg font-normal">选择或新建一个会话开始聊天</p>
                </div>
              ) : !historyLoaded ? (
                <div className="flex items-center justify-center h-[60vh]">
                  <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                </div>
              ) : messages.length === 0 && !thinking && !loadingMore ? (
                <div className="mt-16">
                  <h1 className="text-2xl font-normal text-gray-800 mb-6">你好，我是 AI 助手</h1>
                  <div className="text-gray-600 space-y-4 leading-relaxed mb-10">
                    <p>我可以帮助你：</p>
                    <ul className="list-disc pl-5 space-y-2">
                      <li>解答编程问题和算法疑惑</li>
                      <li>分析代码，找出潜在问题</li>
                      <li>提供解题思路和优化建议</li>
                      <li>讲解算法原理和复杂度分析</li>
                    </ul>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-xl">
                    <button
                      onClick={() => setInputValue('帮我分析这道题的解题思路')}
                      className="px-4 py-3 bg-[#f0f4f9] hover:bg-[#e3e8ef] rounded-xl text-sm text-left text-[#1f1f1f] transition-colors"
                    >
                      帮我分析这道题的解题思路
                    </button>
                    <button
                      onClick={() => setInputValue('这段代码有什么问题？')}
                      className="px-4 py-3 bg-[#f0f4f9] hover:bg-[#e3e8ef] rounded-xl text-sm text-left text-[#1f1f1f] transition-colors"
                    >
                      这段代码有什么问题？
                    </button>
                    <button
                      onClick={() => setInputValue('能帮我优化一下算法复杂度吗？')}
                      className="px-4 py-3 bg-[#f0f4f9] hover:bg-[#e3e8ef] rounded-xl text-sm text-left text-[#1f1f1f] transition-colors"
                    >
                      能帮我优化一下算法复杂度吗？
                    </button>
                    <button
                      onClick={() => setInputValue('讲解一下这个算法的原理')}
                      className="px-4 py-3 bg-[#f0f4f9] hover:bg-[#e3e8ef] rounded-xl text-sm text-left text-[#1f1f1f] transition-colors"
                    >
                      讲解一下这个算法的原理
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* 加载更多提示 */}
                  {loadingMore && (
                    <div className="flex items-center justify-center gap-2 text-[#5f6368] text-sm py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>加载历史消息...</span>
                    </div>
                  )}
                  {hasMore && !loadingMore && (
                    <div className="text-center py-2">
                      <span className="inline-flex items-center gap-1.5 text-xs text-[#5f6368] bg-[#f0f4f9] px-3 py-1.5 rounded-full">
                        <ChevronRight className="w-3 h-3 -rotate-90" />
                        滚动加载更多
                      </span>
                    </div>
                  )}

                  {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        msg.role === 'user' ? 'bg-purple-600 text-white' : ''
                      }`}>
                        {msg.role === 'user' ? (
                          userAvatar ? (
                            <Avatar size={32} src={userAvatar} />
                          ) : (
                            <User size={18} />
                          )
                        ) : (
                          msg.modelLogoUrl ? (
                            <Avatar size={32} src={msg.modelLogoUrl} />
                          ) : (
                            <Sparkles className="text-blue-500" size={22} />
                          )
                        )}
                      </div>
                      <div className={`max-w-[85%] text-[15px] leading-7 ${
                        msg.role === 'user' 
                          ? 'bg-[#f0f4f9] px-5 py-3 rounded-2xl text-[#1f1f1f]' 
                          : 'text-[#1f1f1f]'
                      }`}>
                        {msg.role === 'bot' ? (
                          <div className="space-y-3">
                            {msg.thinkingContent != null && msg.thinkingContent.trim() !== '' && (
                              <div className="mb-3">
                                <button
                                  onClick={() => setExpandedThinking(prev => ({ ...prev, [index]: !prev[index] }))}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[#5f6368] hover:bg-[#f0f4f9] rounded-full transition-all duration-200 group"
                                >
                                  <span className="font-medium">{expandedThinking[index] ? '隐藏思路' : '显示思路'}</span>
                                  <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expandedThinking[index] ? 'rotate-180' : ''}`} />
                                </button>
                                <div
                                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                                    expandedThinking[index] ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0'
                                  }`}
                                >
                                  <div className="pl-4 border-l-2 border-blue-200">
                                    <div className="prose prose-sm max-w-none text-[#5f6368] italic prose-pre:bg-gray-900 prose-pre:rounded-lg prose-p:my-2 prose-headings:not-italic prose-headings:text-[#1f1f1f] prose-strong:not-italic prose-strong:text-[#1f1f1f]">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                          code({ inline, className, children, ...props }: any) {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const codeString = String(children).replace(/\n$/, '');
                                            return !inline && match ? (
                                              <div className="relative group not-italic">
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
                                              <code className={`${className} bg-[#f0f4f9] px-1.5 py-0.5 rounded not-italic`} {...props}>
                                                {children}
                                              </code>
                                            );
                                          },
                                        }}
                                      >
                                        {renderLatex(prepareMarkdownForDisplay(msg.thinkingContent.trim()))}
                                      </ReactMarkdown>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {msg.content != null && msg.content.trim() !== '' && (
                              <ReactMarkdown
                                className="prose prose-sm max-w-none text-[#1f1f1f] prose-pre:bg-gray-900 prose-pre:rounded-xl"
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
                                      <code className={`${className} bg-[#f0f4f9] px-1.5 py-0.5 rounded`} {...props}>
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
                          <span className="whitespace-pre-wrap break-words">{msg.content}</span>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* 思考中指示器 - Gemini 风格 */}
                  {thinking && (
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                        {thinkingModelLogoRef.current ? (
                          <Avatar size={32} src={thinkingModelLogoRef.current} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-500 flex items-center justify-center animate-pulse">
                            <Sparkles className="text-white" size={16} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[#5f6368] bg-[#f8f9fa] rounded-full">
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                          <span className="font-medium">思考中</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
              </div>
            </div>

            {/* 底部输入框 */}
            <div className="w-full flex justify-center p-4">
              <div className="max-w-[800px] w-full">
                <div 
                  className="bg-[#f0f4f9] rounded-[28px] p-2 flex flex-col"
                  onClick={() => inputCollapsed && setInputCollapsed(false)}
                >
                  <div
                    className="overflow-hidden transition-all duration-300 ease-in-out"
                    style={{ maxHeight: inputCollapsed ? 0 : 200, opacity: inputCollapsed ? 0 : 1 }}
                  >
                    <textarea
                      value={inputValue}
                      onChange={(e) => {
                        setInputValue(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${Math.min(e.target.scrollHeight, 174)}px`;
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={currentSessionId ? '输入您的问题...' : '请先选择或新建一个会话'}
                      rows={2}
                      disabled={loading || !isAuthenticated() || !currentSessionId}
                      className="w-full bg-transparent px-6 pt-4 pb-2 text-base resize-none placeholder:text-gray-500 outline-none border-none disabled:cursor-not-allowed"
                    />
                  </div>
                  <div className={`flex items-center justify-between px-3 pb-2 mt-1 ${inputCollapsed ? 'cursor-pointer' : ''}`}>
                    <div className="flex items-center gap-1">
                      {inputCollapsed && (
                        <span className="text-sm text-gray-400 select-none px-2">点击展开输入框...</span>
                      )}
                      {!inputCollapsed && problemContext && (
                        <>
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg shrink-0">
                            #{problemContext.problemId} {problemContext.title}
                          </span>
                          <button
                            onClick={() => void handleQuickSend(buildProblemInfoPrompt)}
                            disabled={loading || sessionsLoading}
                            className="h-8 px-3 text-xs font-medium text-[#444746] bg-white/50 border border-gray-300 rounded-full hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                          >
                            发送题目信息
                          </button>
                          <button
                            onClick={() => void handleQuickSend(buildCodePrompt)}
                            disabled={loading || sessionsLoading || !problemContext.code?.trim()}
                            className="h-8 px-3 text-xs font-medium text-[#444746] bg-white/50 border border-gray-300 rounded-full hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            发送当前代码
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {models.length > 0 && (
                        <div ref={modelDropdownRef} className="relative">
                          <button
                            type="button"
                            onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                            className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm hover:bg-gray-50 transition-colors"
                          >
                            {(() => {
                              const m = models.find((x) => x.id === selectedModelId);
                              if (!m) return <span className="text-gray-400">选择模型</span>;
                              return (
                                <>
                                  {m.logoUrl ? (
                                    <img src={m.logoUrl} alt="" className="w-4 h-4 rounded object-cover shrink-0" />
                                  ) : (
                                    <div className="w-4 h-4 rounded bg-blue-400 flex items-center justify-center shrink-0">
                                      <Bot className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  <span className="truncate text-[#5f6368] max-w-[120px]">{m.name}</span>
                                </>
                              );
                            })()}
                            <ChevronRight className={`w-3 h-3 text-gray-400 transition-transform ${modelDropdownOpen ? '-rotate-90' : 'rotate-90'}`} />
                          </button>
                          {modelDropdownOpen && (
                            <div 
                              className="absolute bottom-full right-0 mb-3 bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 p-2 min-w-[200px] z-50"
                              style={{ animation: 'fadeScaleIn 0.15s ease-out' }}
                            >
                              <div className="px-3 py-2 border-b border-gray-100 mb-1">
                                <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">选择模型</span>
                              </div>
                              {models.map((m) => (
                                <button
                                  key={m.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedModelId(m.id);
                                    setModelDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                                    selectedModelId === m.id 
                                      ? 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700' 
                                      : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  {m.logoUrl ? (
                                    <img src={m.logoUrl} alt="" className="w-6 h-6 rounded-lg object-cover shrink-0 ring-1 ring-gray-100" />
                                  ) : (
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shrink-0">
                                      <Bot className="w-3.5 h-3.5 text-white" />
                                    </div>
                                  )}
                                  <span className="flex-1 text-left font-medium">{m.name}</span>
                                  {selectedModelId === m.id && (
                                    <Check className="w-4 h-4 text-blue-500" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {inputValue.trim() && (
                        <button
                          onClick={handleSend}
                          disabled={!inputValue.trim() || !isAuthenticated() || loading || !currentSessionId}
                          className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-center text-gray-500 mt-3">AI 助手的回答仅供参考，请自行验证结果的准确性。</p>
              </div>
            </div>
          </main>
        </div>
      )}
    </>
  );
};

export default AIAssistant;

