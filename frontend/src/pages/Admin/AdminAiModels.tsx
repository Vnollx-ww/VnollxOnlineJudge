import { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, InputNumber, Popconfirm, Upload } from 'antd';
import type { UploadProps } from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Bot, Upload as UploadIcon } from 'lucide-react';
import api from '@/utils/api';
import Select from '@/components/Select';
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

const AdminAiModels: React.FC = () => {
  const [list, setList] = useState<AiModelVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [form] = Form.useForm();

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
    form.resetFields();
    form.setFieldsValue({
      status: 1,
      proxyType: 'overseas',
      sortOrder: 0,
    });
    setModalVisible(true);
  };

  const handleEdit = async (row: AiModelVo) => {
    setEditingId(row.id);
    try {
      const res = await api.get(`/admin/ai-model/${row.id}`) as ApiResponse<AdminAiModelDetail>;
      if (res.code === 200 && res.data) {
        const d = res.data;
        form.setFieldsValue({
          name: d.name,
          logoUrl: d.logoUrl,
          sortOrder: d.sortOrder,
          status: d.status,
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

  const handleLogoUpload: UploadProps['customRequest'] = async (options) => {
    const { file, onSuccess, onError } = options;
    setLogoUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file as File);
      const res = await api.post('/user/upload/avatar?prefix=ai-model', formData) as ApiResponse<string>;
      if (res.code === 200 && res.data) {
        form.setFieldValue('logoUrl', res.data);
        toast.success('Logo 上传成功');
        onSuccess?.(res.data);
      } else {
        toast.error((res as any).msg || '上传失败');
        onError?.(new Error((res as any).msg));
      }
    } catch (e) {
      toast.error('上传失败');
      onError?.(e as Error);
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSubmit = async (values: Record<string, unknown>) => {
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
    <div className="space-y-6">
      <h2 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
        <Bot className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} />
        AI 模型管理
      </h2>

      <div className="gemini-card">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
            配置后可被用户在 AI 助手中选择使用
          </span>
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

        <Table<AiModelVo>
          rowKey="id"
          loading={loading}
          dataSource={list}
          columns={[
            {
              title: '排序',
              dataIndex: 'sortOrder',
              width: 72,
              align: 'center',
            },
            {
              title: '名称',
              dataIndex: 'name',
              render: (name, row) => (
                <span className="flex items-center gap-2">
                  {row.logoUrl ? (
                    <img src={row.logoUrl} alt="" className="w-6 h-6 rounded object-cover" />
                  ) : (
                    <Bot className="w-5 h-5 text-gray-400" />
                  )}
                  {name}
                </span>
              ),
            },
            {
              title: '操作',
              key: 'action',
              align: 'left',
              render: (_, row) => (
                <div className="flex gap-2 flex-wrap">
                  <PermissionGuard permission={PermissionCode.AI_CONFIG_UPDATE}>
                    <Button type="link" size="small" icon={<Edit className="w-3.5 h-3.5" />} onClick={() => handleEdit(row)}>
                      编辑
                    </Button>
                    <Popconfirm
                      title="确定删除该模型？"
                      onConfirm={() => handleDelete(row.id)}
                    >
                      <Button type="link" danger size="small" icon={<Trash2 className="w-3.5 h-3.5" />}>
                        删除
                      </Button>
                    </Popconfirm>
                  </PermissionGuard>
                </div>
              ),
            },
          ]}
          pagination={false}
        />
      </div>

      <Modal
        title={editingId ? '编辑模型' : '添加模型'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={560}
        centered
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="name" label="显示名称" rules={[{ required: true, message: '请输入显示名称' }]}>
            <Input placeholder="如：GPT-4" />
          </Form.Item>
          <Form.Item label="Logo 图片">
            <div className="flex gap-2 items-center flex-wrap">
              <Form.Item name="logoUrl" noStyle>
                <Input placeholder="输入地址或上传图片" className="flex-1 min-w-[200px]" />
              </Form.Item>
              <Upload
                showUploadList={false}
                accept="image/*"
                customRequest={handleLogoUpload}
                disabled={logoUploading}
              >
                <Button icon={<UploadIcon className="w-4 h-4" />} loading={logoUploading}>
                  上传
                </Button>
              </Upload>
            </div>
          </Form.Item>
          <Form.Item name="apiKey" label="API Key" rules={editingId ? [] : [{ required: true, message: '新建时请输入 API Key' }]}>
            <Input.Password placeholder={editingId ? '不修改请留空' : '必填'} />
          </Form.Item>
          <Form.Item name="sortOrder" label="排序(越小越靠前)">
            <InputNumber min={0} className="w-full" />
          </Form.Item>
          <Form.Item name="status" label="状态">
            <Select
              options={[
                { value: 1, label: '启用' },
                { value: 0, label: '禁用' },
              ]}
            />
          </Form.Item>
          <Form.Item name="proxyType" label="代理类型">
            <Select
              options={[
                { value: 'domestic', label: '国内代理' },
                { value: 'overseas', label: '国外代理' },
              ]}
              placeholder="国内模型选国内代理，国外模型选国外代理"
            />
          </Form.Item>
          <Form.Item className="mb-0 flex justify-end gap-2">
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
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminAiModels;
