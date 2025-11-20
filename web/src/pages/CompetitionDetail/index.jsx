import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Input,
  App,
  Spin,
  Empty,
} from 'antd';
import {
  TrophyOutlined,
  ClockCircleOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './CompetitionDetail.css';

const { Title, Text, Paragraph } = Typography;

const CompetitionDetail = () => {
  const { message } = App.useApp();
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/login');
      return;
    }
    loadCompetition();
  }, [id]);

  useEffect(() => {
    if (competition) {
      checkPassword();
      updateCountdown();
      const timer = setInterval(updateCountdown, 1000);
      return () => clearInterval(timer);
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadProblems();
    }
  }, [passwordVerified, competition]);

  const loadCompetition = async () => {
    try {
      // 从比赛列表API获取比赛信息
      const data = await api.get('/competition/list');
      if (data.code === 200) {
        const comp = data.data.find((c) => c.id.toString() === id);
        if (comp) {
          setCompetition(comp);
        } else {
          message.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        navigate('/login');
      } else {
        message.error('加载比赛信息失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const checkPassword = () => {
    if (competition && competition.needPassword) {
      // 检查localStorage中是否已验证
      const verified = localStorage.getItem(`competition_${id}_verified`);
      if (verified === 'true') {
        setPasswordVerified(true);
      } else {
        setPasswordModalVisible(true);
      }
    } else {
      setPasswordVerified(true);
    }
  };

  const handleVerifyPassword = async () => {
    try {
      const data = await api.post('/competition/confirm', {
        id: id,
        password: password,
      });
      if (data.code === 200) {
        message.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        message.error(data.msg || '密码错误');
      }
    } catch (error) {
      // 优先显示后端返回的错误消息
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      message.error(errorMsg);
      console.error(error);
    }
  };

  const loadProblems = async () => {
    try {
      const data = await api.get('/competition/list-problem', {
        params: { id: id },
      });
      if (data.code === 200) {
        setProblems(data.data || []);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        navigate('/login');
      } else {
        message.error('加载题目列表失败');
        console.error(error);
      }
    }
  };

  const updateCountdown = () => {
    if (!competition) return;

    const now = new Date();
    const beginTime = new Date(competition.beginTime);
    const endTime = new Date(competition.endTime);

    if (now < beginTime) {
      setStatus('upcoming');
      const diff = beginTime - now;
      setCountdown(calculateTimeRemaining(diff));
    } else if (now >= beginTime && now <= endTime) {
      setStatus('running');
      const diff = endTime - now;
      setCountdown(calculateTimeRemaining(diff));
    } else {
      setStatus('ended');
      setCountdown(null);
    }
  };

  const calculateTimeRemaining = (diff) => {
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { days, hours, minutes, seconds };
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const getStatusTag = () => {
    switch (status) {
      case 'upcoming':
        return <Tag color="orange">未开始</Tag>;
      case 'running':
        return <Tag color="green">进行中</Tag>;
      case 'ended':
        return <Tag color="default">已结束</Tag>;
      default:
        return null;
    }
  };

  const getDifficultyTag = (difficulty) => {
    const colors = {
      "简单": 'green',
      "中等": 'orange',
      "困难": 'red',
    };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  const problemColumns = [
    {
      title: '题号',
      key: 'index',
      width: 80,
      render: (_, __, index) => String.fromCharCode('A'.charCodeAt(0) + index),
    },
    {
      title: '题目名称',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <Link
          to={`/competition/${id}/problem/${record.id}`}
          style={{ color: '#1a73e8', fontWeight: 500 }}
        >
          {title}
        </Link>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty) => getDifficultyTag(difficulty),
    },
    {
      title: '提交数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 100,
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 100,
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 100,
      render: (_, record) => {
        const rate =
          record.submitCount === 0
            ? 0
            : ((record.passCount / record.submitCount) * 100).toFixed(1);
        return `${rate}%`;
      },
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!competition) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Empty description="比赛不存在" />
      </div>
    );
  }

  return (
    <div className="competition-detail">
      {/* 导航栏 */}
      <div className="competition-nav">
        <Space size="large">
          <Button type="link" className="nav-button active">
            <UnorderedListOutlined /> 比赛详情
          </Button>
          <Link to={`/competition/${id}/ranklist`}>
            <Button type="link" className="nav-button">
              <TrophyOutlined /> 比赛排行榜
            </Button>
          </Link>
          <Link to={`/competition/${id}/submissions`}>
            <Button type="link" className="nav-button">
              <HistoryOutlined /> 比赛提交记录
            </Button>
          </Link>
        </Space>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* 比赛基本信息 */}
        <Card className="info-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '24px' }}>
            <div style={{ flex: 1, minWidth: 300 }}>
              <Title level={2} style={{ marginBottom: 16 }}>
                {competition.title}
              </Title>
              <Space style={{ marginBottom: 16 }}>
                {getStatusTag()}
                {competition.needPassword && (
                  <Tag icon={<LockOutlined />} color="purple">
                    需要密码
                  </Tag>
                )}
              </Space>
              <Paragraph style={{ color: '#666', lineHeight: 1.8 }}>
                {competition.description || '暂无描述'}
              </Paragraph>
            </div>
            <div style={{ minWidth: 250 }}>
              <div style={{ marginBottom: 12 }}>
                <Text strong>开始时间：</Text>
                <br />
                <Text>{formatTime(competition.beginTime)}</Text>
              </div>
              <div style={{ marginBottom: 12 }}>
                <Text strong>结束时间：</Text>
                <br />
                <Text>{formatTime(competition.endTime)}</Text>
              </div>
              {countdown && (
                <div style={{ marginTop: 16 }}>
                  <Space>
                    <ClockCircleOutlined />
                    <Text strong>剩余时间：</Text>
                  </Space>
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {countdown.days > 0 && (
                      <Tag color="blue">{countdown.days}天</Tag>
                    )}
                    {countdown.hours > 0 && (
                      <Tag color="cyan">{countdown.hours}小时</Tag>
                    )}
                    {countdown.minutes > 0 && (
                      <Tag color="orange">{countdown.minutes}分钟</Tag>
                    )}
                    <Tag color="red">{countdown.seconds}秒</Tag>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* 比赛题目列表 */}
        {passwordVerified ? (
          <Card
            className="info-card"
            style={{ marginTop: 24 }}
            title={
              <Space>
                <UnorderedListOutlined />
                <span>比赛题目列表</span>
              </Space>
            }
          >
            {problems.length === 0 ? (
              <Empty description="暂无题目" />
            ) : (
              <Table
                columns={problemColumns}
                dataSource={problems}
                rowKey="id"
                pagination={false}
              />
            )}
          </Card>
        ) : (
          <Card style={{ marginTop: 24, textAlign: 'center' }}>
            <Text type="secondary">请输入密码以查看比赛题目</Text>
          </Card>
        )}
      </div>

      {/* 密码验证Modal */}
      <Modal
        title={
          <Space>
            <LockOutlined />
            <span>请输入比赛密码</span>
          </Space>
        }
        open={passwordModalVisible}
        onOk={handleVerifyPassword}
        onCancel={() => {
          navigate('/competitions');
        }}
        okText="验证"
        cancelText="取消"
        closable={false}
        maskClosable={false}
      >
        <Input.Password
          placeholder="请输入比赛访问密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={handleVerifyPassword}
          autoFocus
        />
      </Modal>
    </div>
  );
};

export default CompetitionDetail;
