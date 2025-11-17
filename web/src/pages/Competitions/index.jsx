import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  Checkbox,
  Progress,
  message,
  Space,
  Row,
  Col,
} from 'antd';
import {
  TrophyOutlined,
  PlayCircleOutlined,
  ClockCircleOutlined,
  FlagOutlined,
  UserOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './Competitions.css';

const { Title, Text } = Typography;

const Competitions = () => {
  const navigate = useNavigate();
  const [competitions, setCompetitions] = useState([]);
  const [allCompetitions, setAllCompetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterRunning, setFilterRunning] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadCompetitions();
  }, []);

  useEffect(() => {
    filterCompetitions();
  }, [filterRunning, allCompetitions]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/competition/list');
      if (data.code === 200) {
        const sorted = data.data.sort(
          (a, b) => new Date(b.endTime) - new Date(a.endTime)
        );
        setAllCompetitions(sorted);
        setCompetitions(sorted);
      }
    } catch (error) {
      message.error('加载比赛列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterCompetitions = () => {
    if (filterRunning) {
      const filtered = allCompetitions.filter(
        (comp) => calculateStatus(comp.beginTime, comp.endTime) === '进行中'
      );
      setCompetitions(filtered);
    } else {
      setCompetitions(allCompetitions);
    }
  };

  const calculateStatus = (beginTime, endTime) => {
    const now = new Date();
    const begin = new Date(beginTime);
    const end = new Date(endTime);

    if (now < begin) return '暂未开始';
    if (now < end) return '进行中';
    return '已结束';
  };

  const calculateProgress = (beginTime, endTime) => {
    const now = Date.now();
    const start = new Date(beginTime).getTime();
    const end = new Date(endTime).getTime();

    if (now < start) return 0;
    if (now > end) return 100;
    return ((now - start) / (end - start)) * 100;
  };

  const formatTime = (timeStr) => {
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusConfig = (status) => {
    const configs = {
      "进行中": {
        color: 'processing',
        icon: <PlayCircleOutlined />,
        text: '进行中',
      },
      "暂未开始": {
        color: 'default',
        icon: <ClockCircleOutlined />,
        text: '暂未开始',
      },
      "已结束": {
        color: 'error',
        icon: <FlagOutlined />,
        text: '已结束',
      },
    };
    return configs[status] || configs['暂未开始'];
  };

  const handleJoin = (id, status) => {
    if (status === '暂未开始') {
      message.warning('比赛暂未开始，无法进入');
      return;
    }
    navigate(`/competition/${id}`);
  };

  return (
    <div className="competitions-container">
      <div className="competitions-header">
        <Title level={1} className="page-title">
          竞赛练习中心
        </Title>
        <Space>
          <Checkbox
            checked={filterRunning}
            onChange={(e) => setFilterRunning(e.target.checked)}
          >
            只显示进行中的
          </Checkbox>
          <Button
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            type="default"
          >
            返回主页
          </Button>
        </Space>
      </div>

      <div className="competitions-grid">
        {competitions.map((comp) => {
          const status = calculateStatus(comp.beginTime, comp.endTime);
          const progress = calculateProgress(comp.beginTime, comp.endTime);
          const statusConfig = getStatusConfig(status);

          return (
            <Card
              key={comp.id}
              className="competition-card"
              hoverable
              actions={[
                <div className="card-footer-content">
                  <div className="participants">
                    <UserOutlined /> {comp.number || 0}人已参加
                  </div>
                  <Button
                    type="primary"
                    icon={statusConfig.icon}
                    onClick={() => handleJoin(comp.id, status)}
                    disabled={status === '暂未开始'}
                  >
                    {status === '进行中'
                      ? '立即参加'
                      : status === '已结束'
                      ? '查看结果'
                      : '暂未开始'}
                  </Button>
                </div>,
              ]}
            >
              <div className="competition-header-section">
                <div className="competition-icon">
                  <TrophyOutlined />
                </div>
                <div className="competition-title-section">
                  <Title level={4} className="competition-title">
                    {comp.title}
                  </Title>
                  <Tag
                    color={statusConfig.color}
                    icon={statusConfig.icon}
                    className="status-tag"
                  >
                    {statusConfig.text}
                  </Tag>
                </div>
              </div>

              <div className="competition-info">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <div className="info-item">
                      <Text type="secondary">开始时间</Text>
                      <Text strong>{formatTime(comp.beginTime)}</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="info-item">
                      <Text type="secondary">结束时间</Text>
                      <Text strong>{formatTime(comp.endTime)}</Text>
                    </div>
                  </Col>
                  {comp.description && (
                    <Col xs={24}>
                      <div className="info-item">
                        <Text type="secondary">比赛描述</Text>
                        <Text>{comp.description}</Text>
                      </div>
                    </Col>
                  )}
                </Row>

                <div className="progress-section">
                  <Progress
                    percent={Math.round(progress)}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    showInfo={false}
                  />
                  <Text type="secondary" className="progress-text">
                    {progress === 0
                      ? '比赛尚未开始'
                      : progress === 100
                      ? '比赛已结束'
                      : `进行中 ${Math.round(progress)}%`}
                  </Text>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {competitions.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">暂无比赛数据</Text>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Competitions;
