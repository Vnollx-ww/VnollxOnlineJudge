import { Bell, CheckCircle2, Trash2, Eye, RotateCw } from 'lucide-react';
import { Tag, Button, Empty, Spin } from '@/components';
import PagePagination from '@/components/page-pagination';
import dayjs from 'dayjs';
import Select from '@/components/select';
import Input from '@/components/input';
import { useNotifications, NOTIFICATIONS_PAGE_SIZE, type Notification } from '@/hooks/useNotifications';

const PAGE_SIZE = NOTIFICATIONS_PAGE_SIZE;

const Notifications: React.FC = () => {
  const {
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
  } = useNotifications();

  const renderStatusTag = (isRead: boolean) => (
    <Tag color={isRead ? 'success' : 'blue'}>
      {isRead ? '已读' : '未读'}
    </Tag>
  );

  const renderActions = (item: Notification) => [
    !item.is_read && (
      <Button
        type="link"
        icon={<CheckCircle2 className="w-4 h-4" />}
        onClick={() => handleMarkRead(item.id)}
        key="mark"
      >
        标记已读
      </Button>
    ),
    <Button
      type="link"
      icon={<Eye className="w-4 h-4" />}
      onClick={() => handleViewNotification(item)}
      key="view"
    >
      {item.title === '回复通知' && extractProblemId(item.description) ? '查看评论' : '查看详情'}
    </Button>,
    <Button
      type="link"
      danger
      icon={<Trash2 className="w-4 h-4" />}
      onClick={() => handleDelete(item.id)}
      key="delete"
    >
      删除
    </Button>,
  ];

  return (
    <div className="min-h-full w-full p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {modalContextHolder}
      {messageContextHolder}
      <div className="w-full">
        <div className="gemini-card">
          {/* Header - Gemini 风格 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="m-0 flex items-center gap-2 text-2xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                <Bell className="w-5 h-5" style={{ color: 'var(--gemini-accent-strong)' }} /> 通知列表
              </h2>
              <Tag color="blue">共 {total} 条</Tag>
            </div>
            <Button
              icon={<RotateCw className="w-4 h-4" />}
              onClick={() => loadNotifications(currentPage)}
            >
              刷新
            </Button>
          </div>

          {/* Toolbar - Gemini 风格 */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Input
              placeholder="搜索通知标题或内容"
              value={keyword}
              onChange={handleKeywordChange}
              allowClear
              className="!w-64 !rounded-full"
            />
            <Select
              placeholder="阅读状态"
              value={status ?? 'all'}
              onChange={handleStatusChange}
              className="!w-32"
              options={[
                { value: 'all', label: '全部' },
                { value: 'false', label: '未读' },
                { value: 'true', label: '已读' },
              ]}
            />
          </div>

          {/* List - Gemini 风格 */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Spin spinning />
            </div>
          ) : notifications.length === 0 ? (
            <Empty description={keyword || status ? '没有符合条件的通知' : '暂无通知'} />
          ) : (
            <div className="flex flex-col gap-2">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl px-4 py-3 flex items-start gap-4"
                  style={{
                    backgroundColor: item.is_read ? 'var(--gemini-bg)' : 'var(--gemini-surface-active)',
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>{item.title}</span>
                      {renderStatusTag(item.is_read)}
                    </div>
                    <p
                      className="m-0 line-clamp-2 leading-relaxed text-sm"
                      style={{ color: 'var(--gemini-text-tertiary)' }}
                    >
                      {item.description || '暂无内容'}
                    </p>
                  </div>
                  <div className="shrink-0 text-xs whitespace-nowrap" style={{ color: 'var(--gemini-text-tertiary)' }}>
                    {item.createTime
                      ? dayjs(item.createTime).format('YYYY-MM-DD HH:mm:ss')
                      : '--'}
                  </div>
                  <div className="shrink-0 flex items-center gap-1">
                    {renderActions(item).filter(Boolean)}
                  </div>
                </div>
              ))}
            </div>
          )}

          {total > PAGE_SIZE && (
            <PagePagination
              current={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showQuickJumper={false}
              unit="条通知"
              className="mt-6"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
