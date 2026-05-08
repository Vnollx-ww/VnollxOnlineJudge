import { useCallback, useEffect, useState } from 'react';
import { Drawer, Tag, Button, Modal, Tooltip, Empty, Field, DataTable, DataColumn } from '@/components';
import toast from 'react-hot-toast';
import { Download, Eye, RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import dayjs from 'dayjs';
import api from '@/utils/api';
import Input from '@/components/Input';
import Select from '@/components/Select';
import type { ApiResponse } from '@/types';

interface AntiCheatSummary {
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

interface AntiCheatEvent {
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

interface UserDetail {
  summary: AntiCheatSummary | null;
  events: AntiCheatEvent[];
}

interface Stats {
  totalUsers?: number;
  suspiciousUsers?: number;
  highRiskUsers?: number;
  pendingReviewUsers?: number;
  totalEvents?: number;
}

interface Props {
  open: boolean;
  competitionId: number | null;
  competitionTitle?: string;
  onClose: () => void;
}

interface ReviewFormValues {
  reviewStatus: string;
  reviewResult?: string;
  reviewNote: string;
}

const defaultReviewForm: ReviewFormValues = {
  reviewStatus: 'PENDING',
  reviewResult: undefined,
  reviewNote: '',
};

const RISK_COLOR: Record<string, string> = {
  LOW: 'default',
  MEDIUM: 'gold',
  HIGH: 'orange',
  CRITICAL: 'red',
};

const RISK_LABEL: Record<string, string> = {
  LOW: '低风险',
  MEDIUM: '中风险',
  HIGH: '高风险',
  CRITICAL: '严重风险',
};

const REVIEW_STATUS_LABEL: Record<string, string> = {
  PENDING: '待复核',
  CONFIRMED: '已确认',
  REJECTED: '已驳回',
  IGNORED: '已忽略',
};

const REVIEW_STATUS_COLOR: Record<string, string> = {
  PENDING: 'default',
  CONFIRMED: 'red',
  REJECTED: 'green',
  IGNORED: 'default',
};

const REVIEW_RESULT_LABEL: Record<string, string> = {
  NORMAL: '正常',
  WARNING: '警告',
  CHEATING: '作弊',
  NEED_MORE_EVIDENCE: '证据不足',
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  PAGE_HIDDEN: '切出页面',
  WINDOW_BLUR: '窗口失焦',
  FULLSCREEN_EXIT: '退出全屏',
  PASTE_CODE: '粘贴代码',
  COPY_CODE: '复制代码',
  CONTEXT_MENU: '右键菜单',
  SUBMIT_AFTER_LEAVE: '离开后提交',
};

const formatSeconds = (sec?: number) => {
  if (sec == null) return '-';
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s ? ' ' + s + 's' : ''}`;
};

const AdminCompetitionAntiCheat: React.FC<Props> = ({ open, competitionId, competitionTitle, onClose }) => {
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
        api.get(`/admin/competition/${competitionId}/anti-cheat/summaries`, {
          params: {
            keyword: keyword || undefined,
            riskLevel: riskLevel || undefined,
            reviewStatus: reviewStatus || undefined,
          },
        }) as Promise<ApiResponse<AntiCheatSummary[]>>,
        api.get(`/admin/competition/${competitionId}/anti-cheat/statistics`) as Promise<ApiResponse<Stats>>,
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
    if (open && competitionId) {
      void loadAll();
    } else {
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
      const data = await api.get(`/admin/competition/${competitionId}/anti-cheat/users/${uid}`) as ApiResponse<UserDetail>;
      if (data.code === 200) {
        setDetail(data.data);
      }
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
      const data = await api.put(
        `/admin/competition/${competitionId}/anti-cheat/users/${reviewTarget.userId}/review`,
        reviewFormValues,
      ) as ApiResponse;
      if (data.code === 200) {
        toast.success('复核已保存');
        setReviewModalOpen(false);
        setReviewTarget(null);
        await loadAll();
        if (activeUserId === reviewTarget.userId) {
          await openUserDetail(reviewTarget.userId);
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

  /** 一键标记 */
  const quickReview = async (record: AntiCheatSummary, status: string, result?: string) => {
    if (!competitionId) return;
    try {
      const data = await api.put(
        `/admin/competition/${competitionId}/anti-cheat/users/${record.userId}/review`,
        { reviewStatus: status, reviewResult: result },
      ) as ApiResponse;
      if (data.code === 200) {
        toast.success('已更新');
        await loadAll();
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
      const response = await api.get(`/admin/competition/${competitionId}/anti-cheat/export`, {
        params: {
          keyword: keyword || undefined,
          riskLevel: riskLevel || undefined,
          reviewStatus: reviewStatus || undefined,
        },
        responseType: 'blob',
      } as any) as any;
      const blob = response instanceof Blob ? response : response?.data;
      if (!blob) {
        toast.error('导出失败');
        return;
      }
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={Math.min(window.innerWidth - 80, 1280)}
      title={
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5" />
          <span>防作弊审查{competitionTitle ? ` · ${competitionTitle}` : ''}</span>
        </div>
      }
    >
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="参与人数" value={stats.totalUsers ?? 0} />
        <StatCard label="可疑人数" value={stats.suspiciousUsers ?? 0} accent="orange" />
        <StatCard label="高风险" value={stats.highRiskUsers ?? 0} accent="red" />
        <StatCard label="待复核" value={stats.pendingReviewUsers ?? 0} accent="gold" />
        <StatCard label="事件总数" value={stats.totalEvents ?? 0} />
      </div>

      {/* 工具栏 */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input.Search
          allowClear
          placeholder="按用户名搜索"
          className="w-56"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(v) => setKeyword(v)}
        />
        <Select
          placeholder="风险等级"
          allowClear
          className="w-36"
          value={riskLevel}
          options={[
            { label: '低风险', value: 'LOW' },
            { label: '中风险', value: 'MEDIUM' },
            { label: '高风险', value: 'HIGH' },
            { label: '严重风险', value: 'CRITICAL' },
          ]}
          onChange={(v) => setRiskLevel(v)}
        />
        <Select
          placeholder="复核状态"
          allowClear
          className="w-36"
          value={reviewStatus}
          options={[
            { label: '待复核', value: 'PENDING' },
            { label: '已确认', value: 'CONFIRMED' },
            { label: '已驳回', value: 'REJECTED' },
            { label: '已忽略', value: 'IGNORED' },
          ]}
          onChange={(v) => setReviewStatus(v)}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadAll}>刷新</Button>
        <Button icon={<Download className="w-4 h-4" />} loading={exporting} onClick={exportCsv}>导出 CSV</Button>
      </div>

      <DataTable<AntiCheatSummary>
        rowKey="id"
        size="small"
        loading={loading}
        rows={summaries}
        pagination={{ pageSize: 20, showSizeChanger: true }}
      >
        <DataColumn<AntiCheatSummary> header="排名" width={60} cell={(_, index) => index + 1} />
        <DataColumn<AntiCheatSummary> header="用户" width={160} cell={(summary) => <span className="block max-w-36 whitespace-nowrap overflow-hidden text-ellipsis">{summary.username || '-'}</span>} />
        <DataColumn<AntiCheatSummary> header="风险等级" width={110} cell={(summary) => <Tag color={RISK_COLOR[summary.riskLevel] || 'default'}>{RISK_LABEL[summary.riskLevel] || summary.riskLevel}</Tag>} />
        <DataColumn<AntiCheatSummary> header="总分" width={80} cell={(summary) => summary.totalScore ?? 0} />
        <DataColumn<AntiCheatSummary> header="事件数" width={80} cell={(summary) => summary.eventCount ?? 0} />
        <DataColumn<AntiCheatSummary> header="离开次数" width={90} cell={(summary) => summary.leaveCount ?? 0} />
        <DataColumn<AntiCheatSummary> header="离开总时长" width={110} cell={(summary) => formatSeconds(summary.leaveTotalSeconds)} />
        <DataColumn<AntiCheatSummary> header="退出全屏" width={90} cell={(summary) => summary.fullscreenExitCount ?? 0} />
        <DataColumn<AntiCheatSummary> header="粘贴次数" width={90} cell={(summary) => summary.pasteCount ?? 0} />
        <DataColumn<AntiCheatSummary> header="最近事件" width={170} cell={(summary) => summary.lastEventAt ? dayjs(summary.lastEventAt).format('MM-DD HH:mm:ss') : '-'} />
        <DataColumn<AntiCheatSummary> header="复核状态" width={100} cell={(summary) => <Tag color={REVIEW_STATUS_COLOR[summary.reviewStatus] || 'default'}>{REVIEW_STATUS_LABEL[summary.reviewStatus] || summary.reviewStatus}</Tag>} />
        <DataColumn<AntiCheatSummary>
          header="操作"
          width={280}
          action
          cell={(summary) => (
            <div className="flex gap-1">
              <Button type="link" size="small" icon={<Eye className="w-4 h-4" />} onClick={() => openUserDetail(summary.userId)}>
                详情
              </Button>
              <Tooltip title="标记正常">
                <Button type="link" size="small" icon={<ShieldCheck className="w-4 h-4" />} onClick={() => quickReview(summary, 'REJECTED', 'NORMAL')}>正常</Button>
              </Tooltip>
              <Tooltip title="确认作弊">
                <Button type="link" size="small" danger icon={<ShieldX className="w-4 h-4" />} onClick={() => quickReview(summary, 'CONFIRMED', 'CHEATING')}>作弊</Button>
              </Tooltip>
              <Tooltip title="自定义复核">
                <Button type="link" size="small" icon={<ShieldAlert className="w-4 h-4" />} onClick={() => openReviewModal(summary)}>复核</Button>
              </Tooltip>
            </div>
          )}
        />
      </DataTable>

      {/* 用户详情抽屉 */}
      <Drawer
        title="用户行为时间线"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={Math.min(window.innerWidth - 200, 720)}
      >
        {detailLoading ? (
          <div className="text-center py-10 text-gray-500">加载中...</div>
        ) : detail ? (
          <div className="space-y-4">
            {detail.summary ? (
              <div className="rounded-2xl border p-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{detail.summary.username}</div>
                  <Tag color={RISK_COLOR[detail.summary.riskLevel] || 'default'}>{RISK_LABEL[detail.summary.riskLevel] || detail.summary.riskLevel}</Tag>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mt-3">
                  <Info label="总分" value={String(detail.summary.totalScore ?? 0)} />
                  <Info label="事件数" value={String(detail.summary.eventCount ?? 0)} />
                  <Info label="离开次数" value={String(detail.summary.leaveCount ?? 0)} />
                  <Info label="离开总时长" value={formatSeconds(detail.summary.leaveTotalSeconds)} />
                  <Info label="退出全屏" value={String(detail.summary.fullscreenExitCount ?? 0)} />
                  <Info label="粘贴次数" value={String(detail.summary.pasteCount ?? 0)} />
                  <Info label="复核状态" value={REVIEW_STATUS_LABEL[detail.summary.reviewStatus] || detail.summary.reviewStatus} />
                  <Info label="复核结论" value={detail.summary.reviewResult ? (REVIEW_RESULT_LABEL[detail.summary.reviewResult] || detail.summary.reviewResult) : '-'} />
                </div>
                {detail.summary.reviewNote ? (
                  <div className="mt-2 text-sm text-gray-600">备注：{detail.summary.reviewNote}</div>
                ) : null}
                <div className="mt-3">
                  <Button size="small" onClick={() => openReviewModal(detail.summary!)}>更新复核</Button>
                </div>
              </div>
            ) : (
              <Empty description="暂无汇总" />
            )}

            <div className="rounded-2xl border p-4">
              <div className="font-semibold mb-2">事件时间线</div>
              {detail.events.length === 0 ? (
                <Empty description="暂无事件" />
              ) : (
                <ul className="space-y-2 max-h-[60vh] overflow-auto pr-1">
                  {detail.events.map((ev) => (
                    <li key={ev.id} className="border-l-2 pl-3 py-1" style={{ borderColor: '#e5e7eb' }}>
                      <div className="flex items-center gap-2 text-sm">
                        <Tag color={RISK_COLOR[ev.riskLevel] || 'default'}>{RISK_LABEL[ev.riskLevel] || ev.riskLevel}</Tag>
                        <span className="font-medium">{EVENT_TYPE_LABEL[ev.eventType] || ev.eventType}</span>
                        <span className="text-gray-400 text-xs">+{ev.riskScore}分</span>
                        <span className="text-gray-400 text-xs ml-auto">
                          {ev.createdAt ? dayjs(ev.createdAt).format('MM-DD HH:mm:ss') : ''}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {ev.durationSeconds != null ? `持续 ${formatSeconds(ev.durationSeconds)}` : null}
                        {ev.problemId ? ` · 题目 #${ev.problemId}` : ''}
                        {ev.submissionId ? ` · 提交 #${ev.submissionId}` : ''}
                        {ev.ipAddress ? ` · ${ev.ipAddress}` : ''}
                      </div>
                      {ev.detailJson ? (
                        <div className="text-[11px] text-gray-400 mt-1 break-all">{ev.detailJson}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : (
          <Empty description="暂无数据" />
        )}
      </Drawer>

      {/* 复核 Modal */}
      <Modal
        title={`复核 - ${reviewTarget?.username || ''}`}
        open={reviewModalOpen}
        onCancel={() => setReviewModalOpen(false)}
        footer={null}
        centered
      >
        <div className="space-y-4">
          <Field label="复核状态">
            <Select
              value={reviewFormValues.reviewStatus}
              onChange={(value) => updateReviewForm('reviewStatus', value)}
              options={[
                { label: '待复核', value: 'PENDING' },
                { label: '已确认（可疑/作弊）', value: 'CONFIRMED' },
                { label: '已驳回（认定正常）', value: 'REJECTED' },
                { label: '已忽略', value: 'IGNORED' },
              ]}
            />
          </Field>
          <Field label="复核结论">
            <Select
              allowClear
              value={reviewFormValues.reviewResult}
              onChange={(value) => updateReviewForm('reviewResult', value)}
              options={[
                { label: '正常', value: 'NORMAL' },
                { label: '警告', value: 'WARNING' },
                { label: '作弊', value: 'CHEATING' },
                { label: '证据不足', value: 'NEED_MORE_EVIDENCE' },
              ]}
            />
          </Field>
          <Field label="备注">
            <Input.TextArea value={reviewFormValues.reviewNote} onChange={(event) => updateReviewForm('reviewNote', event.target.value)} rows={4} maxLength={1000} placeholder="可填写复核理由、证据要点等" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setReviewModalOpen(false)}>取消</Button>
            <Button
              type="primary"
              loading={reviewSubmitting}
              onClick={submitReview}
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
            >
              保存
            </Button>
          </div>
        </div>
      </Modal>
    </Drawer>
  );
};

const StatCard: React.FC<{ label: string; value: number | string; accent?: 'red' | 'orange' | 'gold' }> = ({ label, value, accent }) => {
  const color = accent === 'red' ? '#d93025' : accent === 'orange' ? '#f9ab00' : accent === 'gold' ? '#b06a00' : '#1f1f1f';
  return (
    <div className="rounded-2xl border p-3 bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-xl font-semibold mt-1" style={{ color }}>{value}</div>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex items-center gap-2">
    <span className="text-gray-500">{label}:</span>
    <span className="font-medium">{value}</span>
  </div>
);

export default AdminCompetitionAntiCheat;

