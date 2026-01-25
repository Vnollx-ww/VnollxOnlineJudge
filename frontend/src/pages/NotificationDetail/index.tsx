import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeftOutlined,
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Button,
  Modal,
  Space,
  Tag,
  Typography,
  message,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text, Paragraph } = Typography;

interface Notification {
  id: number;
  title: string;
  description?: string;
  is_read: boolean;
  createTime: string;
}

const NotificationDetail: React.FC = () => {
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
      const data = await api.get('/notification/info', { params: { nid: id } });
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
  }, [id, navigate, messageApi]);

  const handleMarkRead = async () => {
    if (!notification || notification.is_read) {
      messageApi.info('该通知已是已读状态');
      return;
    }
    try {
      await api.put(`/notification/read/${id}`);
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
          await api.delete(`/notification/delete/${id}`);
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

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {modalContextHolder}
      {messageContextHolder}
      <div className="max-w-3xl mx-auto">
        <div className="gemini-card">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* Header - Gemini 风格 */}
              <div className="flex items-center justify-between mb-6">
                <Space size="middle">
                  <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate('/notifications')}
                  >
                    返回列表
                  </Button>
                  <Title level={3} className="!mb-0 flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
                    <BellOutlined style={{ color: 'var(--gemini-accent-strong)' }} /> 通知详情
                  </Title>
                </Space>
                <Space>
                  <Button
                    icon={<CheckCircleOutlined />}
                    disabled={notification?.is_read}
                    onClick={handleMarkRead}
                  >
                    标记已读
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={handleDelete}
                  >
                    删除
                  </Button>
                </Space>
              </div>

              {notification && (
                <div>
                  <Space size="middle" className="mb-4">
                    <Tag 
                      color={notification.is_read ? 'success' : 'processing'}
                      className="!rounded-full !px-3"
                    >
                      {notification.is_read ? '已读' : '未读'}
                    </Tag>
                    <Text style={{ color: 'var(--gemini-text-tertiary)' }}>
                      创建于{' '}
                      {notification.createTime
                        ? dayjs(notification.createTime).format('YYYY-MM-DD HH:mm:ss')
                        : '--'}
                    </Text>
                  </Space>
                  <Title level={4} className="!mb-4" style={{ color: 'var(--gemini-text-primary)' }}>
                    {notification.title}
                  </Title>
                  <Paragraph 
                    className="leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    {notification.description || '暂无正文内容'}
                  </Paragraph>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationDetail;
