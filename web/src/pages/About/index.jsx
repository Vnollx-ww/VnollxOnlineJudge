import { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Button } from 'antd';
import {
  InfoCircleOutlined,
  CodeOutlined,
  CheckCircleOutlined,
  UserOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './About.css';

const { Title, Paragraph } = Typography;

const About = () => {
  const [stats, setStats] = useState({
    problemCount: 0,
    userCount: 0,
    submissionCount: 0,
  });
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    loadStats();
    const handleScroll = () => {
      setShowBackToTop(window.pageYOffset > 500);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const loadStats = async () => {
    try {
      const [problemRes, userRes, submissionRes] = await Promise.all([
        api.get('/problem/count'),
        api.get('/user/count'),
        api.get('/submission/count'),
      ]);

      setStats({
        problemCount: problemRes.code === 200 ? problemRes.data : 0,
        userCount: userRes.code === 200 ? userRes.data : 0,
        submissionCount: submissionRes.code === 200 ? submissionRes.data : 0,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const languages = [
    { name: 'C/C++', icon: 'C', desc: '支持最新标准' },
    { name: 'Python', icon: 'Py', desc: '3.x 版本支持' },
    { name: 'Java', icon: 'J', desc: '8+ 版本支持' },
  ];

  const features = [
    {
      icon: <CheckCircleOutlined style={{ fontSize: 48 }} />,
      title: '丰富的题目集',
      description:
        '我们拥有大量涵盖各种主题的问题，如数据结构、算法和编程范式。每个问题都配有详细的描述和测试用例。',
    },
    {
      icon: <CodeOutlined style={{ fontSize: 48 }} />,
      title: '实时评测',
      description:
        '一旦你提交代码，我们的评测引擎将迅速评估，并为你提供关于解决方案正确性和性能的即时反馈。',
    },
    {
      icon: <UserOutlined style={{ fontSize: 48 }} />,
      title: '社区支持',
      description:
        '加入我们的程序员社区，一起讨论问题、分享解决方案并相互学习。你还可以参加竞赛，与其他程序员一较高下。',
    },
  ];

  return (
    <div className="about-container">
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <Title level={1} className="hero-title">
            关于 <span className="text-gradient">Vnollx 在线评测系统</span>
          </Title>
          <Paragraph className="hero-subtitle">
            Vnollx 在线评测系统是一个强大且高效的在线评测平台，旨在帮助你提升编程技能。这里拥有海量的编程题目和实时评测功能，支持多种编程语言。
          </Paragraph>
        </div>
      </div>

      {/* 关于系统 */}
      <Card className="content-card">
        <Title level={2} className="section-title">
          <InfoCircleOutlined /> Vnollx 在线评测系统是什么？
        </Title>
        <div className="content-text">
          <Paragraph>
            Vnollx 在线评测系统是一个创新的在线平台，为程序员提供了一个全面的环境来练习和提高他们的编码能力。它提供了广泛的算法问题，从入门级到高级难度，适合不同技能水平的程序员。
          </Paragraph>
          <Paragraph>
            我们的平台配备了高性能的评测引擎，可以快速准确地评估你的代码提交。无论你是正在学习编程的学生、想要提升技能的专业开发者，还是正在为竞赛做准备的竞赛选手，Vnollx
            在线评测系统都能满足你的需求。
          </Paragraph>
          <Paragraph>
            系统设计注重用户体验，界面简洁直观，操作流程简单，让你可以专注于解决问题本身，而不是纠结于平台的使用。
          </Paragraph>
        </div>
      </Card>

      {/* 支持的编程语言 */}
      <Card className="content-card">
        <Title level={2} className="section-title">
          <CodeOutlined /> 支持的编程语言
        </Title>
        <Paragraph className="content-text">
          Vnollx 在线评测系统支持多种流行的编程语言，让你可以使用自己喜欢的语言来解决问题。我们持续扩展支持的语言列表，以满足不同开发者的需求：
        </Paragraph>
        <Row gutter={[24, 24]} className="languages-grid">
          {languages.map((lang, index) => (
            <Col xs={24} sm={8} key={index}>
              <Card className="language-card" hoverable>
                <div className="language-icon">{lang.icon}</div>
                <Title level={4}>{lang.name}</Title>
                <Paragraph type="secondary">{lang.desc}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 系统特性 */}
      <Card className="content-card">
        <Title level={2} className="section-title" style={{ textAlign: 'center' }}>
          系统特性
        </Title>
        <Row gutter={[24, 24]} className="features-grid">
          {features.map((feature, index) => (
            <Col xs={24} md={8} key={index}>
              <Card className="feature-card" hoverable>
                <div className="feature-icon-wrapper">{feature.icon}</div>
                <Title level={4}>{feature.title}</Title>
                <Paragraph>{feature.description}</Paragraph>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      {/* 统计数据 */}
      <div className="stats-section">
        <Row gutter={[24, 24]}>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title="题目数量"
                value={stats.problemCount}
                valueStyle={{ color: '#1a73e8' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title="注册用户"
                value={stats.userCount}
                valueStyle={{ color: '#1a73e8' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title="代码提交"
                value={stats.submissionCount}
                valueStyle={{ color: '#1a73e8' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="stat-card">
              <Statistic
                title="支持语言"
                value="3+"
                valueStyle={{ color: '#1a73e8' }}
              />
            </Card>
          </Col>
        </Row>
      </div>

      {/* 返回顶部按钮 */}
      {showBackToTop && (
        <Button
          type="primary"
          shape="circle"
          icon={<ArrowUpOutlined />}
          size="large"
          className="back-to-top"
          onClick={scrollToTop}
        />
      )}
    </div>
  );
};

export default About;
