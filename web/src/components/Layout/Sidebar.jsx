import { useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Space, Modal, message, Tooltip } from 'antd';
import {
  HomeOutlined,
  BookOutlined,
  TrophyOutlined,
  FileTextOutlined,
  BellOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  InfoCircleOutlined,
  SwapOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated, removeToken } from '../../utils/auth';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = ({ user, notificationCount, loadUserInfo, loadNotificationCount, openAuthModal, layoutMode, toggleLayoutMode }) => {
  const navigate = useNavigate();
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const handleGuardedNavigate = useCallback(
    (path, requireAuth = false) => {
      if (requireAuth && !isAuthenticated()) {
        messageApi.warning('请先登录后再访问');
        openAuthModal('login');
        return;
      }
      navigate(path);
    },
    [messageApi, navigate, openAuthModal]
  );

  const handleLogoutConfirm = () => {
    modal.confirm({
      title: '确认退出登录？',
      content: '退出后需要重新登录才能继续操作。',
      okText: '退出',
      cancelText: '取消',
      okType: 'danger',
      onOk: () => {
        removeToken();
        localStorage.removeItem('id');
        localStorage.removeItem('name');
        localStorage.removeItem('identity');
        navigate('/');
        messageApi.success('已退出登录');
        window.location.reload();
      },
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: <Link to={`/user/${user?.id}`}>我的主页</Link>,
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">我的设置</Link>,
    },
    ...(user?.identity === 'ADMIN' || user?.identity === 'SUPER_ADMIN'
      ? [
          {
            key: 'admin',
            icon: <SettingOutlined />,
            label: <Link to="/admin">管理员界面</Link>,
          },
        ]
      : []),
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      danger: true,
      onClick: handleLogoutConfirm,
    },
  ];

  const handleMenuClick = (e) => {
    const path = e.key;
    const requireAuth = path !== '/';
    handleGuardedNavigate(path, requireAuth);
  };

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '首页',
    },
    {
      key: '/problems',
      icon: <BookOutlined />,
      label: '题目列表',
    },
    {
      key: '/submissions',
      icon: <FileTextOutlined />,
      label: '提交列表',
    },
    {
      key: '/ranklist',
      icon: <TrophyOutlined />,
      label: '排行榜',
    },
    {
      key: '/competitions',
      icon: <TrophyOutlined />,
      label: '比赛',
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: '关于',
    },
  ];

  return (
    <Sider className="app-sidebar" width={220} theme="light">
      {contextHolder}
      {messageContextHolder}
      <div className="sidebar-container">
        <div className="sidebar-header">
          <Link to="/" className="sidebar-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">VnollxOJ</span>
          </Link>
          <Tooltip title="切换为顶部导航" placement="right">
            <Button
              type="text"
              icon={<SwapOutlined />}
              onClick={toggleLayoutMode}
              className="sidebar-toggle-btn"
            />
          </Tooltip>
        </div>

        <Menu
          mode="inline"
          items={menuItems}
          className="sidebar-menu"
          selectedKeys={[window.location.pathname]}
          onClick={handleMenuClick}
        />

        <div className="sidebar-footer">
          {isAuthenticated() && user ? (
            <div className="sidebar-user">
              <Badge count={notificationCount} size="small" offset={[-5, 5]}>
                <Link to="/notifications" className="notification-link">
                  <BellOutlined className="notification-icon" />
                </Link>
              </Badge>
              <Dropdown menu={{ items: userMenuItems }} placement="topRight">
                <Space className="user-info" style={{ cursor: 'pointer' }}>
                  <Avatar
                    style={{
                      backgroundColor: '#1a73e8',
                    }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <span className="user-name">{user.name}</span>
                </Space>
              </Dropdown>
            </div>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button block type="default" onClick={() => openAuthModal('login')}>
                登录
              </Button>
              <Button block type="primary" onClick={() => openAuthModal('register')}>
                注册
              </Button>
            </Space>
          )}
        </div>
      </div>
    </Sider>
  );
};

export default Sidebar;
