import { useState, useEffect, useRef, useCallback } from 'react';
import { FloatButton, Drawer, Input, Button, message as antMessage, Modal, Avatar } from 'antd';
import { Bot, Send, Trash2, User, Copy, Check, Code2 } from 'lucide-react';
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
  // 修复代码块语言标识后缺少换行：```cpp#include → ```cpp\n#include
  text = text.replace(/```(\w+)([^\n])/g, '```$1\n$2');
  return text;
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

// 去掉代码第一行（修复 AI 返回的代码块第一行多余内容）
const removeFirstLine = (text: string): string => {
  const lines = text.split('\n');
  return lines.length > 1 ? lines.slice(1).join('\n') : text;
};

// 复制按钮组件
const CopyButton: React.FC<{ text: string }> = ({ text }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const cleanedText = removeFirstLine(text);
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
    const cleanedCode = removeFirstLine(code);
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

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();
  const { hasPermission } = usePermission();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);

  // 加载历史消息
  const loadHistory = useCallback(async () => {
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
      const response = await api.get('/ai/history') as ApiResponse<string[]>;
      if (response.code === 200 && response.data && response.data.length > 0) {
        const parsedMessages = response.data
          .map((item: string) => {
            const match = item.match(/^\[(用户|AI)\]\s*(.*)$/s);
            if (match) {
              const role = match[1] === '用户' ? 'user' : 'bot';
              const content = match[2];
              if (content.startsWith('[系统]') || content.includes('你是一个专业的编程助手')) {
                return null;
              }
              return { role, content, timestamp: Date.now() } as Message;
            }
            return null;
          })
          .filter(Boolean) as Message[];

        if (parsedMessages.length > 0) {
          setMessages(parsedMessages);
        } else {
          setMessages([
            {
              role: 'bot',
              content: '你好！我是AI助手，有什么可以帮助您的吗？',
              timestamp: Date.now(),
            },
          ]);
        }
      } else {
        setMessages([
          {
            role: 'bot',
            content: '你好！我是AI助手，有什么可以帮助您的吗？',
            timestamp: Date.now(),
          },
        ]);
      }
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

  useEffect(() => {
    if (open && messages.length === 0) {
      loadHistory();
    }
  }, [open, messages.length, loadHistory]);

  // 监听外部事件打开 AI 助手并发送消息
  useEffect(() => {
    const handleOpenAiAssistant = (event: CustomEvent<{ message: string }>) => {
      setOpen(true);
      // 延迟发送消息，确保抽屉打开且历史加载完成
      setTimeout(() => {
        if (event.detail?.message) {
          sendChat(event.detail.message);
        }
      }, 300);
    };

    window.addEventListener('open-ai-assistant', handleOpenAiAssistant as EventListener);
    return () => {
      window.removeEventListener('open-ai-assistant', handleOpenAiAssistant as EventListener);
    };
  }, []);

  // WebSocket 引用
  const wsRef = useRef<WebSocket | null>(null);
  const accumulatedTextRef = useRef<string>('');

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

    ws.onopen = () => {
      // 发送聊天消息
      ws.send(JSON.stringify({ type: 'chat', message: userMessage }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'start') {
          // AI 开始响应，创建空的 bot 消息
          setThinking(false);
          setMessages((prev) => [
            ...prev,
            { role: 'bot', content: '', timestamp: Date.now() },
          ]);
        } else if (data.type === 'token') {
          // 收到 token，累加到消息
          accumulatedTextRef.current += data.content;
          setMessages((prev) => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              content: accumulatedTextRef.current,
            };
            return newMessages;
          });
        } else if (data.type === 'done') {
          // 响应完成
          setLoading(false);
          ws.close();
        } else if (data.type === 'error') {
          // 错误
          setThinking(false);
          setLoading(false);
          setMessages((prev) => [
            ...prev,
            { role: 'bot', content: `错误: ${data.message}`, timestamp: Date.now() },
          ]);
          ws.close();
        }
      } catch (e) {
        console.error('解析消息失败:', e);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket 错误:', error);
      setThinking(false);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        { role: 'bot', content: '连接错误，请重试', timestamp: Date.now() },
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
          <div className="flex items-center gap-2 text-acg-primary">
            <Bot className="w-5 h-5" />
            <span className="font-bold">AI 助手</span>
          </div>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={720}
        extra={
          <button
            onClick={handleClear}
            className="p-2 rounded-lg text-acg-secondary hover:bg-acg-btn hover:text-acg-primary transition-all duration-200"
            title="清空记忆"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        }
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        }}
        className="ai-drawer"
      >
        <div className="flex-1 flex flex-col h-full bg-acg-bg">
          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in`}
              >
                <Avatar
                  size={36}
                  src={msg.role === 'bot' ? 'http://111.230.105.54:9001/api/v1/buckets/avatar/objects/download?preview=true&prefix=%E4%B8%8B%E8%BD%BD%20(1).png' : undefined}
                  className={`flex-shrink-0 ${
                    msg.role === 'bot'
                      ? ''
                      : 'bg-gradient-to-br from-acg-success to-emerald-600'
                  }`}
                >
                  {msg.role === 'bot' ? null : <User className="w-4 h-4" />}
                </Avatar>
                <div
                  className={`
                    max-w-[80%] px-4 py-3 rounded-2xl
                    ${msg.role === 'bot'
                      ? 'bg-white shadow-sm rounded-tl-md'
                      : 'bg-acg-btn rounded-tr-md'
                    }
                  `}
                >
                  {msg.role === 'bot' ? (
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
                      {renderLatex(msg.content)}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-acg-primary text-sm">{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            
            {/* 思考中指示器 */}
            {thinking && (
              <div className="flex gap-3 animate-fade-in">
                <Avatar
                  size={36}
                  src="http://111.230.105.54:9001/api/v1/buckets/avatar/objects/download?preview=true&prefix=%E4%B8%8B%E8%BD%BD%20(1).png"
                  className="flex-shrink-0"
                />
                <div className="bg-white shadow-sm rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-acg-secondary text-sm">
                    <span>AI 分析中</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-acg-secondary rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-acg-secondary rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-acg-secondary rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入区域 */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex gap-2">
              <TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="说点什么..."
                autoSize={{ minRows: 1, maxRows: 4 }}
                disabled={loading || !isAuthenticated()}
                className="flex-1 rounded-xl border-gray-100 focus:border-acg-input-border"
              />
              <Button
                type="primary"
                icon={<Send className="w-4 h-4" />}
                onClick={handleSend}
                loading={loading}
                disabled={!inputValue.trim() || !isAuthenticated()}
                className="h-auto px-4 rounded-xl bg-acg-btn text-acg-primary border-none hover:bg-acg-btn-hover"
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

