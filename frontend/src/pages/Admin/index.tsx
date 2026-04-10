import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, Routes, Route } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  HelpCircle,
  Lightbulb,
  Trophy,
  Shield,
  Home,
  BookOpen,
  Key,
  BarChart3,
  Bot,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import AdminUsers from './AdminUsers';
import AdminProblems from './AdminProblems';
import AdminSolves from './AdminSolves';
import AdminCompetitions from './AdminCompetitions';
import AdminPractices from './AdminPractices';
import AdminAiModels from './AdminAiModels';
import AdminPermissions from './AdminPermissions';
import AdminRoles from './AdminRoles';
import AdminStatistics from './AdminStatistics';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import { usePermission } from '../../contexts/PermissionContext';
import { PermissionCode } from '../../constants/permissions';
import type { ApiResponse } from '../../types';

const SIDER_WIDTH = 220;
const SIDER_COLLAPSED_WIDTH = 80;

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const { hasAnyPermission, loading: permissionLoading } = usePermission();

  useEffect(() => {
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
    PermissionCode.SYSTEM_MONITOR,
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
    { key: '/admin/users', icon: Users, label: '用户管理', permissions: [PermissionCode.USER_VIEW, PermissionCode.USER_MANAGE] },
    { key: '/admin/problems', icon: HelpCircle, label: '题目管理', permissions: [PermissionCode.PROBLEM_VIEW, PermissionCode.PROBLEM_MANAGE] },
    { key: '/admin/solves', icon: Lightbulb, label: '题解管理', permissions: [PermissionCode.SOLVE_VIEW, PermissionCode.SOLVE_AUDIT] },
    { key: '/admin/competitions', icon: Trophy, label: '比赛管理', permissions: [PermissionCode.COMPETITION_VIEW, PermissionCode.COMPETITION_MANAGE] },
    { key: '/admin/practices', icon: BookOpen, label: '练习管理', permissions: [PermissionCode.PRACTICE_VIEW, PermissionCode.PRACTICE_MANAGE] },
    { key: '/admin/statistics', icon: BarChart3, label: '数据统计', permissions: [PermissionCode.SYSTEM_MONITOR] },
    { key: '/admin/roles', icon: Shield, label: '角色管理', permissions: [PermissionCode.ROLE_VIEW] },
    { key: '/admin/permissions', icon: Key, label: '权限分配', permissions: [PermissionCode.PERMISSION_ASSIGN] },
    { key: '/admin/ai-models', icon: Bot, label: 'AI 模型', permissions: [PermissionCode.AI_CONFIG_VIEW] },
  ];

  const menuItems = useMemo(() => {
    return allMenuItems.filter(item => hasAnyPermission(...item.permissions));
  }, [hasAnyPermission]);

  const selectedKey = location.pathname.startsWith('/admin')
    ? location.pathname
    : '/admin/users';

  if (checking) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        style={{ color: 'var(--gemini-text-secondary)' }}
      >
        <div className="admin-loading-spinner" />
        <span>检查权限中...</span>
      </div>
    );
  }

  if (!hasPermission) {
    return null;
  }

  return (
    <div className="min-h-screen flex">
      {/* 固定侧边栏 */}
      <aside
        className="admin-sider"
        style={{
          '--sider-width': `${SIDER_WIDTH}px`,
          '--sider-collapsed-width': `${SIDER_COLLAPSED_WIDTH}px`,
          width: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
        } as React.CSSProperties}
      >
        <div className="admin-sider__logo">
          <div className="admin-sider__logo-icon">
            <Shield className="w-5 h-5" style={{ color: '#ffffff' }} />
          </div>
          {!collapsed && (
            <span className="admin-sider__logo-text">管理后台</span>
          )}
        </div>

        <nav className="admin-sider__nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isSelected = selectedKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.key)}
                className={`admin-sider__item ${isSelected ? 'admin-sider__item--selected' : ''}`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="admin-sider__item-label">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className="admin-sider__footer">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="admin-sider__trigger"
            aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            {!collapsed && <span>收起侧边栏</span>}
          </button>
        </div>
      </aside>

      {/* 主内容区 */}
      <div
        className="admin-main"
        style={{
          marginLeft: collapsed ? SIDER_COLLAPSED_WIDTH : SIDER_WIDTH,
        }}
      >
        <header className="admin-header">
          <h1 className="admin-header__title">Vnollx在线评测系统 - 管理后台</h1>
          <div className="admin-header__actions">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="admin-header__btn-home"
            >
              <Home className="w-4 h-4" />
              返回主页
            </button>
            <div className="admin-header__user">
              <div
                className="admin-header__avatar"
              >
                A
              </div>
              <span className="admin-header__user-label">管理员</span>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <Routes>
            <Route path="users" element={<AdminUsers />} />
            <Route path="problems" element={<AdminProblems />} />
            <Route path="solves" element={<AdminSolves />} />
            <Route path="competitions" element={<AdminCompetitions />} />
            <Route path="practices" element={<AdminPractices />} />
            <Route path="statistics" element={<AdminStatistics />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="permissions" element={<AdminPermissions />} />
            <Route path="ai-models" element={<AdminAiModels />} />
            <Route path="*" element={<AdminUsers />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Admin;
