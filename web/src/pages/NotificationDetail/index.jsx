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
  Card,
  Modal,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './NotificationDetail.css';

const { Title, Text, Paragraph } = Typography;

const NotificationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notification, setNotification] = useState(null);
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
    <div className="notification-detail-container">
      {modalContextHolder}
      {messageContextHolder}
      <Card
        bordered={false}
        className="notification-detail-card"
        loading={loading}
      >
        <div className="notification-detail-header">
          <Space size="middle">
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/notifications')}
            >
              返回列表
            </Button>
            <Title level={3} className="detail-title">
              <BellOutlined /> 通知详情
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
          <div className="notification-detail-body">
            <Space size="middle" className="detail-status">
              <Tag color={notification.is_read ? 'success' : 'processing'}>
                {notification.is_read ? '已读' : '未读'}
              </Tag>
              <Text type="secondary">
                创建于{' '}
                {notification.createTime
                  ? dayjs(notification.createTime).format(
                      'YYYY-MM-DD HH:mm:ss',
                    )
                  : '--'}
              </Text>
            </Space>
            <Title level={4}>{notification.title}</Title>
            <Paragraph className="detail-description">
              {notification.description || '暂无正文内容'}
            </Paragraph>
          </div>
        )}
      </Card>
    </div>
  );
};

export default NotificationDetail;
