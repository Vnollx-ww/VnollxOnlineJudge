import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAntiCheatApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface AntiCheatSummary {
  id: number;
  userId: number;
  username: string;
  totalScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  eventCount: number;
  leaveCount: number;
  leaveTotalSeconds: number;
  fullscreenExitCount: number;
  pasteCount: number;
  lastEventAt?: string;
  reviewStatus: 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'IGNORED' | string;
  reviewResult?: string;
  reviewNote?: string;
  reviewedAt?: string;
}

export interface AntiCheatEvent {
  id: number;
  problemId?: number | null;
  userId: number;
  username?: string;
  eventType: string;
  riskLevel: string;
  riskScore: number;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  submissionId?: number | null;
  detailJson?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: string;
}

export interface UserDetail {
  summary: AntiCheatSummary | null;
  events: AntiCheatEvent[];
}

export interface Stats {
  totalUsers?: number;
  suspiciousUsers?: number;
  highRiskUsers?: number;
  pendingReviewUsers?: number;
  totalEvents?: number;
}

export interface ReviewFormValues {
  reviewStatus: string;
  reviewResult?: string;
  reviewNote: string;
}

export const defaultReviewForm: ReviewFormValues = {
  reviewStatus: 'PENDING',
  reviewResult: undefined,
  reviewNote: '',
};

export const RISK_COLOR: Record<string, string> = { LOW: 'default', MEDIUM: 'gold', HIGH: 'orange', CRITICAL: 'red' };
export const RISK_LABEL: Record<string, string> = { LOW: '低风险', MEDIUM: '中风险', HIGH: '高风险', CRITICAL: '严重风险' };
export const REVIEW_STATUS_LABEL: Record<string, string> = { PENDING: '待复核', CONFIRMED: '已确认', REJECTED: '已驳回', IGNORED: '已忽略' };
export const REVIEW_STATUS_COLOR: Record<string, string> = { PENDING: 'default', CONFIRMED: 'red', REJECTED: 'green', IGNORED: 'default' };
export const REVIEW_RESULT_LABEL: Record<string, string> = { NORMAL: '正常', WARNING: '警告', CHEATING: '作弊', NEED_MORE_EVIDENCE: '证据不足' };
export const EVENT_TYPE_LABEL: Record<string, string> = {
  PAGE_HIDDEN: '切出页面',
  WINDOW_BLUR: '窗口失焦',
  FULLSCREEN_EXIT: '退出全屏',
  PASTE_CODE: '粘贴代码',
  COPY_CODE: '复制代码',
  CONTEXT_MENU: '右键菜单',
  SUBMIT_AFTER_LEAVE: '离开后提交',
};

