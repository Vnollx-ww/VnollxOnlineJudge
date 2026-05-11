import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { confirm } from '@/components';
import { notificationApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

export const NOTIFICATIONS_PAGE_SIZE = 10;

export interface Notification {
  id: number;
  title: string;
  description?: string;
  is_read: boolean;
  createTime: string;
  commentId?: number;
}

export const useNotifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const modalContextHolder = null;
  const messageApi = {
    success: (msg: string) => toast.success(msg),
    error: (msg: string) => toast.error(msg),
    warning: (msg: string) => toast(msg, { icon: '⚠️' }),
    info: (msg: string) => toast(msg),
  };
  const messageContextHolder = null;

  const loadNotificationsRef = useRef<((page?: number, overrides?: Record<string, any>) => Promise<void>) | null>(null);

  const dispatchNotificationUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('notification-updated'));
    }
  };

  const buildParams = (page: number, overrides: Record<string, any> = {}) => {
    const effectiveKeyword = overrides.keyword !== undefined ? overrides.keyword : keyword;
    const effectiveStatus = overrides.status !== undefined ? overrides.status : status;
    const params: Record<string, string> = {
      pageNum: String(page),
      pageSize: String(NOTIFICATIONS_PAGE_SIZE),
    };
    if (effectiveKeyword?.trim()) params.keyword = effectiveKeyword.trim();
    if (effectiveStatus) params.status = effectiveStatus;
    return { params, effectiveKeyword, effectiveStatus };
  };

  const loadNotifications = async (page = 1, overrides: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { params, effectiveKeyword, effectiveStatus } = buildParams(page, overrides);
      const data = await notificationApi.list<Notification[]>(params);
      if (data.code === 200) {
        setNotifications(data.data || []);
        setCurrentPage(page);
      } else {
        messageApi.error(data.msg || '加载通知失败');
      }
      const countParams: Record<string, string> = {};
      if (effectiveKeyword?.trim()) countParams.keyword = effectiveKeyword.trim();
      if (effectiveStatus) countParams.status = effectiveStatus;
      const countData = await notificationApi.count(countParams);
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error) {
      console.error(error);
      messageApi.error('加载通知失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  loadNotificationsRef.current = loadNotifications;

  useEffect(() => {
    if (!isAuthenticated()) {
      messageApi.error('请先登录！');
      navigate('/login');
      return;
    }
    loadNotificationsRef.current?.(1);
  }, [navigate, messageApi]);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      loadNotifications(1, { keyword: value });
    }, 500);
  };

  const handleStatusChange = (value: string) => {
    const newStatus = value === 'all' ? undefined : value;
    setStatus(newStatus);
    loadNotifications(1, { status: newStatus });
  };

  const handlePageChange = (page: number) => loadNotifications(page);

  const handleMarkRead = async (id: number) => {
    try {
      await notificationApi.read(id);
      messageApi.success('已标记为已读');
      dispatchNotificationUpdate();
      loadNotifications(currentPage);
    } catch (error) {
      console.error(error);
      messageApi.error('操作失败，请稍后重试');
    }
  };

  const handleDelete = (id: number) => {
    confirm({
      title: '确认删除该通知？',
      content: '删除后无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await notificationApi.delete(id);
          messageApi.success('删除成功');
          dispatchNotificationUpdate();
          const nextPage = notifications.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
          loadNotifications(nextPage);
        } catch (error) {
          console.error(error);
          messageApi.error('删除失败，请稍后重试');
        }
      },
    });
  };

  const extractProblemId = (description?: string): string | null => {
    const match = description?.match(/在问题 #(\d+) 中回复了你/);
    return match ? match[1] : null;
  };

  const handleViewNotification = async (item: Notification) => {
    const problemId = extractProblemId(item.description);
    if (item.title === '回复通知' && problemId && item.commentId) {
      if (!item.is_read) {
        try {
          await notificationApi.read(item.id);
          dispatchNotificationUpdate();
        } catch (error) {
          console.error('标记已读失败:', error);
        }
      }
      navigate(`/problem/${problemId}?commentId=${item.commentId}`);
    } else {
      navigate(`/notification/${item.id}`);
    }
  };

  return {
    notifications,
    loading,
    status,
    keyword,
    total,
    currentPage,
    modalContextHolder,
    messageContextHolder,
    loadNotifications,
    handleKeywordChange,
    handleStatusChange,
    handlePageChange,
    handleMarkRead,
    handleDelete,
    handleViewNotification,
    extractProblemId,
  };
};
