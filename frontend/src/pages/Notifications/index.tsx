import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Input,
  List,
  Modal,
  Pagination,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PAGE_SIZE = 10;

interface Notification {
  id: number;
  title: string;
  description?: string;
  is_read: boolean;
  createTime: string;
  commentId?: number;
}

const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [modal, modalContextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

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
      pageSize: String(PAGE_SIZE),
    };

    if (effectiveKeyword?.trim()) {
      params.keyword = effectiveKeyword.trim();
    }
    if (effectiveStatus) {
      params.status = effectiveStatus;
    }
    return { params, effectiveKeyword, effectiveStatus };
  };

  const loadNotifications = async (page = 1, overrides: Record<string, any> = {}) => {
    setLoading(true);
    try {
      const { params, effectiveKeyword, effectiveStatus } = buildParams(page, overrides);
      const data = await api.get('/notification/list', { params });
      if (data.code === 200) {
        setNotifications(data.data || []);
        setCurrentPage(page);
      } else {
        messageApi.error(data.msg || '加载通知失败');
      }

      const countParams: Record<string, string> = {};
      if (effectiveKeyword?.trim()) {
        countParams.keyword = effectiveKeyword.trim();
      }
      if (effectiveStatus) {
        countParams.status = effectiveStatus;
      }
      const countData = await api.get('/notification/count', { params: countParams });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
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

  // 防抖定时器
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 关键字变化时自动搜索（防抖）
  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setKeyword(value);
    
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      loadNotifications(1, { keyword: value });
    }, 500);
  };

  const handleStatusChange = (value: string) => {
    // 如果选择"全部"，则清除状态筛选
    const newStatus = value === 'all' ? undefined : value;
    setStatus(newStatus);
    loadNotifications(1, { status: newStatus });
  };

  const handlePageChange = (page: number) => loadNotifications(page);

  const handleMarkRead = async (id: number) => {
    try {
      await api.put(`/notification/read/${id}`);
      messageApi.success('已标记为已读');
      dispatchNotificationUpdate();
      loadNotifications(currentPage);
    } catch (error) {
      console.error(error);
      messageApi.error('操作失败，请稍后重试');
    }
  };

  const handleDelete = (id: number) => {
    modal.confirm({
      title: '确认删除该通知？',
      content: '删除后无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await api.delete(`/notification/delete/${id}`);
          messageApi.success('删除成功');
          dispatchNotificationUpdate();
          const nextPage =
            notifications.length === 1 && currentPage > 1
              ? currentPage - 1
              : currentPage;
          loadNotifications(nextPage);
        } catch (error) {
          console.error(error);
          messageApi.error('删除失败，请稍后重试');
        }
      },
    });
  };

  const renderStatusTag = (isRead: boolean) => (
    <Tag 
      color={isRead ? 'success' : 'processing'} 
      className="!rounded-full !px-3"
    >
      {isRead ? '已读' : '未读'}
    </Tag>
  );

  // 从通知描述中提取题目ID，格式如："xxx 在问题 #2 中回复了你：..."
  const extractProblemId = (description?: string): string | null => {
    const match = description?.match(/在问题 #(\d+) 中回复了你/);
    return match ? match[1] : null;
  };

  const handleViewNotification = async (item: Notification) => {
    const problemId = extractProblemId(item.description);
    // 如果是回复通知且能提取到 problemId 和有 commentId，跳转到题目页面并定位到评论
    if (item.title === '回复通知' && problemId && item.commentId) {
      // 标记为已读
      if (!item.is_read) {
        try {
          await api.put(`/notification/read/${item.id}`);
          dispatchNotificationUpdate();
        } catch (error) {
          console.error('标记已读失败:', error);
        }
      }
      // 跳转到题目页面，带上 commentId 参数
      navigate(`/problem/${problemId}?commentId=${item.commentId}`);
    } else {
      // 其他通知跳转到详情页
      navigate(`/notification/${item.id}`);
    }
  };

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
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {modalContextHolder}
      {messageContextHolder}
      <div className="max-w-4xl mx-auto">
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
            >
              <Option value="all">全部</Option>
              <Option value="false">未读</Option>
              <Option value="true">已读</Option>
            </Select>
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
