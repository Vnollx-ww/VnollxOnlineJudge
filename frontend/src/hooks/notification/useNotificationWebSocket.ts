import { useEffect, useRef, useCallback } from 'react';
import { getUserInfo } from '@/utils/auth';

export interface NotificationMessage {
  id: number;
  title: string;
  description?: string;
  is_read: boolean;
  createTime: string;
  commentId?: number;
}

type MessageHandler = (data: NotificationMessage) => void;

/**
 * 通知 WebSocket Hook
 * - 稳定连接，避免重复创建
 * - 自动重连（指数退避）
 * - 心跳保活
 */
export const useNotificationWebSocket = (onMessage: MessageHandler) => {
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef<MessageHandler>(onMessage);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  // 保持最新回调引用
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const { id } = getUserInfo();

  // 清理定时器
  const clearTimers = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 启动心跳
  const startHeartbeat = useCallback((ws: WebSocket) => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
    }
    heartbeatTimerRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  }, []);

  // 计算重连延迟
  const getReconnectDelay = useCallback(() => {
    const baseDelay = 1000;
    const maxDelay = 60000;
    return Math.min(baseDelay * Math.pow(2, reconnectAttemptRef.current), maxDelay);
  }, []);

  // 连接函数
  const connect = useCallback(() => {
    if (!isMountedRef.current || !id) return;

    // 避免重复连接
    if (wsRef.current?.readyState === WebSocket.CONNECTING || 
        wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/notification?uid=${id}`;

    console.log('[NotificationWS] 连接中...', wsUrl);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) {
        ws.close();
        return;
      }
      console.log('[NotificationWS] 已连接');
      reconnectAttemptRef.current = 0;
      startHeartbeat(ws);
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') return; // 忽略心跳响应
        onMessageRef.current(data as NotificationMessage);
      } catch (err) {
        console.error('[NotificationWS] 解析错误:', err);
      }
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      console.log('[NotificationWS] 已断开', event.code);
      clearTimers();
      wsRef.current = null;

      // 非正常关闭时重连
      if (event.code !== 1000) {
        reconnectAttemptRef.current++;
        const delay = getReconnectDelay();
        console.log(`[NotificationWS] ${delay/1000}s后重连...`);
        reconnectTimerRef.current = setTimeout(connect, delay);
      }
    };

    ws.onerror = () => {
      // 错误会触发onclose，在那里处理重连
    };
  }, [id, startHeartbeat, clearTimers, getReconnectDelay]);

  useEffect(() => {
    if (!id) return;

    isMountedRef.current = true;
    connect();

    return () => {
      isMountedRef.current = false;
      clearTimers();
      if (wsRef.current) {
        wsRef.current.close(1000, 'unmount');
        wsRef.current = null;
      }
    };
  }, [id, connect, clearTimers]);

  return wsRef.current;
};
