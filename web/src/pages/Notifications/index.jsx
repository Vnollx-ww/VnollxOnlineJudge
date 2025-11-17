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
  Card,
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
import './Notifications.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const PAGE_SIZE = 10;

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState();
  const [keyword, setKeyword] = useState('');
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);

  const loadNotificationsRef = useRef(null);

  const dispatchNotificationUpdate = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('notification-updated'));
    }
  };

  const buildParams = (page, overrides = {}) => {
    const effectiveKeyword =
      overrides.keyword !== undefined ? overrides.keyword : keyword;
    const effectiveStatus =
      overrides.status !== undefined ? overrides.status : status;

    const params = {
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

  const loadNotifications = async (page = 1, overrides = {}) => {
    setLoading(true);
    try {
      const { params, effectiveKeyword, effectiveStatus } = buildParams(
        page,
        overrides,
      );
      const data = await api.get('/notification/list', { params });
      if (data.code === 200) {
        setNotifications(data.data || []);
        setCurrentPage(page);
      } else {
        message.error(data.msg || '加载通知失败');
      }

      const countParams = {};
      if (effectiveKeyword?.trim()) {
        countParams.keyword = effectiveKeyword.trim();
      }
      if (effectiveStatus) {
        countParams.status = effectiveStatus;
      }
      const countData = await api.get('/notification/count', {
        params: countParams,
      });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      console.error(error);
      message.error('加载通知失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  loadNotificationsRef.current = loadNotifications;

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/login');
      return;
    }
    loadNotificationsRef.current?.(1);
  }, [navigate]);

  const handleSearch = () => {
    loadNotifications(1);
  };

  const handleReset = () => {
    setKeyword('');
    setStatus(undefined);
    loadNotifications(1, { keyword: '', status: undefined });
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    loadNotifications(1, { status: value });
  };

  const handlePageChange = (page) => {
    loadNotifications(page);
  };

  const handleMarkRead = async (id) => {
    try {
      await api.put(`/notification/read/${id}`);
      message.success('已标记为已读');
      dispatchNotificationUpdate();
      loadNotifications(currentPage);
    } catch (error) {
      console.error(error);
      message.error('操作失败，请稍后重试');
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: '确认删除该通知？',
      content: '删除后无法恢复。',
      okText: '删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      async onOk() {
        try {
          await api.delete(`/notification/delete/${id}`);
          message.success('删除成功');
          dispatchNotificationUpdate();
          const nextPage =
            notifications.length === 1 && currentPage > 1
              ? currentPage - 1
              : currentPage;
          loadNotifications(nextPage);
        } catch (error) {
          console.error(error);
          message.error('删除失败，请稍后重试');
        }
      },
    });
  };

  const renderStatusTag = (isRead) => (
    <Tag color={isRead ? 'success' : 'processing'}>
      {isRead ? '已读' : '未读'}
    </Tag>
  );

  const renderActions = (item) => [
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
    <div className="notifications-page">
      <Card className="notifications-card" bordered={false}>
        <div className="notifications-header">
          <Space size="large" align="center">
            <Title level={2} className="page-title">
              <BellOutlined /> 通知列表
            </Title>
            <Tag color="blue">共 {total} 条</Tag>
          </Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => loadNotifications(currentPage)}
          >
            刷新
          </Button>
        </div>

        <div className="notifications-filters">
          <Input
            placeholder="搜索通知标题或内容"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            allowClear
          />
          <Select
            placeholder="阅读状态"
            value={status}
            onChange={handleStatusChange}
            allowClear
          >
            <Option value="false">未读</Option>
            <Option value="true">已读</Option>
          </Select>
          <Space>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              搜索
            </Button>
            <Button onClick={handleReset}>重置</Button>
          </Space>
        </div>

        <List
          className="notifications-list"
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
              className={`notification-item ${
                item.is_read ? 'read' : 'unread'
              }`}
              actions={renderActions(item)}
            >
              <List.Item.Meta
                title={
                  <Space size="middle">
                    <Text strong>{item.title}</Text>
                    {renderStatusTag(item.is_read)}
                  </Space>
                }
                description={
                  <Paragraph
                    className="notification-description"
                    ellipsis={{ rows: 2 }}
                  >
                    {item.description || '暂无内容'}
                  </Paragraph>
                }
              />
              <div className="notification-meta">
                <Text type="secondary">
                  {item.createTime
                    ? dayjs(item.createTime).format('YYYY-MM-DD HH:mm:ss')
                    : '--'}
                </Text>
              </div>
            </List.Item>
          )}
        />

        {total > PAGE_SIZE && (
          <div className="notifications-pagination">
            <Pagination
              current={currentPage}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              showTotal={(value) => `共 ${value} 条通知`}
            />
          </div>
        )}
      </Card>
    </div>
  );
};

export default Notifications;
