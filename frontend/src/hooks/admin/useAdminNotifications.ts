import { useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { adminNotificationApi, adminUserApi } from '@/lib';
import type { ApiResponse } from '@/lib';

export interface TargetUser {
  id: number;
  name: string;
  email: string;
  identity?: string;
}

export interface SendForm {
  title: string;
  description: string;
}

export const defaultSendForm: SendForm = { title: '', description: '' };

export const useAdminNotifications = () => {
  const [sendForm, setSendForm] = useState<SendForm>(defaultSendForm);
  const [sending, setSending] = useState(false);
  const [userKeyword, setUserKeyword] = useState('');
  const [userLoading, setUserLoading] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<TargetUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<TargetUser[]>([]);
  const [sendMode, setSendMode] = useState<'all' | 'target'>('all');
  const [showUserPicker, setShowUserPicker] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateSendForm = useCallback((field: keyof SendForm, value: string) => {
    setSendForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setSendForm(defaultSendForm);
    setSelectedUsers([]);
    setSendMode('all');
    setUserKeyword('');
    setUserSearchResults([]);
  }, []);

  const searchUsers = useCallback(async (keyword: string) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(async () => {
      setUserLoading(true);
      try {
        const data = (await adminUserApi.list({
          pageNum: '1',
          pageSize: '20',
          ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
        })) as ApiResponse<TargetUser[]>;
        if (data.code === 200) {
          const list = data.data || [];
          const filtered = list.filter(
            (u) => !selectedUsers.some((s) => s.id === u.id)
          );
          setUserSearchResults(filtered);
        }
      } catch {
        toast.error('加载用户失败');
      } finally {
        setUserLoading(false);
      }
    }, 300);
  }, [selectedUsers]);

  const addUser = useCallback((user: TargetUser) => {
    setSelectedUsers((prev) => {
      if (prev.some((u) => u.id === user.id)) return prev;
      return [...prev, user];
    });
    setUserSearchResults((prev) => prev.filter((u) => u.id !== user.id));
  }, []);

  const removeUser = useCallback((id: number) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  }, []);

  const handleSend = useCallback(async () => {
    if (!sendForm.title.trim()) {
      toast.error('请输入通知标题');
      return;
    }
    if (!sendForm.description.trim()) {
      toast.error('请输入通知内容');
      return;
    }
    if (sendMode === 'target' && selectedUsers.length === 0) {
      toast.error('请至少选择一位目标用户');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, unknown> = {
        title: sendForm.title.trim(),
        description: sendForm.description.trim(),
      };
      if (sendMode === 'target' && selectedUsers.length > 0) {
        payload.targetUserIds = selectedUsers.map((u) => u.id);
      }
      const data = (await adminNotificationApi.send(payload)) as ApiResponse<unknown>;
      if (data.code === 200) {
        toast.success(
          sendMode === 'all'
            ? '通知已发送给所有用户'
            : `通知已发送给 ${selectedUsers.length} 位用户`
        );
        resetForm();
      } else {
        toast.error(data.msg || '发送失败');
      }
    } catch {
      toast.error('发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  }, [sendForm, sendMode, selectedUsers, resetForm]);

  return {
    sendForm,
    sending,
    userKeyword,
    userLoading,
    userSearchResults,
    selectedUsers,
    sendMode,
    showUserPicker,
    setShowUserPicker,
    updateSendForm,
    resetForm,
    setUserKeyword,
    searchUsers,
    addUser,
    removeUser,
    handleSend,
    setSendMode,
  };
};
