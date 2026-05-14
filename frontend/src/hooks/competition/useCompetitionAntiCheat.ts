import { useCallback, useEffect, useRef } from 'react';
import dayjs from 'dayjs';
import api from '@/utils/api';

export type AntiCheatEventType =
  | 'PAGE_HIDDEN'
  | 'WINDOW_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'PASTE_CODE'
  | 'COPY_CODE'
  | 'CONTEXT_MENU';

interface AntiCheatEventPayload {
  problemId?: number | string | null;
  eventType: AntiCheatEventType;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  /** 任意附加上下文（如粘贴长度、当前语言、页面路径），将以 JSON 字符串保存 */
  detail?: Record<string, unknown>;
}

interface UseCompetitionAntiCheatOptions {
  /** 比赛 ID，未启用时传 null/undefined */
  competitionId: number | string | null | undefined;
  /** 当前题目 ID，可选 */
  problemId?: number | string | null;
  /** 是否启用采集（建议：比赛进行中才为 true） */
  enabled: boolean;
  /** 切屏/失焦/退出全屏/粘贴时的轻提示回调，由页面自定义 toast */
  onWarn?: (msg: string, level: 'info' | 'warning' | 'critical') => void;
}

interface QueuedEvent extends AntiCheatEventPayload {
  /** 客户端生成的临时序号，用于本地去重 */
  _seq: number;
}

const FLUSH_INTERVAL_MS = 5000;
const MAX_BATCH = 30;
const HIDDEN_DEDUPE_MS = 800; // page hidden 与 window blur 短时间内只算一次

/**
 * 比赛防作弊采集 Hook
 *
 * 监听 visibilitychange / blur / focus / fullscreenchange / paste / copy / contextmenu，
 * 根据 plan 的事件类型生成 payload，使用本地队列定时上报，并在 pagehide 时通过
 * sendBeacon 兜底。本 Hook 只采集事件，不做评分（评分由后端完成）。
 */
