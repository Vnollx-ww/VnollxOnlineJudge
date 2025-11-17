import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Statistic, Row, Col, Button, Typography } from 'antd';
import {
  BookOutlined,
  UserOutlined,
  CodeOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './Home.css';

const { Title, Paragraph } = Typography;

const Home = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    problemCount: 0,
    userCount: 0,
    submissionCount: 0,
    competitionCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

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
      // 使用默认值
      setStats({
        problemCount: 1000,
        userCount: 5000,
        submissionCount: 50000,
        competitionCount: 100,
      });
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: <BookOutlined style={{ fontSize: 48, color: '#1a73e8' }} />,
      title: '丰富的题目资源',
      description:
        '1000+道精选算法题，覆盖基础到进阶难度，分类清晰，包含详细解题思路和参考答案，满足不同阶段学习者的需求。',
    },
    {
      icon: <CodeOutlined style={{ fontSize: 48, color: '#66bb6a' }} />,
      title: '实时评测系统',
      description:
        '高效的在线评测系统，提交代码后立即获得反馈，包含详细的错误信息和运行时间、内存占用等性能指标。',
    },
    {
      icon: <TrophyOutlined style={{ fontSize: 48, color: '#ff9800' }} />,
      title: '竞赛与排名',
      description:
        '定期举办算法竞赛，真实模拟比赛环境，个人和团队排行榜实时更新，激发学习动力，见证成长历程。',
    },
    {
      icon: <UserOutlined style={{ fontSize: 48, color: '#9c27b0' }} />,
      title: '社区交流',
      description:
        '活跃的用户社区，支持题解分享和讨论，与志同道合的开发者交流学习经验，共同进步。',
    },
  ];

  return (
    <div className="home-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <Title level={1} className="hero-title">
            用代码解决算法难题
          </Title>
          <Paragraph className="hero-subtitle">
            精选1000+算法题目，支持Python/Java/C++等多种语言在线提交，实时评测系统助你快速提升编程能力
          </Paragraph>

          {/* 统计数据 */}
          <Row gutter={[32, 32]} className="stats-row">
            <Col xs={12} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="算法题目"
                  value={stats.problemCount}
                  prefix={<BookOutlined />}
                  valueStyle={{ color: '#1a73e8' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="注册用户"
                  value={stats.userCount}
                  prefix={<UserOutlined />}
                  valueStyle={{ color: '#66bb6a' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="代码提交"
                  value={stats.submissionCount}
                  prefix={<CodeOutlined />}
                  valueStyle={{ color: '#ff9800' }}
                />
              </Card>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <Card className="stat-card">
                <Statistic
                  title="竞赛场次"
                  value={stats.competitionCount}
                  prefix={<TrophyOutlined />}
                  valueStyle={{ color: '#9c27b0' }}
                />
              </Card>
            </Col>
          </Row>

          <Button
            type="primary"
            size="large"
            className="cta-button"
            onClick={() => navigate('/problems')}
          >
            立即开始挑战
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="features-section">
        <Title level={2} className="section-title">
          平台特色
        </Title>
        <Paragraph className="section-subtitle">
          我们提供全方位的算法训练支持，帮助你高效提升编程能力，轻松应对各类算法挑战
        </Paragraph>

        <Row gutter={[24, 24]} className="features-grid">
          {features.map((feature, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card className="feature-card" hoverable>
                <div className="feature-icon">{feature.icon}</div>
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
    </div>
  );
};

export default Home;

