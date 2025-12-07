import { useEffect, useRef } from 'react';
import { getUserInfo } from '../utils/auth';

export const useJudgeWebSocket = (onMessage) => {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const reconnectTimerRef = useRef(null);
  const isUnmountedRef = useRef(false);
  const { id } = getUserInfo();

  // Keep the latest onMessage handler in a ref
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!id) return;

    // 用局部变量控制当前 effect 的生命周期
    let isCancelled = false;
    let currentWs = null;
    let reconnectTimer = null;

    const connect = () => {
      if (isCancelled) return;

      // 建立 WebSocket 连接
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/judge?uid=${id}`;
      
      const ws = new WebSocket(wsUrl);
      currentWs = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isCancelled) {
          console.log('WebSocket 连接成功');
        }
      };

      ws.onmessage = (event) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(event.data);
          if (onMessageRef.current) {
            onMessageRef.current(data);
          }
        } catch (err) {
          console.error('WebSocket message parse error:', err);
        }
      };

      ws.onclose = () => {
        if (isCancelled) return;
        console.log('WebSocket 连接关闭');
        wsRef.current = null;
        // 断线重连：3秒后重试
        reconnectTimer = setTimeout(() => {
          console.log('WebSocket 尝试重连...');
          connect();
        }, 3000);
      };

      ws.onerror = () => {
        if (!isCancelled) {
          ws.close();
        }
      };
    };

    connect();

    return () => {
      isCancelled = true;
      // 清除重连定时器
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
      // 关闭连接
      if (currentWs) {
        if (currentWs.readyState === WebSocket.CONNECTING || currentWs.readyState === WebSocket.OPEN) {
          currentWs.close();
        }
      }
      wsRef.current = null;
    };
  }, [id]);

  return wsRef.current;
};
