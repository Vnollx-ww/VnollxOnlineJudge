import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { 
  BookOpen, 
  Users, 
  Code2, 
  Trophy, 
  ArrowRight,
  Terminal,
  Cpu,
  Sparkles,
} from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import { CountUp, CodeWindow } from '../../components';
import type { ApiResponse } from '../../types';

interface Stats {
  problemCount: number;
  userCount: number;
  submissionCount: number;
  competitionCount: number;
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    problemCount: 0,
    userCount: 0,
    submissionCount: 0,
    competitionCount: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const handleStartCoding = () => {
    if (isAuthenticated()) {
      navigate('/problems');
    } else {
      toast('请先登录后开始刷题', { 
        icon: '🔐',
        duration: 2000 
      });
      navigate('/login');
    }
  };

  const handleViewRank = () => {
    if (isAuthenticated()) {
      navigate('/ranklist');
    } else {
      toast('请先登录后查看榜单', { 
        icon: '🔐',
        duration: 2000 
      });
      navigate('/login');
    }
  };

  const handleRegister = () => {
    if (isAuthenticated()) {
      toast('您已登录', { 
        icon: '✅',
        duration: 2000 
      });
    } else {
      navigate('/register');
    }
  };

  const loadStats = async () => {
    try {
      const [problemRes, userRes, submissionRes, competitionRes] =
        await Promise.all([
          api.get('/problem/count') as Promise<ApiResponse<number>>,
          api.get('/user/count') as Promise<ApiResponse<number>>,
          api.get('/submission/count') as Promise<ApiResponse<number>>,
          api.get('/competition/count') as Promise<ApiResponse<number>>,
        ]);

      setStats({
        problemCount: problemRes.code === 200 ? problemRes.data : 1000,
        userCount: userRes.code === 200 ? userRes.data : 5000,
        submissionCount: submissionRes.code === 200 ? submissionRes.data : 50000,
        competitionCount: competitionRes.code === 200 ? competitionRes.data : 100,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
      setStats({
        problemCount: 1000,
        userCount: 5000,
        submissionCount: 50000,
        competitionCount: 100,
      });
    }
  };

  const features = [
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: '海量题库',
      description: '精选1000+道算法题目，覆盖数据结构、动态规划、图论等核心领域。',
      bgColor: '#e8f0fe',
      iconColor: '#1a73e8',
    },
    {
      icon: <Cpu className="w-7 h-7" />,
      title: '高性能评测',
      description: '分布式评测集群，支持毫秒级反馈，提供详细性能分析。',
      bgColor: '#e6f4ea',
      iconColor: '#34a853',
    },
    {
      icon: <Trophy className="w-7 h-7" />,
      title: '竞赛系统',
      description: '支持ACM/OI赛制，实时榜单更新，定期举办积分赛。',
      bgColor: '#fef7e0',
      iconColor: '#f9ab00',
    },
    {
      icon: <Users className="w-7 h-7" />,
      title: '极客社区',
      description: '汇聚算法爱好者，分享高质量题解，探索最优解法。',
      bgColor: '#f3e8fd',
      iconColor: '#9334e6',
    },
  ];

  const statItems = [
    { icon: BookOpen, value: stats.problemCount, label: '算法题目', bgColor: '#e8f0fe', iconColor: '#1a73e8' },
    { icon: Users, value: stats.userCount, label: '注册用户', bgColor: '#e6f4ea', iconColor: '#34a853' },
    { icon: Terminal, value: stats.submissionCount, label: '提交记录', bgColor: '#fef7e0', iconColor: '#f9ab00' },
    { icon: Trophy, value: stats.competitionCount, label: '竞赛场次', bgColor: '#f3e8fd', iconColor: '#9334e6' },
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
              <Sparkles className="w-4 h-4" style={{ color: 'var(--gemini-accent-strong)' }} />
              Vnollx OJ 2.0 全新上线
            </div>

            {/* Title */}
            <h1 
              className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight"
              style={{ color: 'var(--gemini-text-primary)' }}
            >
              探索算法之美
              <br />
              <span 
                className="bg-clip-text text-transparent"
                style={{ 
                  backgroundImage: 'linear-gradient(135deg, #1a73e8 0%, #041e49 100%)' 
                }}
              >
                构建代码世界
              </span>
            </h1>

            {/* Subtitle */}
            <p 
              className="text-lg max-w-xl"
              style={{ color: 'var(--gemini-text-secondary)' }}
            >
              专为程序员打造的在线算法训练平台。无论你是算法初学者还是竞赛大神，在这里都能找到属于你的挑战。
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
                <div className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>1000+</div>
                <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>精选题目</div>
              </div>
              <div className="w-px h-10" style={{ backgroundColor: 'var(--gemini-border)' }} />
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'var(--gemini-text-primary)' }}>50k+</div>
                <div className="text-sm" style={{ color: 'var(--gemini-text-disabled)' }}>代码提交</div>
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

      {/* Features Section */}
      <section className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4" style={{ color: 'var(--gemini-text-primary)' }}>
            为什么选择 Vnollx OJ
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: 'var(--gemini-text-secondary)' }}>
            我们致力于提供最优质的刷题体验，助你成为算法大师
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="gemini-card-elevated group cursor-pointer transition-all duration-300 hover:-translate-y-1 animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: feature.bgColor }}
              >
                <div style={{ color: feature.iconColor }}>
                  {feature.icon}
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--gemini-text-primary)' }}>
                {feature.title}
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--gemini-text-secondary)' }}>
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section - Gemini 风格渐变 */}
      <section className="py-16">
        <div 
          className="relative overflow-hidden rounded-3xl p-12 lg:p-16 text-center"
          style={{ 
            background: 'linear-gradient(135deg, #1a73e8 0%, #041e49 100%)' 
          }}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              准备好接受挑战了吗？
            </h2>
            <p className="text-white/80 text-lg mb-8">
              加入 Vnollx OJ，与数千名开发者一起提升编程能力。
            </p>
            <button
              onClick={handleRegister}
              className="gemini-btn inline-flex items-center gap-2 px-8 py-4 text-base transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              style={{ 
                backgroundColor: 'white', 
                color: '#1a73e8',
                fontWeight: 600
              }}
            >
              立即免费注册
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
