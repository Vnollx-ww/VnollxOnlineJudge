import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Layout, Menu, Button, Dropdown, Avatar, Badge, Space } from 'antd';
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
import { isAuthenticated, removeToken, getUserInfo } from '../../utils/auth';
import './Header.css';

const { Header: AntHeader } = Layout;

const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      loadUserInfo();
      loadNotificationCount();
    }
  }, []);

  const loadUserInfo = async () => {
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
  };

  const loadNotificationCount = async () => {
    try {
      const data = await api.get('/notification/count', { params: { status: 'false' } });
      if (data.code === 200) {
        setNotificationCount(data.data || 0);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
    }
  };

  const handleLogout = () => {
    removeToken();
    setUser(null);
    navigate('/');
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
      onClick: handleLogout,
    },
  ];

  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/problems',
      icon: <BookOutlined />,
      label: <Link to="/problems">题目列表</Link>,
    },
    {
      key: '/submissions',
      icon: <FileTextOutlined />,
      label: <Link to="/submissions">提交列表</Link>,
    },
    {
      key: '/ranklist',
      icon: <TrophyOutlined />,
      label: <Link to="/ranklist">排行榜</Link>,
    },
    {
      key: '/competitions',
      icon: <TrophyOutlined />,
      label: <Link to="/competitions">比赛</Link>,
    },
    {
      key: '/about',
      icon: <InfoCircleOutlined />,
      label: <Link to="/about">关于</Link>,
    },
  ];

  return (
    <AntHeader className="app-header">
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
              <Button type="default" onClick={() => navigate('/login')}>
                登录
              </Button>
              <Button type="primary" onClick={() => navigate('/register')}>
                注册
              </Button>
            </Space>
          )}
        </div>
      </div>
    </AntHeader>
  );
};

export default Header;

