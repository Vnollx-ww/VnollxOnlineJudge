import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Dropdown, Avatar, Badge, Modal, message } from 'antd';
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
import api from '../../utils/api';
import { isAuthenticated, removeToken } from '../../utils/auth';
import type { User as UserType, ApiResponse } from '../../types';

interface HeaderProps {
  layoutMode: 'top' | 'left';
  toggleLayoutMode: () => void;
}

const Header: React.FC<HeaderProps> = ({ layoutMode: _, toggleLayoutMode }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<UserType | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [modal, contextHolder] = Modal.useModal();
  const [messageApi, messageContextHolder] = message.useMessage();

  const loadUserInfo = useCallback(async () => {
    try {
      const data = await api.get('/user/profile') as ApiResponse<UserType>;
      if (data.code === 200) {
        setUser(data.data);
        localStorage.setItem('id', String(data.data.id));
        localStorage.setItem('name', data.data.name);
        localStorage.setItem('identity', data.data.identity);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  }, []);

  const loadNotificationCount = useCallback(async () => {
    try {
      const data = await api.get('/notification/count', { params: { status: 'false' } }) as ApiResponse<number>;
      if (data.code === 200) {
        setNotificationCount(data.data || 0);
      }
    } catch (error) {
      console.error('获取通知数量失败:', error);
    }
  }, []);

  const loadUnreadMessageCount = useCallback(async () => {
    try {
      const data = await api.get('/friend/unread') as ApiResponse<number>;
      if (data.code === 200) {
        setUnreadMessageCount(data.data || 0);
      }
    } catch (error) {
      console.error('获取未读消息数量失败:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated()) {
      loadUserInfo();
      loadNotificationCount();
      loadUnreadMessageCount();
    }
  }, [loadUserInfo, loadNotificationCount, loadUnreadMessageCount]);

  useEffect(() => {
    const handleNotificationUpdate = () => {
      if (isAuthenticated()) {
        loadNotificationCount();
      }
    };
    
    const handleMessageUpdate = () => {
      if (isAuthenticated()) {
        loadUnreadMessageCount();
      }
    };
    
    const handleStorageChange = () => {
      // 监听 storage 事件，当登录成功时重新加载用户信息
      if (isAuthenticated()) {
        loadUserInfo();
        loadNotificationCount();
        loadUnreadMessageCount();
      } else {
        setUser(null);
        setNotificationCount(0);
      }
    };
    
    window.addEventListener('notification-updated', handleNotificationUpdate);
    window.addEventListener('message-updated', handleMessageUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('notification-updated', handleNotificationUpdate);
      window.removeEventListener('message-updated', handleMessageUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [loadUserInfo, loadNotificationCount, loadUnreadMessageCount]);

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
        setUser(null);
        navigate('/');
        messageApi.success('已退出登录');
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

  const handleMenuClick = (e: { key: string }) => {
    const path = e.key;
    const requireAuth = path !== '/';
    handleGuardedNavigate(path, requireAuth);
  };

  const menuItems = [
    { key: '/', icon: <Home className="w-4 h-4" />, label: '首页' },
    { key: '/problems', icon: <BookOpen className="w-4 h-4" />, label: '题目列表' },
    { key: '/submissions', icon: <FileText className="w-4 h-4" />, label: '提交列表' },
    { key: '/ranklist', icon: <Trophy className="w-4 h-4" />, label: '排行榜' },
    { key: '/competitions', icon: <Trophy className="w-4 h-4" />, label: '比赛' },
    { key: '/practices', icon: <BookOpen className="w-4 h-4" />, label: '练习' },
    { key: '/friends', icon: <Users className="w-4 h-4" />, label: '好友' },
    { key: '/about', icon: <Info className="w-4 h-4" />, label: '关于' },
  ];

  return (
    <header 
      className="fixed top-0 left-0 right-0 z-50 h-16"
      style={{ 
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--gemini-border-light)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
      }}
    >
      {contextHolder}
      {messageContextHolder}
      
      <div className="max-w-7xl mx-auto h-full px-4 md:px-6 flex items-center justify-between">
        {/* Logo - Gemini 风格 */}
        <Link 
          to="/" 
          className="flex items-center gap-2 group"
        >
          <div 
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 group-hover:scale-105"
            style={{ 
              background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
              boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)'
            }}
          >
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span 
            className="text-xl font-semibold tracking-tight hidden sm:block"
            style={{ color: 'var(--gemini-text-primary)' }}
          >
            VnollxOJ
          </span>
        </Link>

        {/* 导航菜单 - Gemini 胶囊风格 */}
        <nav className="hidden lg:flex items-center gap-1">
          {menuItems.map((item) => (
            <button
              key={item.key}
              onClick={() => handleMenuClick({ key: item.key })}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
              style={{ 
                backgroundColor: location.pathname === item.key ? 'var(--gemini-accent)' : 'transparent',
                color: location.pathname === item.key ? 'var(--gemini-accent-text)' : 'var(--gemini-text-secondary)'
              }}
              onMouseEnter={(e) => {
                if (location.pathname !== item.key) {
                  e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)';
                  e.currentTarget.style.color = 'var(--gemini-text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (location.pathname !== item.key) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--gemini-text-secondary)';
                }
              }}
            >
              {item.key === '/friends' && unreadMessageCount > 0 ? (
                <Badge count={unreadMessageCount} size="small" offset={[-2, 2]}>
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* 右侧操作区 */}
        <div className="flex items-center gap-3">
          {/* 布局切换 */}
          <button
            onClick={toggleLayoutMode}
            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--gemini-bg)',
              color: 'var(--gemini-text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)';
              e.currentTarget.style.color = 'var(--gemini-text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
              e.currentTarget.style.color = 'var(--gemini-text-secondary)';
            }}
            title="切换为左侧导航"
          >
            <ArrowLeftRight className="w-4 h-4" />
          </button>

          {isAuthenticated() && user ? (
            <div className="flex items-center gap-3">
              {/* 通知 */}
              <Link to="/notifications" className="relative">
                <Badge count={notificationCount} size="small" offset={[-2, 2]}>
                  <div 
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200"
                    style={{ 
                      backgroundColor: 'var(--gemini-bg)',
                      color: 'var(--gemini-text-secondary)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)';
                      e.currentTarget.style.color = 'var(--gemini-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
                      e.currentTarget.style.color = 'var(--gemini-text-secondary)';
                    }}
                  >
                    <Bell className="w-4 h-4" />
                  </div>
                </Badge>
              </Link>

              {/* 用户下拉菜单 - Gemini 风格 */}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <div 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full cursor-pointer transition-all duration-200"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-accent)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--gemini-bg)'}
                >
                  <Avatar
                    size={32}
                    style={{ background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)' }}
                  >
                    {user.name?.charAt(0)?.toUpperCase() || 'U'}
                  </Avatar>
                  <span 
                    className="text-sm font-medium hidden sm:block"
                    style={{ color: 'var(--gemini-text-primary)' }}
                  >
                    {user.name}
                  </span>
                </div>
              </Dropdown>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all duration-200"
                style={{ color: 'var(--gemini-text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--gemini-surface-hover)';
                  e.currentTarget.style.color = 'var(--gemini-text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--gemini-text-secondary)';
                }}
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
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
      </div>
    </header>
  );
};

export default Header;
