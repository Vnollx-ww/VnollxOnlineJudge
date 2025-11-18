import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Space, Modal, message } from 'antd';
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
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated, removeToken } from '../../utils/auth';
import AuthModal from '../Auth/AuthModal';
import './Header.css';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();
  //const [loading, setLoading] = useState(false);

  const loadUserInfo = useCallback(async () => {
    try {
      const data = await api.get('/user/profile');
      if (data.code === 200) {
        setUser(data.data);
        localStorage.setItem('id', data.data.id);
        localStorage.setItem('name', data.data.name);
        localStorage.setItem('identity', data.data.identity);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }, []);

  const loadNotificationCount = useCallback(async () => {
    try {
      const data = await api.get('/notification/count', { params: { status: 'false' } });
      if (data.code === 200) {
        setNotificationCount(data.data || 0);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      loadUserInfo();
      loadNotificationCount();
    }
  }, [loadUserInfo, loadNotificationCount]);

  useEffect(() => {
    const handler = () => {
      if (isAuthenticated()) {
        loadNotificationCount();
      }
    };
    window.addEventListener('notification-updated', handler);
    return () => {
      window.removeEventListener('notification-updated', handler);
    };
  }, [loadNotificationCount]);

  const openAuthModal = (mode) => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const handleGuardedNavigate = useCallback(
    (path, requireAuth = false) => {
      if (requireAuth && !isAuthenticated()) {
        messageApi.warning('请先登录后再访问');
        openAuthModal('login');
        return;
      }
      navigate(path);
    },
    [messageApi, navigate]
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
        setUser(null);
        navigate('/');
        messageApi.success('已退出登录');
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

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/', false)}>
          首页
        </span>
      ),
    },
    {
      key: '/problems',
      icon: <BookOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/problems', true)}>
          题目列表
        </span>
      ),
    },
    {
      key: '/submissions',
      icon: <FileTextOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/submissions', true)}>
          提交列表
        </span>
      ),
    },
    {
      key: '/ranklist',
      icon: <TrophyOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/ranklist', true)}>
          排行榜
        </span>
      ),
    },
    {
      key: '/competitions',
      icon: <TrophyOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/competitions', true)}>
          比赛
        </span>
      ),
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: (
        <span onClick={() => handleGuardedNavigate('/about', true)}>
          关于
        </span>
      ),
    },
  ];

  return (
    <AntHeader className="app-header">
      {contextHolder}
      {messageContextHolder}
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">⚡</span>
          <span className="logo-text">VnollxOJ</span>
        </Link>

        <Menu
          mode="horizontal"
          items={menuItems}
          className="header-menu"
          selectedKeys={[window.location.pathname]}
        />

        <div className="header-actions">
          {isAuthenticated() && user ? (
            <Space size="middle">
              <Badge count={notificationCount} size="small">
                <Link to="/notifications">
                  <BellOutlined className="notification-icon" />
                </Link>
              </Badge>
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
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
            </Space>
          ) : (
            <Space>
              <Button type="default" onClick={() => openAuthModal('login')}>
                登录
              </Button>
              <Button type="primary" onClick={() => openAuthModal('register')}>
                注册
              </Button>
            </Space>
          )}
        </div>
      </div>
      <AuthModal
        open={authModalOpen}
        mode={authMode}
        onClose={closeAuthModal}
        onModeChange={setAuthMode}
      />
    </AntHeader>
  );
};

export default Header;

