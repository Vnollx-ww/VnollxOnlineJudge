import { useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge, Modal, message, Tooltip } from 'antd';
import {
  Home,
  BookOpen,
  Trophy,
  FileText,
  Bell,
  User,
  Settings,
  LogOut,
  Info,
  ArrowLeftRight,
  Zap,
  Users,
} from 'lucide-react';
import { isAuthenticated, removeToken } from '@/utils/auth';
import type { User as UserType } from '@/types';

interface SidebarProps {
  user: UserType | null;
  notificationCount: number;
  unreadMessageCount: number;
  loadUserInfo: () => Promise<void>;
  loadNotificationCount: () => Promise<void>;
  layoutMode: 'top' | 'left';
  toggleLayoutMode: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  user,
  notificationCount,
  unreadMessageCount,
  toggleLayoutMode,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
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
    ...(user?.identity === 'ADMIN' || user?.identity === 'SUPER_ADMIN'
      ? [
          {
            key: 'admin',
            icon: <Settings className="w-4 h-4" />,
            label: <Link to="/admin">管理员界面</Link>,
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
    { key: '/competitions', icon: Trophy, label: '比赛' },
    { key: '/practices', icon: BookOpen, label: '练习' },
    { key: '/friends', icon: Users, label: '好友' },
    { key: '/about', icon: Info, label: '关于' },
  ];

  return (
    <aside 
      className="fixed left-0 top-0 bottom-0 w-56 flex flex-col z-50"
      style={{ 
        backgroundColor: 'var(--gemini-surface)',
        borderRight: '1px solid var(--gemini-border-light)',
        boxShadow: 'var(--shadow-gemini)'
      }}
    >
      {contextHolder}
      {messageContextHolder}

      {/* Header - Gemini 风格 */}
      <div 
        className="h-16 px-4 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--gemini-border-light)' }}
      >
        <Link to="/" className="flex items-center gap-2 group">
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{ backgroundColor: 'var(--gemini-accent)' }}
          >
            <Zap className="w-4 h-4" style={{ color: 'var(--gemini-accent-text)' }} />
          </div>
          <span 
            className="text-lg font-semibold tracking-tight"
            style={{ color: 'var(--gemini-text-primary)' }}
          >
            VnollxOJ
          </span>
        </Link>
        <Tooltip title="切换为顶部导航" placement="right">
          <button
            onClick={toggleLayoutMode}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--gemini-bg)',
              color: 'var(--gemini-text-secondary)'
            }}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>
        </Tooltip>
      </div>

      {/* Navigation - Gemini 风格 */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleGuardedNavigate(item.key, item.key !== '/')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-full text-sm font-medium transition-all duration-200"
              style={{ 
                backgroundColor: isActive ? 'var(--gemini-accent)' : 'transparent',
                color: isActive ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)'
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
              {item.key === '/friends' && unreadMessageCount > 0 ? (
                <Badge count={unreadMessageCount} size="small" offset={[-2, 2]}>
                  <Icon className="w-5 h-5" style={{ color: isActive ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)' }} />
                </Badge>
              ) : (
                <Icon className="w-5 h-5" />
              )}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer - User Area - Gemini 风格 */}
      <div 
        className="p-4"
        style={{ borderTop: '1px solid var(--gemini-border-light)' }}
      >
        {isAuthenticated() && user ? (
          <div className="space-y-3">
            {/* Notification */}
            <Link 
              to="/notifications"
              className="flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200"
              style={{ backgroundColor: 'var(--gemini-bg)' }}
            >
              <Badge count={notificationCount} size="small" offset={[-2, 2]}>
                <Bell className="w-5 h-5" style={{ color: 'var(--gemini-text-secondary)' }} />
              </Badge>
              <span className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>通知</span>
            </Link>

            {/* User Dropdown */}
            <Dropdown menu={{ items: userMenuItems }} placement="topRight" trigger={['click']}>
              <div 
                className="flex items-center gap-3 px-3 py-2.5 rounded-3xl cursor-pointer transition-all duration-200"
                style={{ backgroundColor: 'var(--gemini-bg)' }}
              >
                <Avatar
                  size={36}
                  className="flex-shrink-0"
                  style={{ 
                    background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
                    color: '#fff'
                  }}
                >
                  {user.name?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-sm font-medium truncate"
                    style={{ color: 'var(--gemini-text-primary)' }}
                  >
                    {user.name}
                  </div>
                  <div 
                    className="text-xs truncate"
                    style={{ color: 'var(--gemini-text-disabled)' }}
                  >
                    {user.email || '点击展开菜单'}
                  </div>
                </div>
              </div>
            </Dropdown>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 rounded-full text-sm font-medium transition-all duration-200"
              style={{ 
                color: 'var(--gemini-text-secondary)',
                border: '1px solid var(--gemini-border)',
                backgroundColor: 'transparent'
              }}
            >
              登录
            </button>
            <button
              onClick={() => navigate('/register')}
              className="w-full py-2.5 rounded-full text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
              style={{ 
                backgroundColor: 'var(--gemini-accent)',
                color: 'var(--gemini-accent-text)'
              }}
            >
              注册
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;

