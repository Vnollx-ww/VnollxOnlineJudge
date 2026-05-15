import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Users,
  HelpCircle,
  Lightbulb,
  Trophy,
  Shield,
  BookOpen,
  Key,
  BarChart3,
  Bot,
  BookMarked,
  Bell,
} from 'lucide-react';
import { userApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import { usePermission } from '@/contexts/PermissionContext';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

export const SIDER_WIDTH = 220;
export const SIDER_COLLAPSED_WIDTH = 80;

export const useAdmin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const { hasAnyPermission, loading: permissionLoading } = usePermission();

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
      const verifyData = (await userApi.getProfile()) as ApiResponse;
      if (verifyData.code !== 200) {
        toast.error('登录已过期，请重新登录');
        navigate('/');
        setChecking(false);
        return;
      }
      if (hasAnyPermission(...adminPermissions)) setHasPermission(true);
      else {
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

  useEffect(() => {
    if (!permissionLoading) checkAdminPermission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  }, [location.pathname, hasPermission, navigate]);

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
    { key: '/admin/dicts', icon: BookMarked, label: '字典管理', permissions: [PermissionCode.SYSTEM_SETTINGS] },
    { key: '/admin/notifications', icon: Bell, label: '通知管理', permissions: [PermissionCode.NOTIFICATION_CREATE] },
  ];

  const menuItems = useMemo(
    () => allMenuItems.filter((item) => hasAnyPermission(...item.permissions)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [hasAnyPermission]
  );

  const selectedKey = location.pathname.startsWith('/admin') ? location.pathname : '/admin/users';

  return {
    navigate,
    collapsed,
    setCollapsed,
    checking,
    hasPermission,
    menuItems,
    selectedKey,
  };
};
