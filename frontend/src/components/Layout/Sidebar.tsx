import { useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge, Modal, message, Tooltip } from 'antd';
import {
  Home,
  BookOpen,
  Trophy,
  Flag,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  Info,
  Zap,
  Users,
} from 'lucide-react';
import { isAuthenticated, removeToken } from '@/utils/auth';
import { usePermission } from '@/contexts/PermissionContext';
import { PermissionCode } from '@/constants/permissions';
import type { User as UserType } from '@/types';

interface SidebarProps {
  user: UserType | null;
  notificationCount: number;
  loadUserInfo: () => Promise<void>;
  loadNotificationCount: () => Promise<void>;
  collapsed?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  notificationCount,
  collapsed = false,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasAnyPermission } = usePermission();
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const handleGuardedNavigate = useCallback(
    (path: string, requireAuth = false) => {
      if (requireAuth && !isAuthenticated()) {
        messageApi.warning('请先登录后再访问');
        navigate('/login');
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
        navigate('/');
        messageApi.success('已退出登录');
        window.location.reload();
      },
    });
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User className="w-4 h-4" />,
      label: <Link to={`/user/${user?.id}`}>我的主页</Link>,
    },
    {
      key: 'settings',
      icon: <Settings className="w-4 h-4" />,
      label: <Link to="/settings">我的设置</Link>,
    },
    ...(hasAnyPermission(
        PermissionCode.USER_MANAGE,
        PermissionCode.PROBLEM_MANAGE,
        PermissionCode.COMPETITION_MANAGE,
        PermissionCode.PRACTICE_MANAGE,
        PermissionCode.SOLVE_AUDIT,
        PermissionCode.ROLE_VIEW,
        PermissionCode.PERMISSION_ASSIGN,
        PermissionCode.SYSTEM_SETTINGS
      )
      ? [
          {
            key: 'admin',
            icon: <Settings className="w-4 h-4" />,
            label: <Link to="/admin">后台界面</Link>,
          },
        ]
      : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut className="w-4 h-4" />,
      label: '退出登录',
      danger: true,
      onClick: handleLogoutConfirm,
    },
  ];

  const menuItems = [
    { key: '/', icon: Home, label: '首页' },
    { key: '/problems', icon: BookOpen, label: '题目列表' },
    { key: '/submissions', icon: FileText, label: '提交列表' },
    { key: '/ranklist', icon: Trophy, label: '排行榜' },
    { key: '/competitions', icon: Flag, label: '比赛' },
    { key: '/practices', icon: BookOpen, label: '练习' },
    { key: '/friends', icon: Users, label: '好友' },
    { key: '/about', icon: Info, label: '关于' },
  ];

  const sidebarWidth = collapsed ? 80 : 224;

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 flex flex-col z-50 transition-[width] duration-200 ease-out"
      style={{
        width: sidebarWidth,
        backgroundColor: 'var(--gemini-surface)',
        borderRight: '1px solid var(--gemini-border-light)',
        boxShadow: 'var(--shadow-gemini)',
      }}
    >
      {contextHolder}
      {messageContextHolder}

      {/* Header */}
      <div
        className="h-16 flex items-center shrink-0 transition-[padding] duration-200"
        style={{
          padding: collapsed ? '0 12px' : '0 16px',
          justifyContent: collapsed ? 'center' : 'space-between',
          borderBottom: '1px solid var(--gemini-border-light)',
        }}
      >
        <Link
          to="/"
          className="flex items-center gap-2 group"
          style={{ minWidth: collapsed ? 'auto' : undefined }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
            style={{ backgroundColor: 'var(--gemini-accent)' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--gemini-accent-text)' }} />
          </div>
          {!collapsed && (
            <span
              className="text-lg font-semibold tracking-tight truncate"
              style={{ color: 'var(--gemini-text-primary)' }}
            >
              VnollxOJ
            </span>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden" style={{ paddingLeft: 12, paddingRight: 12 }}>
        <div className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.key;
            const menuButton = (
              <button
                key={item.key}
                type="button"
                onClick={() => handleGuardedNavigate(item.key, item.key !== '/')}
                className="w-full flex items-center rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  gap: 12,
                  padding: collapsed ? '12px 0' : '12px 16px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  backgroundColor: isActive ? 'var(--gemini-accent)' : 'transparent',
                  color: isActive ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)';
                    e.currentTarget.style.color = 'var(--gemini-text-primary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--gemini-text-secondary)';
                  }
                }}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>
            );

            return collapsed ? (
              <Tooltip
                key={item.key}
                title={<span className="block text-center">{item.label}</span>}
                placement="right"
              >
                {menuButton}
              </Tooltip>
            ) : menuButton;
          })}
        </div>
      </nav>

      {/* Footer: 用户区 + 折叠按钮 */}
      <div
        className="shrink-0 transition-[padding] duration-200"
        style={{
          padding: collapsed ? 12 : 16,
          borderTop: '1px solid var(--gemini-border-light)',
        }}
      >
        {isAuthenticated() && user ? (
          <div className="space-y-3">
            {!collapsed && (
              <>
                <Link
                  to="/notifications"
                  className="flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                >
                  <Badge count={notificationCount} size="small" offset={[-2, 2]}>
                    <Bell className="w-5 h-5 shrink-0" style={{ color: 'var(--gemini-text-secondary)' }} />
                  </Badge>
                  <span className="text-sm truncate" style={{ color: 'var(--gemini-text-secondary)' }}>
                    通知
                  </span>
                </Link>
                <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-3xl cursor-pointer transition-all duration-200"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    <Avatar
                      size={36}
                      src={user.avatar}
                      className="flex-shrink-0"
                      style={{
                        background: user.avatar
                          ? 'transparent'
                          : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                        color: '#fff',
                      }}
                    >
                      {user.name?.charAt(0)?.toUpperCase() || 'U'}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--gemini-text-primary)' }}>
                        {user.name}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--gemini-text-disabled)' }}>
                        {user.email || '点击展开菜单'}
                      </div>
                    </div>
                  </div>
                </Dropdown>
              </>
            )}
            {collapsed && (
              <div className="flex flex-col items-center gap-2">
                <Tooltip title={<span className="block text-center">通知</span>} placement="right">
                  <Link
                    to="/notifications"
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    <Badge count={notificationCount} size="small" offset={[-2, 2]}>
                      <Bell className="w-5 h-5" style={{ color: 'var(--gemini-text-secondary)' }} />
                    </Badge>
                  </Link>
                </Tooltip>
                <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
                  <Tooltip title={<span className="block text-center">{user.name || '用户菜单'}</span>} placement="right">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 shrink-0"
                      style={{
                        backgroundColor: 'var(--gemini-bg)',
                        background: user.avatar
                          ? 'transparent'
                          : 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                        color: '#fff',
                      }}
                    >
                      {user.avatar ? (
                        <img src={user.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <span className="text-sm font-medium">{user.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                  </Tooltip>
                </Dropdown>
              </div>
            )}
          </div>
        ) : (
          !collapsed && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-full text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--gemini-text-secondary)',
                  border: '1px solid var(--gemini-border)',
                  backgroundColor: 'transparent',
                }}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
                style={{
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                }}
              >
                注册
              </button>
            </div>
          )
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

