import {
  ArrowLeftOutlined,
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Button,
  Space,
  Tag,
  Typography,
  Spin,
} from 'antd';
import dayjs from 'dayjs';
import { useNotificationDetail } from '@/hooks/useNotificationDetail';

const { Title, Text, Paragraph } = Typography;

const NotificationDetail: React.FC = () => {
  const {
    navigate,
    notification,
    loading,
    modalContextHolder,
    messageContextHolder,
    handleMarkRead,
    handleDelete,
  } = useNotificationDetail();

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {modalContextHolder}
      {messageContextHolder}
      <div className="w-full">
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
