import { useState, useEffect } from 'react';
import { Button, Modal, InputNumber, FilePicker, Field, DataTable, DataColumn, ConfirmButton } from '@/components';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Bot, Upload as UploadIcon } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
import Input from '@/components/Input';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface AiModelVo {
  id: number;
  name: string;
  logoUrl?: string;
  sortOrder: number;
}

interface AdminAiModelDetail {
  id: number;
  name: string;
  logoUrl?: string;
  sortOrder?: number;
  status?: number;
  /** 代理类型: domestic-国内代理, overseas-国外代理 */
  proxyType?: string;
}

interface AiModelFormValues {
  name: string;
  logoUrl: string;
  apiKey: string;
  sortOrder: number | string;
  status: number;
  proxyType: string;
}

const defaultModelForm: AiModelFormValues = {
  name: '',
  logoUrl: '',
  apiKey: '',
  sortOrder: 0,
  status: 1,
  proxyType: 'overseas',
};

const AdminAiModels: React.FC = () => {
  const [list, setList] = useState<AiModelVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modelForm, setModelForm] = useState<AiModelFormValues>(defaultModelForm);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/ai-model/list') as ApiResponse<AiModelVo[]>;
      if (res.code === 200) {
        setList(res.data ?? []);
      } else {
        toast.error((res as any).msg || '加载失败');
      }
    } catch {
      toast.error('加载模型列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  const handleAdd = () => {
    setEditingId(null);
    setModelForm(defaultModelForm);
    setModalVisible(true);
  };

  const handleEdit = async (row: AiModelVo) => {
    setEditingId(row.id);
    try {
      const res = await api.get(`/admin/ai-model/${row.id}`) as ApiResponse<AdminAiModelDetail>;
      if (res.code === 200 && res.data) {
        const d = res.data;
        setModelForm({
          name: d.name,
          logoUrl: d.logoUrl || '',
          apiKey: '',
          sortOrder: d.sortOrder ?? 0,
          status: d.status ?? 1,
          proxyType: d.proxyType ?? 'overseas',
        });
        setModalVisible(true);
      } else {
        toast.error('获取模型详情失败');
      }
    } catch {
      toast.error('获取模型详情失败');
      setEditingId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await api.delete(`/admin/ai-model/${id}`) as ApiResponse;
      if (res.code === 200) {
        toast.success('删除成功');
        loadList();
      } else {
        toast.error((res as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleLogoUpload = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/user/upload/avatar?prefix=ai-model', formData) as ApiResponse<string>;
      if (res.code === 200 && res.data) {
        setModelForm((current) => ({ ...current, logoUrl: res.data }));
        toast.success('Logo 上传成功');
      } else {
        toast.error((res as any).msg || '上传失败');
      }
    } catch {
      toast.error('上传失败');
    } finally {
      setLogoUploading(false);
    }
  };

  const updateModelForm = <K extends keyof AiModelFormValues>(key: K, value: AiModelFormValues[K]) => {
    setModelForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (values: AiModelFormValues) => {
    try {
      const payload = {
        id: editingId ?? undefined,
        name: values.name,
        logoUrl: values.logoUrl || undefined,
        apiKey: values.apiKey || undefined,
        sortOrder: values.sortOrder ?? 0,
        status: values.status ?? 1,
        proxyType: values.proxyType ?? 'overseas',
      };
      const res = await api.post('/admin/ai-model/save', payload) as ApiResponse<number>;
      if (res.code === 200) {
        toast.success(editingId ? '更新成功' : '创建成功');
        setModalVisible(false);
        loadList();
      } else {
        toast.error((res as any).msg || '保存失败');
      }
    } catch {
      toast.error('保存失败');
    }
  };

  return (
    <div className="gemini-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>AI 模型管理</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>配置后可被用户在 AI 助手中选择使用</p>
        </div>
        <div className="flex gap-2">
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
      </div>

      {/* Table */}
      <DataTable<AiModelVo> rowKey="id" loading={loading} rows={list} pagination={false}>
        <DataColumn<AiModelVo> header="排序" width={72} cell={(model) => model.sortOrder} />
        <DataColumn<AiModelVo>
          header="名称"
          cell={(model) => (
            <span className="flex items-center gap-2">
              {model.logoUrl ? (
                <img src={model.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
              ) : (
                <Bot className="w-5 h-5 text-gray-400" />
              )}
              {model.name}
            </span>
          )}
        />
        <DataColumn<AiModelVo>
          header="操作"
          action
          cell={(model) => (
            <div className="flex gap-2 flex-wrap">
              <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
                <Button type="link" size="small" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => handleEdit(model)}>
                  编辑
                </Button>
                <ConfirmButton message="确定删除该模型？" onConfirm={() => handleDelete(model.id)}>
                  <Button type="link" danger size="small" icon={<Trash2 className="w-3.5 h-3.5" />}>
                    删除
                  </Button>
                </ConfirmButton>
              </PermissionGuard>
            </div>
          )}
        />
      </DataTable>

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
    </div>
  );
};

export default AdminAiModels;

