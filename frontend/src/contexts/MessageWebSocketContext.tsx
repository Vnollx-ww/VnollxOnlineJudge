import React, { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { getUserInfo, isAuthenticated } from '@/utils/auth';

interface MessageEvent {
  type: string;
  [key: string]: any;
}

interface MessageWebSocketContextType {
  isConnected: boolean;
  sendMessage: (message: object) => void;
  subscribe: (callback: (msg: MessageEvent) => void) => () => void;
}

const MessageWebSocketContext = createContext<MessageWebSocketContextType>({
  isConnected: false,
  sendMessage: () => {},
  subscribe: () => () => {},
});

export const useMessageWebSocket = () => useContext(MessageWebSocketContext);

interface MessageWebSocketProviderProps {
  children: ReactNode;
}

export const MessageWebSocketProvider: React.FC<MessageWebSocketProviderProps> = ({ children }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const subscribersRef = useRef<Set<(msg: MessageEvent) => void>>(new Set());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!isAuthenticated()) return;
    
    const { id: currentUserId } = getUserInfo();
    if (!currentUserId) return;

    // 避免重复连接
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/message?uid=${currentUserId}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      console.log('[MessageWS] 全局连接已建立');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'pong') return;
        
        // 如果是私信消息，触发全局事件更新未读数
        if (msg.senderId) {
          window.dispatchEvent(new CustomEvent('message-updated'));
        }
        
        // 通知所有订阅者
        subscribersRef.current.forEach(callback => {
          try {
            callback(msg);
          } catch (err) {
            console.error('[MessageWS] 订阅者处理消息失败:', err);
          }
        });
      } catch (err) {
        console.error('[MessageWS] 解析消息失败:', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      console.log('[MessageWS] 连接已关闭');
      
      // 自动重连
      if (isAuthenticated()) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[MessageWS] 尝试重连...');
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error('[MessageWS] 连接错误:', error);
    };

    // 心跳
    const heartbeat = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => {
      clearInterval(heartbeat);
    };
  }, []);

  useEffect(() => {
    connect();

    // 监听登录状态变化
    const handleAuthChange = () => {
      if (isAuthenticated()) {
        connect();
      } else {
        wsRef.current?.close();
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((message: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const subscribe = useCallback((callback: (msg: MessageEvent) => void) => {
    subscribersRef.current.add(callback);
    return () => {
      subscribersRef.current.delete(callback);
    };
  }, []);

  return (
    <MessageWebSocketContext.Provider value={{ isConnected, sendMessage, subscribe }}>
      {children}
    </MessageWebSocketContext.Provider>
  );
};

export default MessageWebSocketContext;
