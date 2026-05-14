import { useMemo } from 'react';
import { Button, Modal, InputNumber, FilePicker, Field, Empty, Spin } from '@/components';
import { Plus, RefreshCw, Edit, Trash2, Bot, Upload as UploadIcon, MessageSquare, Users, Clock3 } from 'lucide-react';
import Select from '@/components/ui/select';
import Input from '@/components/ui/input';
import PermissionGuard from '@/components/common/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useAdminAiModels, PROVIDER_OPTIONS } from '@/hooks/admin/useAdminAiModels';
import type { AdminAiModelRecordItem } from '@/hooks/admin/useAdminAiModels';

const formatTime = (value?: number) => {
  if (!value) return '暂无时间';
  return new Date(value).toLocaleString();
};

const previewText = (value?: string, fallback = '暂无内容') => {
  const text = (value || '').replace(/\s+/g, ' ').trim();
  if (!text) return fallback;
  return text.length > 72 ? `${text.slice(0, 72)}...` : text;
};

const Metric: React.FC<{ label: string; value: number | string }> = ({ label, value }) => (
  <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="mt-1 text-base font-semibold text-gray-900">{value}</div>
  </div>
);

const ConversationRecord: React.FC<{ record: AdminAiModelRecordItem }> = ({ record }) => (
  <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400">
      <span>#{record.id} · {formatTime(record.createTime)}</span>
      <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{record.status || 'unknown'}</span>
    </div>
    <div className="space-y-3">
      <div className="rounded-xl bg-blue-50/70 p-3">
        <div className="mb-1 text-xs font-semibold text-blue-700">用户提问</div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{record.userMessage || '暂无内容'}</div>
      </div>
      {record.thinkingContent && (
        <div className="rounded-xl bg-amber-50/70 p-3">
          <div className="mb-1 text-xs font-semibold text-amber-700">思考过程</div>
          <div className="max-h-40 overflow-auto whitespace-pre-wrap text-sm leading-6 text-gray-700">{record.thinkingContent}</div>
        </div>
      )}
      <div className="rounded-xl bg-gray-50 p-3">
        <div className="mb-1 text-xs font-semibold text-gray-700">模型回复</div>
        <div className="whitespace-pre-wrap text-sm leading-6 text-gray-800">{record.modelReply || record.errorMessage || '暂无回复'}</div>
      </div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
      <span>Token: {record.totalTokens ?? '-'}</span>
      <span>Prompt: {record.promptTokens ?? '-'}</span>
      <span>Completion: {record.completionTokens ?? '-'}</span>
      <span>耗时: {record.latencyMs != null ? `${record.latencyMs}ms` : '-'}</span>
    </div>
  </div>
);

