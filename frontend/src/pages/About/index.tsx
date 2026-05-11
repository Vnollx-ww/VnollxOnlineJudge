import { useState } from 'react';
import { Github, Mail, Heart, Code2, Shield, FileText, Clock } from 'lucide-react';
import { Modal } from '@/components';

type InfoModalType = 'privacy' | 'terms' | 'contact' | null;

const About: React.FC = () => {
  const [activeModal, setActiveModal] = useState<InfoModalType>(null);

  const infoCards = [
    {
      key: 'privacy' as const,
      icon: <Shield className="w-6 h-6" />,
      title: '隐私政策',
      description: '了解平台如何收集、使用和保护您的个人信息',
    },
    {
      key: 'terms' as const,
      icon: <FileText className="w-6 h-6" />,
      title: '服务条款',
      description: '查看使用本平台服务需要遵守的基本规则',
    },
    {
      key: 'contact' as const,
      icon: <Mail className="w-6 h-6" />,
      title: '联系我们',
      description: '通过邮箱、GitHub 或客服时间获取支持',
    },
  ];

  const modalTitle = infoCards.find((card) => card.key === activeModal)?.title;

  return (
    <div className="space-y-8">
      {/* Hero 区域 - Gemini 风格 */}
      <div 
        className="rounded-3xl text-center py-12 px-6"
        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
      >
        <div 
          className="w-20 h-20 mx-auto mb-6 rounded-3xl flex items-center justify-center"
          style={{ 
            background: 'linear-gradient(135deg, var(--gemini-accent) 0%, var(--gemini-accent-strong) 100%)',
            boxShadow: '0 8px 24px rgba(26, 115, 232, 0.3)'
          }}
        >
          <Code2 className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-semibold mb-4" style={{ color: 'var(--gemini-text-primary)' }}>
          关于 Vnollx OJ
        </h1>
        <p className="max-w-2xl mx-auto leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
          Vnollx Online Judge 是一个专为程序员打造的在线编程题练习平台。
          我们致力于提供优质的刷题体验，帮助每一位开发者提升算法能力。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {infoCards.map((card) => (
          <button
            key={card.key}
            type="button"
            onClick={() => setActiveModal(card.key)}
            className="w-full rounded-3xl p-6 text-left transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini)'}
          >
            <div className="mb-5 h-12 w-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-strong)' }}>
              {card.icon}
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
              {card.title}
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
              {card.description}
            </p>
          </button>
        ))}
      </div>

      {/* 底部 */}
      <div className="text-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="w-4 h-4" style={{ color: 'var(--gemini-error)' }} /> by Vnollx Team
        </p>
        <p className="mt-2">© 2026 VnollxOnlineJudge. All rights reserved.</p>
      </div>

      <Modal
        open={activeModal !== null}
        title={modalTitle}
        onCancel={() => setActiveModal(null)}
        footer={null}
        width={760}
      >
        {activeModal === 'privacy' && (
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
            <p>欢迎使用VnollxOnlineJudge平台（以下简称"本平台"）。我们尊重并保护所有使用本平台用户的个人隐私权。为了给您提供更准确、更优质的服务，本平台会按照本隐私政策的规定使用和披露您的个人信息。</p>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>一、信息收集</h3>
              <p>当您注册本平台账号时，我们可能会收集您的姓名、电子邮箱地址等信息，以便为您提供账户服务和个性化体验。</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>二、信息使用</h3>
              <p>我们收集的信息将用于以下目的：</p>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>提供、维护和改进我们的服务</li>
                <li>开发新功能和服务</li>
                <li>理解您如何使用我们的服务，以改善用户体验</li>
                <li>向您发送重要通知，如服务变更、安全提醒等</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>三、信息保护</h3>
              <p>本平台采用行业标准的安全技术和程序来保护您的个人信息免受未授权访问、使用或泄露。</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>四、联系我们</h3>
              <p>如果您对本隐私政策有任何疑问，请通过我们的联系方式与我们取得联系。</p>
            </div>
          </div>
        )}
        {activeModal === 'terms' && (
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
            <p>欢迎使用VnollxOnlineJudge平台。使用本平台服务即表示您同意本服务条款的全部内容。</p>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>一、服务内容</h3>
              <p>本平台提供算法题目练习、代码提交、在线评测、排名榜单等服务。</p>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>二、用户行为规范</h3>
              <ul className="list-disc list-inside space-y-1 pl-4">
                <li>不得提交任何违反法律法规、侵犯他人权益或含有恶意代码的内容</li>
                <li>不得利用本平台进行任何形式的作弊行为</li>
                <li>不得干扰或破坏本平台的正常运行</li>
                <li>不得冒充本平台工作人员或其他用户</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ color: 'var(--gemini-text-primary)' }}>三、知识产权</h3>
              <p>本平台提供的所有题目、评测系统、网站设计及相关内容的知识产权归本平台所有。</p>
            </div>
          </div>
        )}
        {activeModal === 'contact' && (
          <div className="space-y-4 text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
            <p>感谢您使用VnollxOnlineJudge平台。如果您有任何问题、建议或反馈，请通过以下方式与我们联系：</p>
            <div className="flex flex-wrap gap-4">
              <a href="mailto:2720741614@qq.com" className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-200" style={{ backgroundColor: 'var(--gemini-bg)', color: 'var(--gemini-text-secondary)' }}>
                <Mail className="w-4 h-4" />
                2720741614@qq.com
              </a>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2.5 rounded-full transition-all duration-200" style={{ backgroundColor: 'var(--gemini-bg)', color: 'var(--gemini-text-secondary)' }}>
                <Github className="w-4 h-4" />
                GitHub
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: 'var(--gemini-text-tertiary)' }} />
              <span>客服工作时间：周一至周五 9:00-18:00（法定节假日除外）</span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default About;
