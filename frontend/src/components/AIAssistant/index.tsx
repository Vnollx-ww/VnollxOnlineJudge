import { useState, useEffect, useRef, useCallback } from 'react';
import { FloatButton, Drawer, Input, Button, message as antMessage, Modal, Avatar, Select } from 'antd';
import { Bot, Send, Trash2, User, Copy, Check, Code2, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
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

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
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
  /** 由「AI分析」等外部事件带入的待发送消息，等模型列表加载后再发 */
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  /** 分页游标 */
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  /** 是否应该滚动到底部 */
  const shouldScrollToBottomRef = useRef(true);
  /** 首次打开后，历史消息落地时直接定位到底部，但不播放动画 */
  const shouldJumpToBottomOnceRef = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const { hasPermission } = usePermission();

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  };

  useEffect(() => {
    if (messages.length === 0) return;
    // 首次打开：历史消息加载完后直接跳到底部（无动画），优先级最高
    if (shouldJumpToBottomOnceRef.current) {
      shouldJumpToBottomOnceRef.current = false;
      requestAnimationFrame(() => scrollToBottom(false));
      return;
    }
    // 上滑分页 / 历史加载时不滚动
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

  // 加载历史消息（分页接口，首次加载10条）
  const loadHistory = useCallback(async () => {
    shouldScrollToBottomRef.current = false;
    if (!isAuthenticated()) {
      setMessages([
        {
          role: 'bot',
          content: '请先登录后再使用AI助手功能',
          timestamp: Date.now(),
        },
      ]);
      return;
    }

    try {
      const response = await api.get('/ai/history/page?limit=10') as ApiResponse<HistoryPageResponse>;
      if (response.code === 200 && response.data) {
        const { items, nextCursor: cursor, hasMore: more } = response.data;
        setNextCursor(cursor);
        setHasMore(more);
        
        if (items && items.length > 0) {
          const list = parseHistoryItems(items);
          if (list.length > 0) {
            setMessages(list);
            return;
          }
        }
      }
      setMessages([
        {
          role: 'bot',
          content: '你好！我是AI助手，有什么可以帮助您的吗？',
          timestamp: Date.now(),
        },
      ]);
    } catch (error) {
      console.error('加载历史消息失败:', error);
      setMessages([
        {
          role: 'bot',
          content: '你好！我是AI助手，有什么可以帮助您的吗？',
          timestamp: Date.now(),
        },
      ]);
    }
  }, []);

  // 滚动加载更多历史消息（每次5条）
  const loadMoreHistory = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    
    setLoadingMore(true);
    // 加载历史消息时不滚动到底部
    shouldScrollToBottomRef.current = false;
    
    const container = messagesContainerRef.current;
    const prevScrollHeight = container?.scrollHeight ?? 0;
    
    try {
      const response = await api.get(`/ai/history/page?beforeId=${nextCursor}&limit=5`) as ApiResponse<HistoryPageResponse>;
      if (response.code === 200 && response.data) {
        const { items, nextCursor: cursor, hasMore: more } = response.data;
        setNextCursor(cursor);
        setHasMore(more);
        
        if (items && items.length > 0) {
          const list = parseHistoryItems(items);
          if (list.length > 0) {
            // 在顶部插入历史消息
            setMessages((prev) => [...list, ...prev]);
            // 保持滚动位置
            requestAnimationFrame(() => {
              if (container) {
                container.scrollTop = container.scrollHeight - prevScrollHeight;
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('加载更多历史消息失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, nextCursor]);

  // 滚动事件处理：滚动到顶部时加载更多
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    if (container.scrollTop < 50 && hasMore && !loadingMore) {
      loadMoreHistory();
    }
  }, [hasMore, loadingMore, loadMoreHistory]);

  // 缓存选中的模型到 localStorage
  useEffect(() => {
    if (selectedModelId != null) {
      try {
        localStorage.setItem(AI_ASSISTANT_MODEL_KEY, String(selectedModelId));
      } catch (_) {}
    }
  }, [selectedModelId]);

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

  useEffect(() => {
    if (open) {
      if (messages.length === 0) {
        shouldJumpToBottomOnceRef.current = true;
      }
      loadModels();
      loadUserProfile();
      if (messages.length === 0) loadHistory();
    }
  }, [open, messages.length, loadHistory, loadModels, loadUserProfile]);

  // 待发送消息：由「AI分析」等外部事件带入，等模型列表加载后再发，保证 bot 能拿到 modelLogo
  const sendChatRef = useRef<(msg: string) => void>(() => {});
  useEffect(() => {
    sendChatRef.current = sendChat;
  });
  useEffect(() => {
    if (!open || models.length === 0 || !pendingMessage) return;
    sendChatRef.current(pendingMessage);
    setPendingMessage(null);
  }, [open, models.length, pendingMessage]);

  // 监听外部事件打开 AI 助手并发送消息（等模型加载后再发，避免 Logo 不显示）
  useEffect(() => {
    const handleOpenAiAssistant = (event: CustomEvent<{ message: string }>) => {
      setOpen(true);
      const message = event.detail?.message?.trim();
      if (message) setPendingMessage(message);
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
  const sendChat = (userMessage: string) => {
    if (!isAuthenticated()) {
      messageApi.warning('请先登录后再使用AI助手');
      return;
    }

    const uid = localStorage.getItem('id');
    if (!uid) {
      messageApi.warning('请先登录');
      return;
    }

    setLoading(true);
    setThinking(true);
    // 发送新消息时应该滚动到底部
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
      // 发送聊天消息（携带选中的模型 ID）
      const payload: { type: string; message: string; modelId?: number } = { type: 'chat', message: userMessage };
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
          // 响应完成
          setLoading(false);
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
    if (!text || loading) return;
    sendChat(text);
  };

  const handleClear = () => {
    if (!isAuthenticated()) {
      messageApi.warning('请先登录');
      return;
    }

    modal.confirm({
      title: '确认清空记忆',
      content: '确定要删除所有历史消息记录吗？此操作不可恢复。',
      okText: '确认',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const token = localStorage.getItem('token');
          await fetch('/api/v1/ai/clear', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          });
          setMessages([
            {
              role: 'bot',
              content: '你好！我是AI助手，有什么可以帮助您的吗？',
              timestamp: Date.now(),
            },
          ]);
          messageApi.success('消息记录已清空');
        } catch {
          messageApi.error('清空失败，请稍后重试');
        }
      },
    });
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      
      {/* 悬浮按钮 - 需要AI使用权限 */}
      {hasPermission(PermissionCode.AI_CHAT) && (
        <FloatButton
          icon={<Bot className="w-5 h-5" />}
          type="primary"
          className="!w-12 !h-12 !right-10 !bottom-12"
          onClick={() => setOpen(true)}
          tooltip="AI 助手"
        />
      )}

      {/* 聊天抽屉 */}
      <Drawer
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
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={900}
        extra={
          <button
            onClick={handleClear}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300 group"
            title="清空记忆"
          >
            <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </button>
        }
        styles={{
          header: { borderBottom: 'none', paddingBottom: 0 },
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        }}
        className="ai-drawer"
      >
        <div className="flex-1 flex flex-col h-full bg-gradient-to-b from-slate-50 to-gray-100">
          {/* 消息列表 */}
          <div 
            ref={messagesContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto p-5 space-y-5"
          >
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
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 bg-white/80 backdrop-blur-xl border-t border-gray-100/50">
            <div className="flex gap-3 items-start">
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
                        <span className="truncate text-gray-700">{m.name}</span>
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
                  className="w-[160px] shrink-0 self-end"
                  placeholder="选择模型"
                  placement="topLeft"
                  getPopupContainer={(node) => node.parentElement ?? document.body}
                />
              )}
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="输入您的问题..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={loading || !isAuthenticated()}
                className="flex-1 min-w-0 !rounded-2xl !border-gray-200 !bg-gray-50/50 focus:!border-blue-300 focus:!bg-white !shadow-sm hover:!border-gray-300 transition-all"
              />
              <Button
                type="primary"
                icon={loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                onClick={handleSend}
                disabled={!inputValue.trim() || !isAuthenticated() || loading}
                className="!h-10 !px-5 shrink-0 flex-none !rounded-2xl !bg-blue-500 !border-none hover:!bg-blue-600 !shadow-lg !shadow-blue-500/25 disabled:!opacity-50 disabled:!shadow-none transition-all duration-300"
              >
                发送
              </Button>
            </div>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default AIAssistant;