export const formatSeconds = (sec?: number) => {
  if (sec == null) return '-';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s ? ' ' + s + 's' : ''}`;
};

export const useAdminCompetitionAntiCheat = (
  open: boolean,
  competitionId: number | null,
) => {
  const [loading, setLoading] = useState(false);
  const [summaries, setSummaries] = useState<AntiCheatSummary[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [keyword, setKeyword] = useState('');
  const [riskLevel, setRiskLevel] = useState<string | undefined>(undefined);
  const [reviewStatus, setReviewStatus] = useState<string | undefined>(undefined);
  const [exporting, setExporting] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [activeUserId, setActiveUserId] = useState<number | null>(null);

  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<AntiCheatSummary | null>(null);
  const [reviewFormValues, setReviewFormValues] = useState<ReviewFormValues>(defaultReviewForm);

  const loadAll = useCallback(async () => {
    if (!competitionId) return;
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        adminAntiCheatApi.summaries<AntiCheatSummary[]>(competitionId, {
          keyword: keyword || undefined,
          riskLevel: riskLevel || undefined,
          reviewStatus: reviewStatus || undefined,
        }) as Promise<ApiResponse<AntiCheatSummary[]>>,
        adminAntiCheatApi.statistics<Stats>(competitionId) as Promise<ApiResponse<Stats>>,
      ]);
      if (listRes.code === 200) setSummaries(listRes.data || []);
      if (statsRes.code === 200) setStats(statsRes.data || {});
    } catch {
      toast.error('加载防作弊数据失败');
    } finally {
      setLoading(false);
    }
  }, [competitionId, keyword, riskLevel, reviewStatus]);

  useEffect(() => {
    if (open && competitionId) void loadAll();
    else {
      setSummaries([]);
      setStats({});
      setDetail(null);
      setDetailOpen(false);
      setActiveUserId(null);
    }
  }, [open, competitionId, loadAll]);

  const openUserDetail = async (uid: number) => {
    if (!competitionId) return;
    setActiveUserId(uid);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const data = (await adminAntiCheatApi.userDetail<UserDetail>(competitionId, uid)) as ApiResponse<UserDetail>;
      if (data.code === 200) setDetail(data.data);
    } catch {
      toast.error('加载用户详情失败');
    } finally {
      setDetailLoading(false);
    }
  };

  const openReviewModal = (record: AntiCheatSummary) => {
    setReviewTarget(record);
    setReviewFormValues({
      reviewStatus: record.reviewStatus || 'PENDING',
      reviewResult: record.reviewResult || undefined,
      reviewNote: record.reviewNote || '',
    });
    setReviewModalOpen(true);
  };

  const submitReview = async () => {
    if (!competitionId || !reviewTarget) return;
    try {
      setReviewSubmitting(true);
      const data = (await adminAntiCheatApi.review<UserDetail>(competitionId, reviewTarget.userId, { ...reviewFormValues })) as ApiResponse<UserDetail>;
      if (data.code === 200) {
        toast.success('复核已保存');
        setReviewModalOpen(false);
        setReviewTarget(null);
        if (data.data) {
          setDetail((current) => (activeUserId === reviewTarget.userId ? data.data! : current));
          if (data.data.summary) {
            setSummaries((current) => current.map((item) => (
              item.userId === reviewTarget.userId ? data.data!.summary! : item
            )));
          }
        } else {
          const nextSummary = { ...reviewTarget, ...reviewFormValues };
          setSummaries((current) => current.map((item) => (item.userId === reviewTarget.userId ? nextSummary : item)));
          if (activeUserId === reviewTarget.userId) {
            setDetail((current) => current ? { ...current, summary: nextSummary } : current);
          }
        }
      } else {
        toast.error((data as any).msg || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const updateReviewForm = <K extends keyof ReviewFormValues>(key: K, value: ReviewFormValues[K]) => {
    setReviewFormValues((current) => ({ ...current, [key]: value }));
  };

  const quickReview = async (record: AntiCheatSummary, status: string, result?: string) => {
    if (!competitionId) return;
    try {
      const data = (await adminAntiCheatApi.review<UserDetail>(competitionId, record.userId, { reviewStatus: status, reviewResult: result })) as ApiResponse<UserDetail>;
      if (data.code === 200) {
        toast.success('已更新');
        if (data.data?.summary) {
          setSummaries((current) => current.map((item) => (item.userId === record.userId ? data.data!.summary! : item)));
          setDetail((current) => (activeUserId === record.userId ? data.data! : current));
        } else {
          const nextSummary = { ...record, reviewStatus: status, reviewResult: result };
          setSummaries((current) => current.map((item) => (item.userId === record.userId ? nextSummary : item)));
          if (activeUserId === record.userId) {
            setDetail((current) => current ? { ...current, summary: nextSummary } : current);
          }
        }
      } else {
        toast.error((data as any).msg || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const exportCsv = async () => {
    if (!competitionId) return;
    setExporting(true);
    try {
      const response = (await adminAntiCheatApi.export<Blob>(competitionId, {
        keyword: keyword || undefined,
        riskLevel: riskLevel || undefined,
        reviewStatus: reviewStatus || undefined,
      })) as ApiResponse<Blob>;
      const blob = response instanceof Blob ? response : (response as any)?.data;
      if (!blob) { toast.error('导出失败'); return; }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `competition-${competitionId}-anti-cheat.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch {
      toast.error('导出失败');
    } finally {
      setExporting(false);
    }
  };

  return {
    loading,
    summaries,
    stats,
    keyword,
    setKeyword,
    riskLevel,
    setRiskLevel,
    reviewStatus,
    setReviewStatus,
    exporting,
    detailOpen,
    setDetailOpen,
    detailLoading,
    detail,
    activeUserId,
    reviewModalOpen,
    setReviewModalOpen,
    reviewSubmitting,
    reviewTarget,
    setReviewTarget,
    reviewFormValues,
    loadAll,
    openUserDetail,
    openReviewModal,
    submitReview,
    updateReviewForm,
    quickReview,
    exportCsv,
  };
};
