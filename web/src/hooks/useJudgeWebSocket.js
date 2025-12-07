import { useEffect, useRef } from 'react';
import { getUserInfo } from '../utils/auth';

export const useJudgeWebSocket = (onMessage) => {
  const wsRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const { id } = getUserInfo();

  // Keep the latest onMessage handler in a ref
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!id) return;

    // 建立 WebSocket 连接
    // 通过当前域名连接，由 Nginx 代理到后端
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/judge?uid=${id}`;
    
    // 防止重复连接
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      // WebSocket 连接成功
    };

    ws.onmessage = (event) => {
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
      // WebSocket 连接关闭
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [id]); // 只在用户ID变化时重新连接

  return wsRef.current;
};
