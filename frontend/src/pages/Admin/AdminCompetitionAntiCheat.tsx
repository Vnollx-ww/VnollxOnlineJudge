import { Drawer, Tag, Button, Modal, Empty, Field, DataTable, DataColumn } from '@/components';
import { Download, Eye, RefreshCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import dayjs from 'dayjs';
import Input from '@/components/input';
import Select from '@/components/select';
import {
  useAdminCompetitionAntiCheat,
  RISK_COLOR,
  RISK_LABEL,
  REVIEW_STATUS_LABEL,
  REVIEW_STATUS_COLOR,
  REVIEW_RESULT_LABEL,
  EVENT_TYPE_LABEL,
  formatSeconds,
  type AntiCheatSummary,
} from '@/hooks/useAdminCompetitionAntiCheat';

interface Props {
  open: boolean;
  competitionId: number | null;
  competitionTitle?: string;
  onClose: () => void;
}

const AdminCompetitionAntiCheat: React.FC<Props> = ({ open, competitionId, competitionTitle, onClose }) => {
  const {
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
    reviewModalOpen,
    setReviewModalOpen,
    reviewSubmitting,
    reviewTarget,
    reviewFormValues,
    loadAll,
    openUserDetail,
    openReviewModal,
    submitReview,
    updateReviewForm,
    quickReview,
    exportCsv,
  } = useAdminCompetitionAntiCheat(open, competitionId);

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
      <div className="flex h-[calc(100vh-120px)] min-h-0 flex-col overflow-hidden">
        <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="参与人数" value={stats.totalUsers ?? 0} />
          <StatCard label="可疑人数" value={stats.suspiciousUsers ?? 0} accent="orange" />
          <StatCard label="高风险" value={stats.highRiskUsers ?? 0} accent="red" />
          <StatCard label="待复核" value={stats.pendingReviewUsers ?? 0} accent="gold" />
          <StatCard label="事件总数" value={stats.totalEvents ?? 0} />
        </div>

        <div className="mt-4 flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-50 bg-gray-50/50 p-4">
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
          cell={(summary) => (
            <div className="flex items-center gap-1">
              <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => openUserDetail(summary.userId)} title="详情">
                <Eye size={16} />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-green-50 hover:text-green-600" onClick={() => quickReview(summary, 'REJECTED', 'NORMAL')} title="标记正常">
                <ShieldCheck size={16} />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => quickReview(summary, 'CONFIRMED', 'CHEATING')} title="确认作弊">
                <ShieldX size={16} />
              </button>
              <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => openReviewModal(summary)} title="自定义复核">
                <ShieldAlert size={16} />
              </button>
            </div>
          )}
        />
        </DataTable>
      </div>

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

