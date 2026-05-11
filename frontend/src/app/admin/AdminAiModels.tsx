import { Button, Modal, InputNumber, FilePicker, Field, Empty, Spin } from '@/components';
import { Plus, RefreshCw, Edit, Trash2, Bot, Upload as UploadIcon } from 'lucide-react';
import Select from '@/components/select';
import Input from '@/components/input';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import { useAdminAiModels } from '@/hooks/useAdminAiModels';

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
    handleLogoUpload,
    updateModelForm,
    handleSubmit,
  } = useAdminAiModels();

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
                <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
                  <div className="flex shrink-0 items-center gap-1">
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
                  </div>
                </PermissionGuard>
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

