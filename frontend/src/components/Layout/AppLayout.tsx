import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Layout } from 'antd';
import toast from 'react-hot-toast';
import { MessageCircle, Bell } from 'lucide-react';
import Sidebar from './Sidebar';
import AIAssistant from '../ai-assistant';
import ParticleBackground from '../particle-background';
import { AuthModal, type AuthMode } from '../auth-modal';
import api from '../../utils/api';
import { isAuthenticated, setUserInfo } from '../../utils/auth';
import { useNotificationWebSocket, type NotificationMessage } from '../../hooks/useNotificationWebSocket';
import type { User, ApiResponse } from '../../types';

const { Content } = Layout;

const AUTH_MODAL_EVENT = 'open-auth-modal';

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  const loadUserInfo = useCallback(async () => {
    try {
      const data = await api.get('/user/profile') as ApiResponse<User>;
      if (data.code === 200) {
        setUser(data.data);
        setUserInfo({
          id: String(data.data.id),
          name: data.data.name,
          identity: data.data.identity,
        });
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

  useEffect(() => {
    if (isAuthenticated()) {
      loadUserInfo();
      loadNotificationCount();
    }
  }, [loadUserInfo, loadNotificationCount]);

  useEffect(() => {
    const handleAuthChange = () => {
      if (isAuthenticated()) {
        loadUserInfo();
        loadNotificationCount();
      } else {
        setUser(null);
        setNotificationCount(0);
      }
    };

    const notificationHandler = () => {
      if (isAuthenticated()) {
        loadNotificationCount();
      }
    };

    window.addEventListener('auth-changed', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);
    window.addEventListener('notification-updated', notificationHandler);
    return () => {
      window.removeEventListener('auth-changed', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
      window.removeEventListener('notification-updated', notificationHandler);
    };
  }, [loadUserInfo, loadNotificationCount]);

  useEffect(() => {
    const handleOpenAuthModal = (event: Event) => {
      const authEvent = event as CustomEvent<AuthMode>;
      setAuthMode(authEvent.detail || 'login');
      setAuthOpen(true);
    };

    window.addEventListener(AUTH_MODAL_EVENT, handleOpenAuthModal);
    return () => window.removeEventListener(AUTH_MODAL_EVENT, handleOpenAuthModal);
  }, []);

  // WebSocket 通知处理
  const handleNotificationMessage = useCallback((notification: NotificationMessage) => {
    console.log('[AppLayout] 收到新通知:', notification);
    
    // 更新未读计数
    setNotificationCount(prev => prev + 1);

    // 显示 Toast 通知
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-lg rounded-2xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 overflow-hidden`}
          style={{
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          }}
        >
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div 
                  className="h-10 w-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: 'var(--gemini-accent, #d3e3fd)' }}
                >
                  {notification.title === '回复通知' ? (
                    <MessageCircle className="h-5 w-5" style={{ color: 'var(--gemini-accent-text, #041e49)' }} />
                  ) : (
                    <Bell className="h-5 w-5" style={{ color: 'var(--gemini-accent-text, #041e49)' }} />
                  )}
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </p>
                {notification.description && (
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {notification.description}
                  </p>
                )}
              </div>
            </div>
          </div>
          <div className="flex border-l border-gray-200">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                window.location.href = '/notifications';
              }}
              className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-blue-600 hover:text-blue-500 focus:outline-none"
            >
              查看
            </button>
          </div>
        </div>
      ),
      {
        duration: 5000,
        position: 'top-right',
      }
    );
  }, []);

  // 启用 WebSocket 通知连接
  useNotificationWebSocket(handleNotificationMessage);

  return (
    <Layout 
      className="min-h-screen flex-row"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* 粒子背景 */}
      <ParticleBackground />
      
      <Sidebar
        user={user}
        notificationCount={notificationCount}
        loadUserInfo={loadUserInfo}
        loadNotificationCount={loadNotificationCount}
        collapsed
      />

      {/* 主内容区 */}
      <Layout 
        className="relative z-10 min-w-0 overflow-x-hidden" 
        style={{ 
          background: 'transparent',
          marginLeft: '80px',
          width: 'calc(100dvw - 80px)',
          maxWidth: 'calc(100dvw - 80px)',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Content
          className="min-h-[calc(100vh-64px-80px)] min-w-0 overflow-x-hidden py-6"
          style={{ paddingLeft: '4vw', paddingRight: '4vw' }}
        >
          <div className="min-w-0 w-full max-w-full animate-fade-in overflow-x-hidden">
            {children}
          </div>
        </Content>

      </Layout>

      {/* 认证模态框 */}
      <AuthModal
        open={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onModeChange={setAuthMode}
      />
      {/* AI 助手 */}
      <AIAssistant />
    </Layout>
  );
};

export default AppLayout;
