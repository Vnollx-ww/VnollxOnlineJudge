import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BellOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined,
  SearchOutlined,
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

  const handleSearch = () => loadNotifications(1);

  const handleReset = () => {
    setKeyword('');
    setStatus(undefined);
    loadNotifications(1, { keyword: '', status: undefined });
  };

  const handleStatusChange = (value: string) => {
    setStatus(value);
    loadNotifications(1, { status: value });
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
      onClick={() => navigate(`/notification/${item.id}`)}
      key="view"
    >
      查看详情
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
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
              className="!w-64 !rounded-full"
            />
            <Select
              placeholder="阅读状态"
              value={status}
              onChange={handleStatusChange}
              allowClear
              className="!w-32"
            >
              <Option value="false">未读</Option>
              <Option value="true">已读</Option>
            </Select>
            <Space>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                onClick={handleSearch}
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                搜索
              </Button>
              <Button onClick={handleReset}>重置</Button>
            </Space>
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
