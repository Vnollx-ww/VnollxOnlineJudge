import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Empty,
  List,
  Pagination,
  Space,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import Select from '../../components/select';
import Input from '../../components/input';
import { useNotifications, NOTIFICATIONS_PAGE_SIZE, type Notification } from '@/hooks/useNotifications';

const { Title, Text, Paragraph } = Typography;

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
    <Tag 
      color={isRead ? 'success' : 'processing'} 
      className="!rounded-full !px-3"
    >
      {isRead ? '已读' : '未读'}
    </Tag>
  );

  const renderActions = (item: Notification) => [
    !item.is_read && (
      <Button
        type="link"
        icon={<CheckCircleOutlined />}
        onClick={() => handleMarkRead(item.id)}
        key="mark"
      >
        标记已读
      </Button>
    ),
    <Button
      type="link"
      icon={<EyeOutlined />}
      onClick={() => handleViewNotification(item)}
      key="view"
    >
      {item.title === '回复通知' && extractProblemId(item.description) ? '查看评论' : '查看详情'}
    </Button>,
    <Button
      type="link"
      danger
      icon={<DeleteOutlined />}
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
            <Space size="large" align="center">
              <Title level={2} className="!mb-0 flex items-center gap-2" style={{ color: 'var(--gemini-text-primary)' }}>
                <BellOutlined style={{ color: 'var(--gemini-accent-strong)' }} /> 通知列表
              </Title>
              <Tag 
                className="!rounded-full !px-3"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                共 {total} 条
              </Tag>
            </Space>
            <Button
              icon={<ReloadOutlined />}
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
          <List
            loading={loading}
            dataSource={notifications}
            locale={{
              emptyText: (
                <Empty
                  description={
                    keyword || status ? '没有符合条件的通知' : '暂无通知'
                  }
                />
              ),
            }}
            renderItem={(item) => (
              <List.Item
                className="!rounded-2xl !px-4 !mb-2"
                style={{ 
                  backgroundColor: item.is_read ? 'var(--gemini-bg)' : 'var(--gemini-surface-active)'
                }}
                actions={renderActions(item)}
              >
                <List.Item.Meta
                  title={
                    <Space size="middle">
                      <Text strong style={{ color: 'var(--gemini-text-primary)' }}>{item.title}</Text>
                      {renderStatusTag(item.is_read)}
                    </Space>
                  }
                  description={
                    <Paragraph
                      className="!mb-0"
                      style={{ color: 'var(--gemini-text-tertiary)' }}
                      ellipsis={{ rows: 2 }}
                    >
                      {item.description || '暂无内容'}
                    </Paragraph>
                  }
                />
                <div>
                  <Text style={{ color: 'var(--gemini-text-tertiary)' }}>
                    {item.createTime
                      ? dayjs(item.createTime).format('YYYY-MM-DD HH:mm:ss')
                      : '--'}
                  </Text>
                </div>
              </List.Item>
            )}
          />

          {total > PAGE_SIZE && (
            <div className="mt-6 text-center">
              <Pagination
                current={currentPage}
                total={total}
                pageSize={PAGE_SIZE}
                onChange={handlePageChange}
                showTotal={(value) => `共 ${value} 条通知`}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
