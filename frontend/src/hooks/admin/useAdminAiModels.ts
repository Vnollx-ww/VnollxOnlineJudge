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

export interface AdminAiModelRecordItem {
  id: number;
  userMessage?: string;
  modelReply?: string;
  thinkingContent?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  latencyMs?: number;
  status?: string;
  errorMessage?: string;
  createTime?: number;
  replyTime?: number;
}

export interface AdminAiModelSessionGroup {
  sessionId: string;
  title: string;
  recordCount: number;
  lastActiveAt?: number;
  records: AdminAiModelRecordItem[];
}

export interface AdminAiModelUserGroup {
  userId: number;
  userName: string;
  email?: string;
  avatar?: string;
  sessionCount: number;
  recordCount: number;
  lastActiveAt?: number;
  sessions: AdminAiModelSessionGroup[];
}

export interface AdminAiModelConversationData {
  modelId: number;
  userCount: number;
  sessionCount: number;
  recordCount: number;
  users: AdminAiModelUserGroup[];
}

export interface AdminAiModelDetail {
  id: number;
  name: string;
  provider?: string;
  modelCode?: string;
  baseUrl?: string;
  logoUrl?: string;
  sortOrder?: number;
  status?: number;
  proxyType?: string;
}

export interface AiModelFormValues {
  name: string;
  provider: string;
  modelCode: string;
  baseUrl: string;
  logoUrl: string;
  apiKey: string;
  sortOrder: number | string;
  status: number;
  proxyType: string;
}

export const defaultModelForm: AiModelFormValues = {
  name: '',
  provider: 'openai_compatible',
  modelCode: '',
  baseUrl: '',
  logoUrl: '',
  apiKey: '',
  sortOrder: 0,
  status: 1,
  proxyType: 'overseas',
};

export const PROVIDER_OPTIONS: { value: string; label: string }[] = [
  { value: 'openai_compatible', label: 'OpenAI 兼容 (openai_compatible)' },
  { value: 'gemini', label: 'Gemini (gemini)' },
];

export const useAdminAiModels = () => {
  const [list, setList] = useState<AiModelVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [modelForm, setModelForm] = useState<AiModelFormValues>(defaultModelForm);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<AiModelVo | null>(null);
  const [conversationVisible, setConversationVisible] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [conversationModel, setConversationModel] = useState<AiModelVo | null>(null);
  const [conversationData, setConversationData] = useState<AdminAiModelConversationData | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
          provider: d.provider || 'openai_compatible',
          modelCode: d.modelCode || '',
          baseUrl: d.baseUrl || '',
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
        setList((current) => current.filter((item) => item.id !== id));
      } else {
        toast.error((res as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除失败');
    }
  };

  const handleViewConversations = async (model: AiModelVo) => {
    setConversationModel(model);
    setConversationVisible(true);
    setConversationLoading(true);
    setConversationData(null);
    setSelectedUserId(null);
    setSelectedSessionId(null);
    try {
      const res = (await adminAiModelApi.conversations<AdminAiModelConversationData>(model.id)) as ApiResponse<AdminAiModelConversationData>;
      if (res.code === 200 && res.data) {
        setConversationData(res.data);
        const firstUser = res.data.users?.[0];
        const firstSession = firstUser?.sessions?.[0];
        setSelectedUserId(firstUser?.userId ?? null);
        setSelectedSessionId(firstSession?.sessionId ?? null);
      } else {
        toast.error((res as any).msg || '加载模型对话失败');
      }
    } catch {
      toast.error('加载模型对话失败');
    } finally {
      setConversationLoading(false);
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
    if (!values.name?.trim()) {
      toast.error('请填写显示名称');
      return;
    }
    if (!values.provider?.trim()) {
      toast.error('请选择 provider');
      return;
    }
    if (!values.modelCode?.trim()) {
      toast.error('请填写 Model Code（真实厂商模型名）');
      return;
    }
    if (values.provider === 'openai_compatible' && !values.baseUrl?.trim()) {
      toast.error('openai_compatible 需要填写 Base URL');
      return;
    }
    try {
      const payload = {
        id: editingId ?? undefined,
        name: values.name.trim(),
        provider: values.provider.trim(),
        modelCode: values.modelCode.trim(),
        baseUrl: values.baseUrl?.trim() || undefined,
        logoUrl: values.logoUrl || undefined,
        apiKey: values.apiKey || undefined,
        sortOrder: values.sortOrder ?? 0,
        status: values.status ?? 1,
        proxyType: values.proxyType ?? 'overseas',
      };
      const res = (await adminAiModelApi.save<AiModelVo>(payload)) as ApiResponse<AiModelVo>;
      if (res.code === 200) {
        toast.success(editingId ? '更新成功' : '创建成功');
        setModalVisible(false);
        if (res.data) {
          if (editingId) {
            setList((current) => current.map((item) => (item.id === res.data!.id ? res.data! : item)));
          } else {
            setList((current) => [res.data!, ...current]);
          }
        }
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
    conversationVisible,
    setConversationVisible,
    conversationLoading,
    conversationModel,
    conversationData,
    selectedUserId,
    setSelectedUserId,
    selectedSessionId,
    setSelectedSessionId,
    loadList,
    handleAdd,
    handleEdit,
    handleDelete,
    handleViewConversations,
    handleLogoUpload,
    updateModelForm,
    handleSubmit,
  };
};
