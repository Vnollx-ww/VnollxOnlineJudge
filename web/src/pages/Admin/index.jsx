import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Layout, Menu, Typography, Avatar, message, Spin } from 'antd';
import {
  UserOutlined,
  QuestionCircleOutlined,
  BulbOutlined,
  TrophyOutlined,
  SafetyOutlined,
} from '@ant-design/icons';
import AdminUsers from './AdminUsers';
import AdminProblems from './AdminProblems';
import AdminSolves from './AdminSolves';
import AdminCompetitions from './AdminCompetitions';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo } from '../../utils/auth';
import './Admin.css';

const { Sider, Header, Content } = Layout;
const { Title } = Typography;

const Admin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    checkAdminPermission();
  }, []);

  // 监听路由变化，确保每次切换子页面时都检查权限
  useEffect(() => {
    if (hasPermission && location.pathname) {
      // 如果已经有权限，确保token仍然有效
      const token = localStorage.getItem('token');
      if (!token) {
        setHasPermission(false);
        setChecking(false);
        message.error('登录已过期，请重新登录');
        navigate('/login');
      }
    }
  }, [location.pathname, hasPermission]);

  const checkAdminPermission = async () => {
    // 先检查token是否存在
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('请先登录！');
      navigate('/login');
      setChecking(false);
      return;
    }

    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/login');
      setChecking(false);
      return;
    }

    try {
      // 从localStorage获取用户信息
      const userInfo = getUserInfo();
      if (userInfo.identity === 'ADMIN' || userInfo.identity === 'SUPER_ADMIN') {
        // 验证token是否仍然有效
        try {
          const verifyData = await api.get('/user/profile');
          if (verifyData.code === 200) {
            setHasPermission(true);
            setChecking(false);
            return;
          }
        } catch (verifyError) {
          // 如果验证失败，清除token并跳转
          if (verifyError.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('id');
            localStorage.removeItem('name');
            localStorage.removeItem('identity');
            message.error('登录已过期，请重新登录');
            navigate('/login');
            setChecking(false);
            return;
          }
        }
      }

      // 如果localStorage中没有identity，尝试从API获取
      const data = await api.get('/user/profile');
      if (data.code === 200) {
        const identity = data.data.identity;
        if (identity === 'ADMIN' || identity === 'SUPER_ADMIN') {
          localStorage.setItem('identity', identity);
          setHasPermission(true);
        } else {
          message.error('权限不足，需要管理员权限');
          navigate('/');
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        localStorage.removeItem('token');
        localStorage.removeItem('id');
        localStorage.removeItem('name');
        localStorage.removeItem('identity');
        navigate('/login');
      } else {
        message.error('检查权限失败');
        navigate('/');
      }
    } finally {
      setChecking(false);
    }
  };

  const menuItems = [
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
    },
    {
      key: '/admin/problems',
      icon: <QuestionCircleOutlined />,
      label: '题目管理',
    },
    {
      key: '/admin/solves',
      icon: <BulbOutlined />,
      label: '题解管理',
    },
    {
      key: '/admin/competitions',
      icon: <TrophyOutlined />,
      label: '比赛管理',
    },
  ];

  const handleMenuClick = ({ key }) => {
    navigate(key);
  };

  const selectedKey = location.pathname.startsWith('/admin')
    ? location.pathname
    : '/admin/users';

  if (checking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="检查权限中..." />
      </div>
    );
  }

  if (!hasPermission) {
    // 如果没有权限，不渲染任何内容，避免子组件加载
    return null;
  }

  return (
    <Layout className="admin-layout">
      <Sider
        width={200}
        collapsed={collapsed}
        className="admin-sidebar"
        collapsible
        onCollapse={setCollapsed}
      >
        <div className="admin-logo">
          <SafetyOutlined style={{ fontSize: 24, color: '#1a73e8' }} />
          {!collapsed && (
            <Title level={4} style={{ margin: 0, color: '#1a73e8' }}>
              管理后台
            </Title>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className="admin-menu"
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Title level={4} style={{ margin: 0, color: '#1e293b' }}>
            Vnollx在线评测系统 - 管理后台
          </Title>
          <div className="admin-user-info">
            <Avatar icon={<UserOutlined />} />
            <span style={{ marginLeft: 8 }}>管理员</span>
          </div>
        </Header>
        <Content className="admin-content">
          <Routes>
            <Route path="users" element={<AdminUsers />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="solves" element={<AdminSolves />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="*" element={<AdminUsers />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Admin;