const AdminAiModels: React.FC = () => {
  const {
    list,
    loading,
    modalVisible,
    setModalVisible,
    editingId,
    logoUploading,
    modelForm,
    deleteModalVisible,
    setDeleteModalVisible,
    modelToDelete,
    setModelToDelete,
    loadList,
    handleAdd,
    handleEdit,
    handleDelete,
    handleViewConversations,
    handleLogoUpload,
    updateModelForm,
    handleSubmit,
    conversationVisible,
    setConversationVisible,
    conversationLoading,
    conversationModel,
    conversationData,
    selectedUserId,
    setSelectedUserId,
    selectedSessionId,
    setSelectedSessionId,
  } = useAdminAiModels();

  const selectedUser = useMemo(
    () => conversationData?.users.find((user) => user.userId === selectedUserId) || null,
    [conversationData, selectedUserId],
  );
  const selectedSession = useMemo(
    () => selectedUser?.sessions.find((session) => session.sessionId === selectedSessionId) || selectedUser?.sessions[0] || null,
    [selectedUser, selectedSessionId],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-end gap-2 border-b border-gray-50 bg-gray-50/50 p-4">
          <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadList} loading={loading}>
            刷新
          </Button>
          <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
            <Button
              type="primary"
              icon={<Plus className="w-4 h-4" />}
              onClick={handleAdd}
              style={{
                backgroundColor: 'var(--gemini-accent)',
                color: 'var(--gemini-accent-text)',
                border: 'none',
              }}
            >
              添加模型
            </Button>
          </PermissionGuard>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-gray-400">
            <Spin spinning />
            <span>加载中...</span>
          </div>
        ) : list.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <Empty description="暂无模型数据" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((model) => (
              <div
                key={model.id}
                className="group relative flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                  {model.logoUrl ? (
                    <img src={model.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Bot className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-gray-900">{model.name}</div>
                  <div className="mt-0.5 text-xs text-gray-400">排序: {model.sortOrder}</div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-slate-100 hover:text-slate-700"
                    onClick={() => handleViewConversations(model)}
                    title="查看对话"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
                    <>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600"
                      onClick={() => handleEdit(model)}
                      title="编辑"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        setModelToDelete(model);
                        setDeleteModalVisible(true);
                      }}
                      title="删除"
                    >
                      <Trash2 size={16} />
                    </button>
                    </>
                  </PermissionGuard>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      <Modal
        title={editingId ? '编辑模型' : '添加模型'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={560}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(modelForm);
          }}
        >
          <Field label="显示名称">
            <Input value={modelForm.name} onChange={(event) => updateModelForm('name', event.target.value)} placeholder="如：GPT-4" />
          </Field>
          <Field label="Provider（适配器类型）">
            <Select
              value={modelForm.provider}
              onChange={(value) => updateModelForm('provider', value)}
              options={PROVIDER_OPTIONS}
              placeholder="选择适配器类型"
            />
          </Field>
          <Field label="Model Code（真实厂商模型名）">
            <Input
              value={modelForm.modelCode}
              onChange={(event) => updateModelForm('modelCode', event.target.value)}
              placeholder="如：mistral-large-latest、glm-4.7、qwen-plus"
            />
          </Field>
          <Field label="Base URL（上游 API 地址）">
            <Input
              value={modelForm.baseUrl}
              onChange={(event) => updateModelForm('baseUrl', event.target.value)}
              placeholder="如：https://api.mistral.ai/v1"
            />
          </Field>
          <Field label="Logo 图片">
            <div className="flex gap-2 items-center flex-wrap">
              <Input value={modelForm.logoUrl} onChange={(event) => updateModelForm('logoUrl', event.target.value)} placeholder="输入地址或上传图片" className="flex-1 min-w-[200px]" />
              <FilePicker
                accept="image/*"
                disabled={logoUploading}
                onFilesSelected={handleLogoUpload}
              >
                <Button icon={<UploadIcon className="w-4 h-4" />} loading={logoUploading}>
                  上传
                </Button>
              </FilePicker>
            </div>
          </Field>
          <Field label="API Key">
            <Input.Password value={modelForm.apiKey} onChange={(event) => updateModelForm('apiKey', event.target.value)} placeholder={editingId ? '不修改请留空' : '必填'} />
          </Field>
          <Field label="排序(越小越靠前)">
            <InputNumber min={0} className="w-full" value={modelForm.sortOrder} onChange={(event: React.ChangeEvent<HTMLInputElement>) => updateModelForm('sortOrder', event.target.value)} />
          </Field>
          <Field label="状态">
            <Select
              value={modelForm.status}
              onChange={(value) => updateModelForm('status', value)}
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '禁用' },
              ]}
            />
          </Field>
          <Field label="代理类型">
            <Select
              value={modelForm.proxyType}
              onChange={(value) => updateModelForm('proxyType', value)}
              options={[
                { value: 'domestic', label: '国内代理' },
                { value: 'overseas', label: '国外代理' },
              ]}
              placeholder="国内模型选国内代理，国外模型选国外代理"
            />
          </Field>
          <div className="mb-0">
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none',
                }}
              >
                保存
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        title={null}
        open={conversationVisible}
        onCancel={() => setConversationVisible(false)}
        footer={null}
        width={1180}
        centered
      >
        <div className="flex max-h-[78vh] min-h-[620px] flex-col overflow-hidden">
          <div className="border-b border-gray-100 px-1 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gray-100">
                  {conversationModel?.logoUrl ? (
                    <img src={conversationModel.logoUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Bot className="h-5 w-5 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold text-gray-900">{conversationModel?.name || '模型对话'}</div>
                  <div className="text-xs text-gray-500">按用户和会话整理该模型产生的所有问答记录</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Metric label="用户" value={conversationData?.userCount ?? 0} />
                <Metric label="会话" value={conversationData?.sessionCount ?? 0} />
                <Metric label="问答" value={conversationData?.recordCount ?? 0} />
              </div>
            </div>
          </div>

          {conversationLoading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 text-sm text-gray-400">
              <Spin spinning />
              <span>正在加载对话...</span>
            </div>
          ) : !conversationData || conversationData.recordCount === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <Empty description="该模型暂无对话记录" />
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[260px_300px_1fr] gap-4 overflow-hidden pt-4">
              <div className="min-h-0 overflow-auto rounded-2xl border border-gray-100 bg-gray-50/70 p-2">
                <div className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold text-gray-500">
                  <Users className="h-4 w-4" />
                  用户分组
                </div>
                <div className="space-y-2">
                  {conversationData.users.map((user) => (
                    <button
                      key={user.userId}
                      type="button"
                      onClick={() => {
                        setSelectedUserId(user.userId);
                        setSelectedSessionId(user.sessions[0]?.sessionId ?? null);
                      }}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedUserId === user.userId
                          ? 'border-slate-300 bg-white shadow-sm'
                          : 'border-transparent bg-transparent hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs font-semibold text-gray-600">
                          {user.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : user.userName?.slice(0, 1)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-gray-900">{user.userName}</div>
                          <div className="truncate text-xs text-gray-500">{user.email || `ID: ${user.userId}`}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                        <span>{user.sessionCount} 会话 / {user.recordCount} 问答</span>
                        <Clock3 className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-auto rounded-2xl border border-gray-100 bg-white p-2">
                <div className="mb-2 px-2 text-xs font-semibold text-gray-500">会话列表</div>
                <div className="space-y-2">
                  {selectedUser?.sessions.map((session) => (
                    <button
                      key={session.sessionId}
                      type="button"
                      onClick={() => setSelectedSessionId(session.sessionId)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        selectedSession?.sessionId === session.sessionId
                          ? 'border-slate-300 bg-slate-50'
                          : 'border-gray-100 hover:bg-gray-50'
                      }`}
                    >
                      <div className="line-clamp-2 text-sm font-semibold text-gray-900">{session.title || '未命名会话'}</div>
                      <div className="mt-2 text-xs text-gray-500">{session.recordCount} 条 · {formatTime(session.lastActiveAt)}</div>
                      <div className="mt-2 line-clamp-2 text-xs leading-5 text-gray-400">
                        {previewText(session.records[0]?.userMessage)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 overflow-auto rounded-2xl border border-gray-100 bg-gray-50/60 p-3">
                {selectedSession ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-4">
                      <div className="text-sm font-semibold text-gray-900">{selectedSession.title || '未命名会话'}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {selectedUser?.userName} · {selectedSession.recordCount} 条问答 · 最近 {formatTime(selectedSession.lastActiveAt)}
                      </div>
                    </div>
                    {selectedSession.records.map((record) => (
                      <ConversationRecord key={record.id} record={record} />
                    ))}
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <Empty description="请选择一个会话" />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* 删除模型确认弹窗 */}
      <Modal
        title="确认删除"
        open={deleteModalVisible}
        centered
        onCancel={() => { setDeleteModalVisible(false); setModelToDelete(null); }}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          确定要删除模型 <strong>{modelToDelete?.name}</strong> 吗？
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => { setDeleteModalVisible(false); setModelToDelete(null); }}>取消</Button>
          <Button type="primary" danger onClick={() => { if (modelToDelete) { handleDelete(modelToDelete.id); } setDeleteModalVisible(false); setModelToDelete(null); }}>确定</Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminAiModels;

