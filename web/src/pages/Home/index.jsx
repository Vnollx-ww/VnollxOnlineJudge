import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Statistic, Row, Col, Button, Typography, message } from 'antd';
import { 
  BookOpen, 
  Users, 
  Code2, 
  Trophy, 
  ArrowRight,
  Terminal,
  Cpu,
  Globe
} from 'lucide-react';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import ParticleBackground from '../../components/ParticleBackground';
import CountUp from '../../components/CountUp';
import CodeWindow from '../../components/CodeWindow';
import './Home.css';

const { Title, Paragraph } = Typography;

const Home = ({ openAuthModal }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
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
      message.info('请先登录');
      openAuthModal && openAuthModal('login');
    }
  };

  const handleViewRank = () => {
    if (isAuthenticated()) {
      navigate('/ranklist');
    } else {
      message.info('请先登录');
      openAuthModal && openAuthModal('login');
    }
  };

  const handleRegister = () => {
    if (isAuthenticated()) {
      message.info('您已登录');
    } else {
      openAuthModal && openAuthModal('register');
    }
  };

  const loadStats = async () => {
    try {
      const [problemRes, userRes, submissionRes, competitionRes] =
        await Promise.all([
          api.get('/problem/count'),
          api.get('/user/count'),
          api.get('/submission/count'),
          api.get('/competition/count'),
        ]);

      setStats({
        problemCount: problemRes.code === 200 ? problemRes.data : 1000,
        userCount: userRes.code === 200 ? userRes.data : 5000,
        submissionCount:
          submissionRes.code === 200 ? submissionRes.data : 50000,
        competitionCount:
          competitionRes.code === 200 ? competitionRes.data : 100,
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
      icon: <BookOpen size={40} color="#1a73e8" />,
      title: '海量题库',
      description:
        '精选1000+道算法题目，覆盖数据结构、动态规划、图论等核心领域，助你夯实基础。',
    },
    {
      icon: <Cpu size={40} color="#66bb6a" />,
      title: '高性能评测',
      description:
        '分布式评测集群，支持毫秒级反馈。提供详细的内存、时间消耗分析，优化代码性能。',
    },
    {
      icon: <Trophy size={40} color="#ff9800" />,
      title: '竞赛系统',
      description:
        '支持ACM/OI赛制，实时榜单更新。定期举办积分赛，模拟真实大厂笔试环境。',
    },
    {
      icon: <Users size={40} color="#9c27b0" />,
      title: '极客社区',
      description:
        '汇聚算法爱好者，分享高质量题解。支持代码在线讨论，共同探索最优解。',
    },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        {/* Hero区域改为深色粒子以适配浅色背景 */}
        <ParticleBackground color="26, 115, 232" style={{ opacity: 0.4 }} />
        
        <div className="hero-content-wrapper">
          <Row gutter={[48, 48]} align="middle">
            <Col xs={24} lg={12}>
              <div className="hero-text-content">
                <div className="hero-badge">
                  <span className="badge-dot"></span>
                  Vnollx OJ 2.0 全新上线
                </div>
                <Title level={1} className="hero-title">
                  探索算法之美<br />
                  <span className="text-gradient">构建代码世界</span>
                </Title>
                <Paragraph className="hero-subtitle">
                  专为程序员打造的在线算法训练平台。无论你是算法初学者还是竞赛大神，在这里都能找到属于你的挑战。
                </Paragraph>
                <div className="hero-actions">
                  <Button
                    type="primary"
                    size="large"
                    className="cta-button primary"
                    icon={<Code2 size={20} />}
                    onClick={handleStartCoding}
                  >
                    开始刷题
                  </Button>
                  <Button
                    size="large"
                    className="cta-button secondary"
                    onClick={handleViewRank}
                  >
                    查看榜单
                  </Button>
                </div>
                
                <div className="hero-stats-mini">
                  <div className="stat-item-mini">
                    <strong>1000+</strong>
                    <span>精选题目</span>
                  </div>
                  <div className="divider"></div>
                  <div className="stat-item-mini">
                    <strong>50k+</strong>
                    <span>代码提交</span>
                  </div>
                  <div className="divider"></div>
                  <div className="stat-item-mini">
                    <strong>24h</strong>
                    <span>全天候评测</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div className="hero-visual">
                <div className="visual-glow"></div>
                <CodeWindow />
              </div>
            </Col>
          </Row>
        </div>
      </div>

      {/* Stats Section */}
      <div className="stats-section">
        <Row gutter={[32, 32]}>
          <Col xs={12} sm={12} lg={6}>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper blue">
                <BookOpen size={24} />
              </div>
              <Statistic
                value={stats.problemCount}
                formatter={(value) => <CountUp end={value} />}
                valueStyle={{ fontWeight: 'bold' }}
              />
              <div className="stat-label">算法题目</div>
            </div>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper green">
                <Users size={24} />
              </div>
              <Statistic
                value={stats.userCount}
                formatter={(value) => <CountUp end={value} />}
                valueStyle={{ fontWeight: 'bold' }}
              />
              <div className="stat-label">注册用户</div>
            </div>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper orange">
                <Terminal size={24} />
              </div>
              <Statistic
                value={stats.submissionCount}
                formatter={(value) => <CountUp end={value} />}
                valueStyle={{ fontWeight: 'bold' }}
              />
              <div className="stat-label">提交记录</div>
            </div>
          </Col>
          <Col xs={12} sm={12} lg={6}>
            <div className="stat-card-modern">
              <div className="stat-icon-wrapper purple">
                <Trophy size={24} />
              </div>
              <Statistic
                value={stats.competitionCount}
                formatter={(value) => <CountUp end={value} />}
                valueStyle={{ fontWeight: 'bold' }}
              />
              <div className="stat-label">竞赛场次</div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <div className="section-header">
          <Title level={2}>为什么选择 Vnollx OJ</Title>
          <Paragraph className="section-subtitle">
            我们致力于提供最优质的刷题体验，助你成为算法大师
          </Paragraph>
        </div>

        <Row gutter={[32, 32]} className="features-grid">
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="feature-card" hoverable bordered={false}>
                <div className="feature-icon-box">{feature.icon}</div>
                <Title level={4} className="feature-title">
                  {feature.title}
                </Title>
                <Paragraph className="feature-description">
                  {feature.description}
                </Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/* CTA Section */}
      <div className="cta-section">
        <div className="cta-content">
          <Title level={2} style={{ color: 'white', marginBottom: 16 }}>准备好接受挑战了吗？</Title>
          <Paragraph style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 32 }}>
            加入 Vnollx OJ，与数千名开发者一起提升编程能力。
          </Paragraph>
          <Button 
            type="primary" 
            size="large" 
            className="cta-button-glow"
            onClick={handleRegister}
          >
            立即免费注册 <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;


