import { useEffect, useRef } from 'react';
import { getUserInfo } from '../utils/auth';

export const useJudgeWebSocket = (onMessage) => {
  const wsRef = useRef(null);
  const { id } = getUserInfo();

  useEffect(() => {
    if (!id) return;

    // 建立 WebSocket 连接
    // 注意：这里直接连接后端 8080 端口，避免 Vite 代理可能的问题
    // 如果部署到线上，需要根据 window.location.host 动态判断
    const wsUrl = `ws://localhost:8080/ws/judge?uid=${id}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket connected for user:', id);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (onMessage) {
          onMessage(data);
        }
      } catch (err) {
        console.error('WebSocket message parse error', err);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [id, onMessage]);

  return wsRef.current;
};
