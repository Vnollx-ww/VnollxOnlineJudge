import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminAiModelApi, userApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface AiModelVo {
  id: number;
  name: string;
  logoUrl?: string;
  sortOrder: number;
}

export interface AdminAiModelDetail {
  id: number;
  name: string;
  logoUrl?: string;
  sortOrder?: number;
  status?: number;
  proxyType?: string;
}

export interface AiModelFormValues {
  name: string;
  logoUrl: string;
  apiKey: string;
  sortOrder: number | string;
  status: number;
  proxyType: string;
}

export const defaultModelForm: AiModelFormValues = {
  name: '',
  logoUrl: '',
  apiKey: '',
  sortOrder: 0,
  status: 1,
  proxyType: 'overseas',
};

export const useAdminAiModels = () => {
  const [list, setList] = useState<AiModelVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modelForm, setModelForm] = useState<AiModelFormValues>(defaultModelForm);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<AiModelVo | null>(null);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = (await adminAiModelApi.list<AiModelVo[]>()) as ApiResponse<AiModelVo[]>;
      if (res.code === 200) setList(res.data ?? []);
      else toast.error((res as any).msg || '加载失败');
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
      const res = (await adminAiModelApi.detail<AdminAiModelDetail>(row.id)) as ApiResponse<AdminAiModelDetail>;
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
      const res = (await adminAiModelApi.delete(id)) as ApiResponse;
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
      const res = (await userApi.uploadAvatar<string>(formData, 'ai-model')) as ApiResponse<string>;
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
      const res = (await adminAiModelApi.save<number>(payload)) as ApiResponse<number>;
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

  return {
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
  };
};
