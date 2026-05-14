import { 
  BookOpen, 
  Users, 
  Code2, 
  Trophy, 
  Terminal,
  Bot,
} from 'lucide-react';
import { CountUp, CodeWindow } from '@/components';
import { useHome } from '@/hooks/home/useHome';

const Home: React.FC = () => {
  const { stats, handleStartCoding, handleViewRank } = useHome();

  const statItems = [
    { icon: BookOpen, value: stats.problemCount, label: '算法题目', bgColor: '#e8f0fe', iconColor: '#1a73e8' },
    { icon: Users, value: stats.userCount, label: '注册用户', bgColor: '#e6f4ea', iconColor: '#34a853' },
    { icon: Terminal, value: stats.submissionCount, label: '提交记录', bgColor: '#fef7e0', iconColor: '#f9ab00' },
    { icon: Trophy, value: stats.competitionCount, label: '竞赛场次', bgColor: '#f3e8fd', iconColor: '#9334e6' },
  ];

  const featureItems = [
    {
      icon: Code2,
      title: '在线代码编辑',
      description: '支持 C++、Python、Java 多种语言，内置智能代码补全',
    },
    {
      icon: Trophy,
      title: '竞赛系统',
      description: '支持 ACM/OI 赛制，实时榜单更新，模拟真实比赛环境',
    },
    {
      icon: Users,
      title: '社区互动',
      description: '题目评论讨论，题解分享，与其他选手交流心得',
    },
    {
      icon: Bot,
      title: '多 AI 辅助学习',
      description: '系统接入 Gemini、DeepSeek V4 等多种 AI 模型，辅助理解题目、优化思路与提升学习效率',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slide-up">
            {/* Badge */}
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium"
              style={{ 
                backgroundColor: 'var(--gemini-accent)', 
                color: 'var(--gemini-accent-text)' 
              }}
            >
            </div>

            {/* Title */}
            <h1 
              className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
              style={{ color: 'var(--gemini-text-primary)' }}
            >
              在线编程题练习平台
              <br />

            </h1>

            {/* Subtitle */}
            <p 
              className="text-lg max-w-xl"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              提供题目练习、竞赛参与与代码提交服务，适合日常刷题与算法能力提升。
            </p>

            {/* Actions - Gemini 风格按钮 */}
            <div className="flex flex-wrap gap-4">
              <button
                onClick={handleStartCoding}
                className="gemini-btn inline-flex items-center gap-2 px-8 py-4 text-base"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)', 
                  color: 'var(--gemini-accent-text)',
                  fontWeight: 600
                }}
              >
                <Code2 className="w-5 h-5" />
                开始刷题
              </button>
              <button
                onClick={handleViewRank}
                className="gemini-btn px-8 py-4 text-base transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                  color: 'var(--gemini-accent-strong)',
                  border: '1px solid var(--gemini-border)',
                  fontWeight: 600
                }}
              >
                查看榜单
              </button>
            </div>

            {/* Mini Stats */}
            <div className="flex items-center gap-6 pt-4">
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>{stats.problemCount}</div>
                <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>算法题目</div>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: 'var(--gemini-border)' }} />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>{stats.submissionCount}</div>
                <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>提交记录</div>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: 'var(--gemini-border)' }} />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>24h</div>
                <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>全天候评测</div>
              </div>
            </div>
          </div>

          {/* Right Visual */}
          <div className="relative flex justify-center lg:justify-end animate-fade-in" style={{ animationDelay: '200ms' }}>
            {/* Glow Effect */}
            <div 
              className="absolute inset-0 blur-3xl rounded-full scale-90 opacity-30"
              style={{ 
                background: 'linear-gradient(135deg, var(--gemini-accent) 0%, #c2d9fc 50%, var(--gemini-info-bg) 100%)' 
              }}
            />
            <CodeWindow />
          </div>
        </div>
      </section>

      {/* Stats Section - Gemini 卡片风格 */}
      <section className="py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {statItems.map((item, index) => (
            <div
              key={index}
              className="gemini-card-elevated flex flex-col items-center text-center p-6 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: item.bgColor }}
              >
                <item.icon className="w-6 h-6" style={{ color: item.iconColor }} />
              </div>
              <div className="text-3xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>
                <CountUp end={item.value} />
              </div>
              <div className="text-sm mt-1" style={{ color: 'var(--gemini-text-disabled)' }}>{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      

      {/* Feature Section - Gemini 风格渐变 */}
      <section className="py-16">
        <div 
          className="relative rounded-3xl"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featureItems.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl p-6 text-center transition-all duration-300 hover:-translate-y-1"
                style={{ backgroundColor: 'var(--gemini-surface)', boxShadow: 'var(--shadow-gemini)' }}
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl" style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-strong)' }}>
                  <item.icon className="h-6 w-6" />
                </div>
                <h2 className="mb-2 text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                  {item.title}
                </h2>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
