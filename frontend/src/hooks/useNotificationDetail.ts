import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Modal, message } from 'antd';
import { notificationApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';

export interface Notification {
  id: number;
  title: string;
  description?: string;
  is_read: boolean;
  createTime: string;
}

export const useNotificationDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [loading, setLoading] = useState(false);
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const dispatchNotificationUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('notification-updated'));
    }
  };

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await notificationApi.info<Notification>(id);
      if (data.code === 200) {
        setNotification(data.data);
        dispatchNotificationUpdate();
      } else {
        messageApi.error(data.msg || '加载通知详情失败');
      }
    } catch (error) {
      console.error(error);
      messageApi.error('加载通知详情失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated()) {
      messageApi.error('请先登录！');
      navigate('/login');
      return;
    }
    loadDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate, messageApi]);

  const handleMarkRead = async () => {
    if (!notification || notification.is_read) {
      messageApi.info('该通知已是已读状态');
      return;
    }
    try {
      await notificationApi.read(id!);
      messageApi.success('已标记为已读');
      dispatchNotificationUpdate();
      loadDetail();
    } catch (error) {
      console.error(error);
      messageApi.error('操作失败，请稍后重试');
    }
  };

  const handleDelete = () => {
    modal.confirm({
      title: '确认删除该通知？',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await notificationApi.delete(id!);
          messageApi.success('删除成功');
          dispatchNotificationUpdate();
          navigate('/notifications');
        } catch (error) {
          console.error(error);
          messageApi.error('删除失败，请稍后重试');
        }
      },
    });
  };

  return {
    navigate,
    notification,
    loading,
    modalContextHolder,
    messageContextHolder,
    handleMarkRead,
    handleDelete,
  };
};
