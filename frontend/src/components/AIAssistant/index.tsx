import { useState, useEffect, useRef, useCallback } from 'react';
import { FloatButton, Drawer, Input, Button, message as antMessage, Modal, Avatar } from 'antd';
import { Bot, Send, Trash2, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';
import type { ApiResponse } from '@/types';

const { TextArea } = Input;

interface Message {
  role: 'user' | 'bot';
  content: string;
  timestamp: number;
}

// 渲染 LaTeX 公式
const renderLatex = (text: string): string => {
  if (!text) return text;
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

const AIAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageApi, contextHolder] = antMessage.useMessage();
  const [modal, modalContextHolder] = Modal.useModal();

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

  // 流式接收消息
  const streamChat = async (userMessage: string) => {
    if (!isAuthenticated()) {
      messageApi.warning('请先登录后再使用AI助手');
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

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/ai/chat?message=${encodeURIComponent(userMessage)}`,
        {
          headers: {
            Accept: 'text/event-stream',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('网络错误');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let accumulatedText = '';

      const botMsg: Message = {
        role: 'bot',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setThinking(false);

      const pump = async (): Promise<void> => {
        const { done, value } = await reader.read();
        if (done) {
          setLoading(false);
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';

        for (const chunk of parts) {
          const lines = chunk.split(/\n/).map((l) => l.replace(/^data:\s?/, '')).filter(l => l.trim());
          const data = lines.join('');
          const cleanedData = data.replace(/\[DONE\]/g, '').replace(/"{1,10}/g, '');

          if (cleanedData) {
            accumulatedText += cleanedData;
            setMessages((prev) => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                ...newMessages[newMessages.length - 1],
                content: accumulatedText,
              };
              return newMessages;
            });
          }
        }

        return pump();
      };

      await pump();
    } catch (error) {
      console.error('发送消息失败:', error);
      setThinking(false);
      setLoading(false);
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          content: '[系统] 服务异常，请稍后再试',
          timestamp: Date.now(),
        },
      ]);
    }
  };

  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    streamChat(text);
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
          await fetch('/ai/clear', {
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
      
      {/* 悬浮按钮 */}
      <FloatButton
        icon={<Bot className="w-5 h-5" />}
        type="primary"
        className="!w-12 !h-12 !right-10 !bottom-12"
        onClick={() => setOpen(true)}
        tooltip="AI 助手"
      />

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
        width={420}
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
                  className={`flex-shrink-0 ${
                    msg.role === 'bot'
                      ? 'bg-gradient-to-br from-acg-accent to-acg-primary'
                      : 'bg-gradient-to-br from-acg-success to-emerald-600'
                  }`}
                >
                  {msg.role === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
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
                  className="flex-shrink-0 bg-gradient-to-br from-acg-accent to-acg-primary"
                >
                  <Bot className="w-4 h-4" />
                </Avatar>
                <div className="bg-white shadow-sm rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex items-center gap-2 text-acg-secondary text-sm">
                    <span>AI思考中</span>
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

