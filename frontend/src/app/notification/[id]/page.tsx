import { ArrowLeft, Bell, CheckCircle2, Trash2 } from 'lucide-react';
import { Spin, Tag, Button, Space } from '@/components';
import dayjs from 'dayjs';
import { useNotificationDetail } from '@/hooks/useNotificationDetail';

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
              <Spin spinning />
            </div>
          ) : (
            <>
              {/* Header - Gemini 风格 */}
              <div className="flex items-center justify-between mb-6">
                <Space size="middle">
                  <Button
                    icon={<ArrowLeft className="w-4 h-4" />}
                    onClick={() => navigate('/notifications')}
                  >
                    返回列表
                  </Button>
                  <h3 className="m-0 flex items-center gap-2 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                    <Bell className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} /> 通知详情
                  </h3>
                </Space>
                <Space>
                  <Button
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    disabled={notification?.is_read}
                    onClick={handleMarkRead}
                  >
                    标记已读
                  </Button>
                  <Button
                    danger
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDelete}
                  >
                    删除
                  </Button>
                </Space>
              </div>

              {notification && (
                <div>
                  <div className="mb-4 flex items-center gap-3">
                    <Tag color={notification.is_read ? 'success' : 'blue'}>
                      {notification.is_read ? '已读' : '未读'}
                    </Tag>
                    <span style={{ color: 'var(--gemini-text-tertiary)' }}>
                      创建于{' '}
                      {notification.createTime
                        ? dayjs(notification.createTime).format('YYYY-MM-DD HH:mm:ss')
                        : '--'}
                    </span>
                  </div>
                  <h4 className="mb-4 text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                    {notification.title}
                  </h4>
                  <p
                    className="leading-relaxed whitespace-pre-wrap"
                    style={{ color: 'var(--gemini-text-secondary)' }}
                  >
                    {notification.description || '暂无正文内容'}
                  </p>
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
