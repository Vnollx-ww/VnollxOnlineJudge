import React, { useState, useEffect, useCallback, type ReactNode } from 'react';
import { Layout, Modal, Typography } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';
import AIAssistant from '../AIAssistant';
import ParticleBackground from '../ParticleBackground';
import api from '../../utils/api';
import { isAuthenticated, setUserInfo } from '../../utils/auth';
import type { User, ApiResponse } from '../../types';

const { Content, Footer } = Layout;
const { Title, Paragraph } = Typography;

interface AppLayoutProps {
  children: ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [privacyVisible, setPrivacyVisible] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  const [contactVisible, setContactVisible] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'top' | 'left'>(() => {
    return (localStorage.getItem('layoutMode') as 'top' | 'left') || 'left';
  });
  const [user, setUser] = useState<User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

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

  const toggleLayoutMode = () => {
    const newMode = layoutMode === 'top' ? 'left' : 'top';
    setLayoutMode(newMode);
    localStorage.setItem('layoutMode', newMode);
  };

  return (
    <Layout 
      className={`min-h-screen ${layoutMode === 'left' ? 'flex-row' : 'flex-col'}`}
      style={{ backgroundColor: 'transparent' }}
    >
      {/* 粒子背景 */}
      <ParticleBackground />
      
      {/* 导航 */}
      {layoutMode === 'left' ? (
        <Sidebar
          user={user}
          notificationCount={notificationCount}
          loadUserInfo={loadUserInfo}
          loadNotificationCount={loadNotificationCount}
          layoutMode={layoutMode}
          toggleLayoutMode={toggleLayoutMode}
        />
      ) : (
        <Header
          layoutMode={layoutMode}
          toggleLayoutMode={toggleLayoutMode}
        />
      )}

      {/* 主内容区 */}
      <Layout 
        className="relative z-10" 
        style={{ 
          background: 'transparent',
          marginLeft: layoutMode === 'left' ? '224px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
      >
        <Content className={`
          min-h-[calc(100vh-64px-80px)] 
          ${layoutMode === 'top' ? 'pt-16' : 'pt-6'}
          px-4 md:px-6 lg:px-8
          py-6
        `}>
          <div className="max-w-7xl mx-auto animate-fade-in">
            {children}
          </div>
        </Content>

        {/* 页脚 - Gemini 风格 */}
        <Footer 
          className="py-6"
          style={{ 
            background: 'transparent', 
            borderTop: '1px solid var(--gemini-border-light)' 
          }}
        >
          <div className="max-w-7xl mx-auto text-center">
            <div 
              className="flex flex-wrap items-center justify-center gap-4 text-sm"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              <span>© 2025 VnollxOnlineJudge</span>
              <button
                onClick={() => setPrivacyVisible(true)}
                className="transition-colors duration-200 hover:opacity-80"
                style={{ color: 'var(--gemini-text-tertiary)' }}
              >
                隐私政策
              </button>
              <button
                onClick={() => setTermsVisible(true)}
                className="transition-colors duration-200 hover:opacity-80"
                style={{ color: 'var(--gemini-text-tertiary)' }}
              >
                服务条款
              </button>
              <button
                onClick={() => setContactVisible(true)}
                className="transition-colors duration-200 hover:opacity-80"
                style={{ color: 'var(--gemini-text-tertiary)' }}
              >
                联系我们
              </button>
            </div>
            <div 
              className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs"
              style={{ color: 'var(--gemini-text-disabled)' }}
            >
              <div className="flex items-center gap-1">
                <img
                  src="https://beian.mps.gov.cn/web/assets/logo01.6189a29f.png"
                  alt="备案图标"
                  className="w-4 h-4"
                />
                <a
                  href="https://beian.mps.gov.cn/#/query/webSearch?code=50010802006523"
                  rel="noreferrer"
                  target="_blank"
                  className="hover:opacity-80 transition-opacity"
                >
                  渝公网安备50010802006523号
                </a>
              </div>
              <a
                href="https://beian.miit.gov.cn/#/Integrated/index"
                target="_blank"
                rel="noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                渝ICP备2025055483号-1
              </a>
            </div>
          </div>
        </Footer>
      </Layout>

      {/* 隐私政策模态框 */}
      <Modal
        title={<span style={{ color: 'var(--gemini-text-primary)', fontWeight: 600 }}>隐私政策</span>}
        open={privacyVisible}
        onCancel={() => setPrivacyVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div className="py-4 space-y-6" style={{ color: 'var(--gemini-text-primary)' }}>
          <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
            欢迎使用VnollxOnlineJudge平台（以下简称"本平台"）。我们尊重并保护所有使用本平台用户的个人隐私权。为了给您提供更准确、更优质的服务，本平台会按照本隐私政策的规定使用和披露您的个人信息。
          </Paragraph>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>一、信息收集</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              当您注册本平台账号时，我们可能会收集您的姓名、电子邮箱地址等信息，以便为您提供账户服务和个性化体验。
            </Paragraph>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>二、信息使用</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)', marginBottom: 8 }}>我们收集的信息将用于以下目的：</Paragraph>
            <ul className="list-disc list-inside space-y-1 pl-4" style={{ color: 'var(--gemini-text-secondary)' }}>
              <li>提供、维护和改进我们的服务</li>
              <li>开发新功能和服务</li>
              <li>理解您如何使用我们的服务，以改善用户体验</li>
              <li>向您发送重要通知，如服务变更、安全提醒等</li>
            </ul>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>三、信息保护</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              本平台采用行业标准的安全技术和程序来保护您的个人信息免受未授权访问、使用或泄露。
            </Paragraph>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>四、联系我们</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              如果您对本隐私政策有任何疑问，请通过我们的联系方式与我们取得联系。
            </Paragraph>
          </div>
        </div>
      </Modal>

      {/* 服务条款模态框 */}
      <Modal
        title={<span style={{ color: 'var(--gemini-text-primary)', fontWeight: 600 }}>服务条款</span>}
        open={termsVisible}
        onCancel={() => setTermsVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div className="py-4 space-y-6" style={{ color: 'var(--gemini-text-primary)' }}>
          <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
            欢迎使用VnollxOnlineJudge平台。使用本平台服务即表示您同意本服务条款的全部内容。
          </Paragraph>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>一、服务内容</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              本平台提供算法题目练习、代码提交、在线评测、排名榜单等服务。
            </Paragraph>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>二、用户行为规范</Title>
            <ul className="list-disc list-inside space-y-1 pl-4" style={{ color: 'var(--gemini-text-secondary)' }}>
              <li>不得提交任何违反法律法规、侵犯他人权益或含有恶意代码的内容</li>
              <li>不得利用本平台进行任何形式的作弊行为</li>
              <li>不得干扰或破坏本平台的正常运行</li>
              <li>不得冒充本平台工作人员或其他用户</li>
            </ul>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>三、知识产权</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              本平台提供的所有题目、评测系统、网站设计及相关内容的知识产权归本平台所有。
            </Paragraph>
          </div>
        </div>
      </Modal>

      {/* 联系我们模态框 */}
      <Modal
        title={<span style={{ color: 'var(--gemini-text-primary)', fontWeight: 600 }}>联系我们</span>}
        open={contactVisible}
        onCancel={() => setContactVisible(false)}
        footer={null}
        width={800}
        centered
      >
        <div className="py-4 space-y-6" style={{ color: 'var(--gemini-text-primary)' }}>
          <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
            感谢您使用VnollxOnlineJudge平台。如果您有任何问题、建议或反馈，请通过以下方式与我们联系：
          </Paragraph>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>电子邮件</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              技术反馈：<span style={{ color: 'var(--gemini-accent-strong)' }}>2720741614@qq.com</span>
            </Paragraph>
          </div>

          <div>
            <Title level={5} style={{ color: 'var(--gemini-text-primary)', marginBottom: 8 }}>工作时间</Title>
            <Paragraph style={{ color: 'var(--gemini-text-secondary)' }}>
              客服工作时间：周一至周五 9:00-18:00（法定节假日除外）
            </Paragraph>
          </div>
        </div>
      </Modal>

      {/* 认证模态框 */}
      {/* AI 助手 */}
      <AIAssistant />
    </Layout>
  );
};

export default AppLayout;
