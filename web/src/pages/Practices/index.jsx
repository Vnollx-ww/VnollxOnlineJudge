import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Typography,
  Tag,
  Button,
  Progress,
  message,
  Space,
  Row,
  Col,
} from 'antd';
import {
  BookOutlined,
  RightOutlined,
  FileTextOutlined,
  HomeOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './Practices.css';

const { Title, Text } = Typography;

const Practices = () => {
  const navigate = useNavigate();
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadPractices();
  }, []);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/practice/list');
      if (data.code === 200) {
        setPractices(data.data || []);
      }
    } catch (error) {
      message.error('加载练习列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const calculateProgress = (solvedCount, problemCount) => {
    if (problemCount === 0) return 0;
    return Math.round((solvedCount / problemCount) * 100);
  };

  const handleEnter = (id) => {
    navigate(`/practice/${id}`);
  };

  return (
    <div className="practices-container">
      <div className="practices-header">
        <Title level={1} className="page-title">
          练习中心
        </Title>
        <Space>
          <Button
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            type="default"
          >
            返回主页
          </Button>
        </Space>
      </div>

      <div className="practices-grid">
        {practices.map((practice) => {
          const progress = calculateProgress(practice.solvedCount, practice.problemCount);

          return (
            <Card
              key={practice.id}
              className="practice-card"
              hoverable
              actions={[
                <div className="card-footer-content">
                  <div className="problem-count">
                    <FileTextOutlined /> {practice.problemCount || 0} 道题目
                  </div>
                  <Button
                    type="primary"
                    icon={<RightOutlined />}
                    onClick={() => handleEnter(practice.id)}
                  >
                    进入练习
                  </Button>
                </div>,
              ]}
            >
              <div className="practice-header-section">
                <div className="practice-icon">
                  <BookOutlined />
                </div>
                <div className="practice-title-section">
                  <Title level={4} className="practice-title">
                    {practice.title}
                  </Title>
                  <Tag color="blue">练习</Tag>
                </div>
              </div>

              <div className="practice-info">
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <div className="info-item">
                      <Text type="secondary">创建时间</Text>
                      <Text strong>{formatTime(practice.createTime)}</Text>
                    </div>
                  </Col>
                  <Col xs={24} sm={12}>
                    <div className="info-item">
                      <Text type="secondary">完成进度</Text>
                      <Text strong>{practice.solvedCount || 0} / {practice.problemCount || 0}</Text>
                    </div>
                  </Col>
                  {practice.description && (
                    <Col xs={24}>
                      <div className="info-item">
                        <Text type="secondary">练习描述</Text>
                        <Text>{practice.description}</Text>
                      </div>
                    </Col>
                  )}
                </Row>

                <div className="progress-section">
                  <Progress
                    percent={progress}
                    strokeColor={{
                      '0%': '#1a73e8',
                      '100%': '#52c41a',
                    }}
                    showInfo={false}
                  />
                  <Text type="secondary" className="progress-text">
                    {progress === 0
                      ? '尚未开始'
                      : progress === 100
                      ? '已全部完成'
                      : `已完成 ${progress}%`}
                  </Text>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {practices.length === 0 && !loading && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Text type="secondary">暂无练习数据</Text>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Practices;