export function useCompetitionAntiCheat({
  competitionId,
  problemId,
  enabled,
  onWarn,
}: UseCompetitionAntiCheatOptions) {
  const queueRef = useRef<QueuedEvent[]>([]);
  const seqRef = useRef(0);
  const hiddenStartRef = useRef<number | null>(null);
  const lastHiddenReportRef = useRef<number>(0);
  const leaveCountRef = useRef<number>(0);
  const enabledRef = useRef(enabled);
  const cidRef = useRef(competitionId);
  const pidRef = useRef(problemId);

  enabledRef.current = enabled;
  cidRef.current = competitionId;
  pidRef.current = problemId;

  const enqueue = useCallback((payload: AntiCheatEventPayload) => {
    if (!enabledRef.current || !cidRef.current) return;
    seqRef.current += 1;
    queueRef.current.push({
      ...payload,
      problemId: payload.problemId ?? pidRef.current ?? null,
      _seq: seqRef.current,
    });
    // 队列过长时立即触发一次刷新
    if (queueRef.current.length >= MAX_BATCH) {
      void flush();
    }
  }, []);

  const buildBody = useCallback((events: QueuedEvent[]) => {
    return {
      competitionId: cidRef.current,
      events: events.map((e) => ({
        problemId: e.problemId ?? null,
        eventType: e.eventType,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        durationSeconds: e.durationSeconds,
        detailJson: e.detail ? JSON.stringify(e.detail) : undefined,
      })),
    };
  }, []);

  const flush = useCallback(async () => {
    if (!cidRef.current) return;
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, MAX_BATCH);
    const body = buildBody(batch);
    try {
      await api.post('/competition/anti-cheat/report', body);
    } catch {
      // 发送失败时回填，留待下次重试；但避免无限增长，至多保留 200 条
      if (queueRef.current.length < 200) {
        queueRef.current.unshift(...batch);
      }
    }
  }, [buildBody]);

  /** 页面卸载兜底：使用 sendBeacon */
  const flushBeacon = useCallback(() => {
    if (!cidRef.current) return;
    if (queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    const body = buildBody(batch);
    try {
      const token = localStorage.getItem('token') || '';
      // sendBeacon 无法自定义 Authorization 头；用 query 形式或退化为 fetch keepalive
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      // 走 fetch keepalive，可携带 Authorization
      void fetch('/api/v1/competition/anti-cheat/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: blob,
        keepalive: true,
      });
    } catch {
      /* ignore */
    }
  }, [buildBody]);

  // ---- 事件采集副作用 ----
  useEffect(() => {
    if (!enabled || !competitionId) return;

    const nowStr = () => dayjs().format('YYYY-MM-DD HH:mm:ss');

    const handleHiddenStart = () => {
      if (hiddenStartRef.current != null) return;
      hiddenStartRef.current = Date.now();
    };

    const handleHiddenEnd = (eventType: 'PAGE_HIDDEN' | 'WINDOW_BLUR') => {
      const startTs = hiddenStartRef.current;
      if (startTs == null) return;
      const now = Date.now();
      // 与上一次 hidden 上报去重
      if (now - lastHiddenReportRef.current < HIDDEN_DEDUPE_MS) {
        hiddenStartRef.current = null;
        return;
      }
      const duration = Math.round((now - startTs) / 1000);
      hiddenStartRef.current = null;
      lastHiddenReportRef.current = now;

      enqueue({
        eventType,
        startedAt: dayjs(startTs).format('YYYY-MM-DD HH:mm:ss'),
        endedAt: nowStr(),
        durationSeconds: duration,
        detail: { path: window.location.pathname },
      });

      leaveCountRef.current += 1;
      if (onWarn) {
        if (leaveCountRef.current === 1) {
          onWarn('比赛中离开页面会被记录，请专注作答', 'info');
        } else if (leaveCountRef.current <= 3) {
          onWarn(`已离开页面 ${leaveCountRef.current} 次，请规范作答`, 'warning');
        } else {
          onWarn('多次离开页面，相关行为已被记录', 'critical');
        }
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        handleHiddenStart();
      } else if (document.visibilityState === 'visible') {
        handleHiddenEnd('PAGE_HIDDEN');
      }
    };
    const onBlur = () => {
      handleHiddenStart();
    };
    const onFocus = () => {
      handleHiddenEnd('WINDOW_BLUR');
    };
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        enqueue({
          eventType: 'FULLSCREEN_EXIT',
          startedAt: nowStr(),
          detail: { path: window.location.pathname },
        });
        if (onWarn) onWarn('已退出全屏，行为已被记录', 'warning');
      }
    };
    const onPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text') || '';
      const len = text.length;
      // 不上传内容，仅长度
      enqueue({
        eventType: 'PASTE_CODE',
        startedAt: nowStr(),
        detail: { length: len, path: window.location.pathname },
      });
      if (onWarn && len > 200) {
        onWarn('检测到大段粘贴，行为已被记录', 'warning');
      }
    };
    const onCopy = () => {
      enqueue({
        eventType: 'COPY_CODE',
        startedAt: nowStr(),
        detail: { path: window.location.pathname },
      });
    };
    const onContextMenu = () => {
      enqueue({
        eventType: 'CONTEXT_MENU',
        startedAt: nowStr(),
      });
    };
    const onPageHide = () => {
      // 关闭/刷新前的兜底
      flushBeacon();
    };

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('paste', onPaste, true);
    document.addEventListener('copy', onCopy, true);
    document.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    const timer = window.setInterval(() => {
      void flush();
    }, FLUSH_INTERVAL_MS);

    // 进入时立刻补上一次：如果已经处于 hidden 状态
    if (document.visibilityState === 'hidden') {
      handleHiddenStart();
    }

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('paste', onPaste, true);
      document.removeEventListener('copy', onCopy, true);
      document.removeEventListener('contextmenu', onContextMenu, true);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
      window.clearInterval(timer);
      // 卸载时尽力 flush 一次
      void flush();
    };
  }, [enabled, competitionId, enqueue, flush, flushBeacon, onWarn]);

  return {
    /** 页面可手动上报附加事件（例如自定义场景） */
    report: enqueue,
    /** 立即触发一次上报 */
    flush,
  };
}

export default useCompetitionAntiCheat;
