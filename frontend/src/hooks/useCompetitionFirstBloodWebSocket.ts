import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

export interface CompetitionFirstBloodMessage {
  type: 'first_blood';
  competitionId: number;
  problemId: number;
  problemLabel?: string;
  problemTitle: string;
  participantName: string;
  message: string;
}

export const useCompetitionFirstBloodWebSocket = (competitionId?: string | number | null, enabled = true) => {
  const wsRef = useRef<WebSocket | null>(null);
  const shownMessagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled || !competitionId) return;

    let isCancelled = false;
    let currentWs: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const connect = () => {
      if (isCancelled) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/competition/first-blood?cid=${competitionId}`;
      const ws = new WebSocket(wsUrl);
      currentWs = ws;
      wsRef.current = ws;

      ws.onopen = () => {
        if (isCancelled) return;
        heartbeatTimer = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      ws.onmessage = (event: MessageEvent) => {
        if (isCancelled) return;
        try {
          const data = JSON.parse(event.data) as CompetitionFirstBloodMessage | { type?: string };
          if (data.type === 'pong') return;
          if (data.type !== 'first_blood') return;
          const message = data as CompetitionFirstBloodMessage;
          const messageKey = `${message.competitionId}:${message.problemId}:${message.participantName}`;
          if (shownMessagesRef.current.has(messageKey)) return;
          shownMessagesRef.current.add(messageKey);
          const problemName = message.problemLabel ? `${message.problemLabel} 题《${message.problemTitle}》` : `《${message.problemTitle}》`;
          toast.success(`🔥 ${message.participantName}拿下 ${problemName}一血`, {
            duration: 6000,
            position: 'top-center',
            style: {
              fontSize: '18px',
              padding: '16px 22px',
              maxWidth: '520px',
            },
          });
        } catch (err) {
          console.error('[CompetitionFirstBloodWS] 解析消息失败:', err);
        }
      };

      ws.onclose = () => {
        if (isCancelled) return;
        wsRef.current = null;
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer);
          heartbeatTimer = null;
        }
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (!isCancelled) ws.close();
      };
    };

    connect();

    return () => {
      isCancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (currentWs && (currentWs.readyState === WebSocket.CONNECTING || currentWs.readyState === WebSocket.OPEN)) {
        currentWs.close(1000, 'unmount');
      }
      wsRef.current = null;
    };
  }, [competitionId, enabled]);

  return wsRef.current;
};
