import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import { Layout, Menu, Avatar, Spin, Button } from 'antd';
import toast from 'react-hot-toast';
import {
  Users,
  HelpCircle,
  Lightbulb,
  Trophy,
  Shield,
  Home,
  BookOpen,
  Settings,
  Key,
} from 'lucide-react';
import AdminUsers from './AdminUsers';
import AdminProblems from './AdminProblems';
import AdminSolves from './AdminSolves';
import AdminCompetitions from './AdminCompetitions';
import AdminPractices from './AdminPractices';
import AdminSettings from './AdminSettings';
import AdminPermissions from './AdminPermissions';
import AdminRoles from './AdminRoles';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import { usePermission } from '../../contexts/PermissionContext';
import { PermissionCode } from '../../constants/permissions';
import type { ApiResponse } from '../../types';

const { Sider, Header, Content } = Layout;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const { hasAnyPermission, loading: permissionLoading } = usePermission();

  useEffect(() => {
    // 等待权限加载完成后再检查
    if (!permissionLoading) {
      checkAdminPermission();
    }
  }, [permissionLoading]);

  useEffect(() => {
    if (hasPermission && location.pathname) {
      const token = localStorage.getItem('token');
      if (!token) {
        setHasPermission(false);
        setChecking(false);
        toast.error('登录已过期，请重新登录');
        navigate('/');
      }
    }
  }, [location.pathname, hasPermission]);

  const adminPermissions = [
    PermissionCode.USER_MANAGE,
    PermissionCode.PROBLEM_MANAGE,
    PermissionCode.COMPETITION_MANAGE,
    PermissionCode.PRACTICE_MANAGE,
    PermissionCode.SOLVE_AUDIT,
    PermissionCode.ROLE_VIEW,
    PermissionCode.PERMISSION_ASSIGN,
    PermissionCode.SYSTEM_SETTINGS,
  ];

  const checkAdminPermission = async () => {
    const token = localStorage.getItem('token');
    if (!token || !isAuthenticated()) {
      toast.error('请先登录！');
      navigate('/');
      setChecking(false);
      return;
    }

    try {
      const verifyData = await api.get('/user/profile') as ApiResponse;
      if (verifyData.code !== 200) {
        toast.error('登录已过期，请重新登录');
        navigate('/');
        setChecking(false);
        return;
      }

      // 使用权限守卫检查是否有任一管理权限
      if (hasAnyPermission(...adminPermissions)) {
        setHasPermission(true);
      } else {
        toast.error('权限不足，需要管理员权限');
        navigate('/');
      }
    } catch (error: unknown) {
      const err = error as { response?: { status: number } };
      if (err.response?.status === 401) {
        toast.error('请先登录！');
        localStorage.removeItem('token');
        navigate('/');
      } else {
        toast.error('检查权限失败');
        navigate('/');
      }
    } finally {
      setChecking(false);
    }
  };

  const allMenuItems = [
    { key: '/admin/users', icon: <Users className="w-4 h-4" />, label: '用户管理', permissions: [PermissionCode.USER_VIEW, PermissionCode.USER_MANAGE] },
    { key: '/admin/problems', icon: <HelpCircle className="w-4 h-4" />, label: '题目管理', permissions: [PermissionCode.PROBLEM_VIEW, PermissionCode.PROBLEM_MANAGE] },
    { key: '/admin/solves', icon: <Lightbulb className="w-4 h-4" />, label: '题解管理', permissions: [PermissionCode.SOLVE_VIEW, PermissionCode.SOLVE_AUDIT] },
    { key: '/admin/competitions', icon: <Trophy className="w-4 h-4" />, label: '比赛管理', permissions: [PermissionCode.COMPETITION_VIEW, PermissionCode.COMPETITION_MANAGE] },
    { key: '/admin/practices', icon: <BookOpen className="w-4 h-4" />, label: '练习管理', permissions: [PermissionCode.PRACTICE_VIEW, PermissionCode.PRACTICE_MANAGE] },
    { key: '/admin/roles', icon: <Shield className="w-4 h-4" />, label: '角色管理', permissions: [PermissionCode.ROLE_VIEW] },
    { key: '/admin/permissions', icon: <Key className="w-4 h-4" />, label: '权限分配', permissions: [PermissionCode.PERMISSION_ASSIGN] },
    { key: '/admin/settings', icon: <Settings className="w-4 h-4" />, label: '系统设置', permissions: [PermissionCode.SYSTEM_SETTINGS] },
  ];
  
  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => hasAnyPermission(...item.permissions));
  }, [hasAnyPermission]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const selectedKey = location.pathname.startsWith('/admin')
    ? location.pathname
    : '/admin/users';

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" tip="检查权限中..." />
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        collapsed={collapsed}
        collapsible
        onCollapse={setCollapsed}
        style={{ 
          backgroundColor: 'var(--gemini-surface)',
          borderRight: '1px solid var(--gemini-border-light)'
        }}
      >
        {/* Logo - Gemini 风格 */}
        <div 
          className="h-16 flex items-center justify-center gap-2"
          style={{ borderBottom: '1px solid var(--gemini-border-light)' }}
        >
          <Shield className="w-6 h-6" style={{ color: 'var(--gemini-accent-strong)' }} />
          {!collapsed && (
            <span className="text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>管理后台</span>
          )}
        </div>

        {/* Menu */}
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          className="border-none mt-4"
        />
      </Sider>

      <Layout>
        {/* Header - Gemini 风格 */}
        <Header 
          className="px-6 flex items-center justify-between"
          style={{ 
            backgroundColor: 'var(--gemini-surface)',
            borderBottom: '1px solid var(--gemini-border-light)'
          }}
        >
          <h1 className="text-lg font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
            Vnollx在线评测系统 - 管理后台
          </h1>
          <div className="flex items-center gap-4">
            <Button
              type="primary"
              icon={<Home className="w-4 h-4" />}
              onClick={() => navigate('/')}
              style={{ 
                backgroundColor: 'var(--gemini-accent)',
                color: 'var(--gemini-accent-text)',
                border: 'none'
              }}
            >
              返回主页
            </Button>
            <Avatar style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}>
              A
            </Avatar>
            <span style={{ color: 'var(--gemini-text-secondary)' }}>管理员</span>
          </div>
        </Header>

        {/* Content - Gemini 风格 */}
        <Content 
          className="p-6 min-h-[calc(100vh-64px)]"
          style={{ backgroundColor: 'var(--gemini-bg)' }}
        >
          <Routes>
            <Route path="users" element={<AdminUsers />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="solves" element={<AdminSolves />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="practices" element={<AdminPractices />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="permissions" element={<AdminPermissions />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="*" element={<AdminUsers />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
};

export default Admin;
