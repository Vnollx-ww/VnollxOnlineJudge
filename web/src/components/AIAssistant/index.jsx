import { useState, useEffect, useRef, useCallback } from 'react';
import { FloatButton, Drawer, Input, Button, Space, message as antMessage, Modal } from 'antd';
import {
  RobotOutlined,
  SendOutlined,
  ClearOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './AIAssistant.css';

const { TextArea } = Input;

const AIAssistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);
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
      const response = await api.get('/ai/history');
      if (response.code === 200 && response.data && response.data.length > 0) {
        const parsedMessages = response.data
          .map((item) => {
            const match = item.match(/^\[(用户|AI)\]\s*(.*)$/s);
            if (match) {
              const role = match[1] === '用户' ? 'user' : 'bot';
              const content = match[2];
              // 跳过系统消息
              if (content.startsWith('[系统]') || content.includes('你是一个专业的编程助手')) {
                return null;
              }
              return { role, content, timestamp: Date.now() };
            }
            return null;
          })
          .filter(Boolean);

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

  // 打开抽屉时加载历史
  useEffect(() => {
    if (open && messages.length === 0) {
      loadHistory();
    }
  }, [open, messages.length, loadHistory]);

  // 流式接收消息
  const streamChat = async (userMessage) => {
    if (!isAuthenticated()) {
      messageApi.warning('请先登录后再使用AI助手');
      return;
    }

    setLoading(true);
    setThinking(true);

    // 添加用户消息
    const userMsg = {
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

      // 创建 bot 消息占位
      const botMsg = {
        role: 'bot',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
      setThinking(false);

      const pump = async () => {
        const { done, value } = await reader.read();
        if (done) {
          setLoading(false);
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\n\n/);
        buffer = parts.pop() || '';

        for (const chunk of parts) {
          const lines = chunk.split(/\n/).map((l) => l.replace(/^data:\s?/, ''));
          const data = lines.join('\n');
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

  // 发送消息
  const handleSend = () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    streamChat(text);
  };

  // 清空记忆
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
        } catch (error) {
          messageApi.error('清空失败，请稍后重试');
        }
      },
    });
  };

  return (
    <>
      {contextHolder}
      {modalContextHolder}
      <FloatButton
        icon={<RobotOutlined />}
        type="primary"
        style={{ right: 24, bottom: 90 }}
        onClick={() => setOpen(true)}
        tooltip="AI 助手"
      />
      <Drawer
        title={
          <Space>
            <RobotOutlined />
            <span>AI 助手</span>
          </Space>
        }
        placement="right"
        onClose={() => setOpen(false)}
        open={open}
        width={400}
        extra={
          <Space>
            <Button
              type="text"
              icon={<ClearOutlined />}
              onClick={handleClear}
              title="清空记忆"
            />
          </Space>
        }
        styles={{
          body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' },
        }}
      >
        <div className="ai-chat-container">
          <div className="ai-messages">
            {messages.map((msg, index) => (
              <div key={index} className={`ai-message ai-message-${msg.role}`}>
                <div className="ai-message-bubble">
                  {msg.role === 'bot' ? (
                    <ReactMarkdown
                      className="ai-markdown"
                      components={{
                        code({ node, inline, className, children, ...props }) {
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
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <span>{msg.content}</span>
                  )}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="ai-message ai-message-bot">
                <div className="ai-thinking">
                  <span>AI思考中</span>
                  <div className="ai-thinking-dots">
                    <span className="ai-thinking-dot"></span>
                    <span className="ai-thinking-dot"></span>
                    <span className="ai-thinking-dot"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="ai-input-area">
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
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              loading={loading}
              disabled={!inputValue.trim() || !isAuthenticated()}
            >
              发送
            </Button>
          </div>
        </div>
      </Drawer>
    </>
  );
};

export default AIAssistant;
