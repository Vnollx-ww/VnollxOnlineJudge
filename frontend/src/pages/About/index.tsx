import { Github, Mail, Heart, Code2, Users, Trophy } from 'lucide-react';

const About: React.FC = () => {
  const features = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: '在线代码编辑',
      description: '支持 C++、Python、Java 多种语言，内置智能代码补全',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: '竞赛系统',
      description: '支持 ACM/OI 赛制，实时榜单更新，模拟真实比赛环境',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: '社区互动',
      description: '题目评论讨论，题解分享，与其他选手交流心得',
    },
  ];

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
          Vnollx Online Judge 是一个专为程序员打造的在线算法训练平台。
          我们致力于提供优质的刷题体验，帮助每一位开发者提升算法能力。
        </p>
      </div>

      {/* 功能特点 - Gemini 卡片 */}
      <div className="grid md:grid-cols-3 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="rounded-3xl text-center p-6 group transition-all duration-300 hover:-translate-y-1"
            style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
            onMouseEnter={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.boxShadow = 'var(--shadow-gemini)'}
          >
            <div 
              className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300"
              style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-strong)' }}
            >
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
              {feature.title}
            </h3>
            <p className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* 技术栈 - Gemini 芯片风格 */}
      <div 
        className="rounded-3xl p-6"
        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
      >
        <h2 className="text-xl font-semibold mb-6 text-center" style={{ color: 'var(--gemini-text-primary)' }}>
          技术栈
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {['React', 'TypeScript', 'Tailwind CSS', 'Ant Design', 'Spring Boot', 'MySQL', 'Redis', 'Docker'].map((tech) => (
            <span
              key={tech}
              className="px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-default"
              style={{ 
                backgroundColor: 'var(--gemini-bg)', 
                color: 'var(--gemini-text-secondary)' 
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--gemini-accent)';
                e.currentTarget.style.color = 'var(--gemini-accent-text)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
                e.currentTarget.style.color = 'var(--gemini-text-secondary)';
              }}
            >
              {tech}
            </span>
          ))}
        </div>
      </div>

      {/* 联系方式 */}
      <div 
        className="rounded-3xl text-center p-6"
        style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
      >
        <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--gemini-text-primary)' }}>
          联系我们
        </h2>
        <div className="flex justify-center gap-6">
          <a
            href="mailto:2720741614@qq.com"
            className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--gemini-bg)', 
              color: 'var(--gemini-text-secondary)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-accent)';
              e.currentTarget.style.color = 'var(--gemini-accent-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
              e.currentTarget.style.color = 'var(--gemini-text-secondary)';
            }}
          >
            <Mail className="w-5 h-5" />
            邮箱联系
          </a>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-full transition-all duration-200"
            style={{ 
              backgroundColor: 'var(--gemini-bg)', 
              color: 'var(--gemini-text-secondary)' 
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-accent)';
              e.currentTarget.style.color = 'var(--gemini-accent-text)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--gemini-bg)';
              e.currentTarget.style.color = 'var(--gemini-text-secondary)';
            }}
          >
            <Github className="w-5 h-5" />
            GitHub
          </a>
        </div>
      </div>

      {/* 底部 */}
      <div className="text-center text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>
        <p className="flex items-center justify-center gap-1">
          Made with <Heart className="w-4 h-4" style={{ color: 'var(--gemini-error)' }} /> by Vnollx Team
        </p>
        <p className="mt-2">© 2025 VnollxOnlineJudge. All rights reserved.</p>
      </div>
    </div>
  );
};

export default About;
