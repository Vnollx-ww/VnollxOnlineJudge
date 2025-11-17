import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Button, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './ProblemDetail.css';

const { Title, Paragraph } = Typography;

const ProblemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadProblem();
  }, [id]);

  const loadProblem = async () => {
    setLoading(true);
    try {
      const data = await api.get('/problem/get', { params: { id } });
      if (data.code === 200) {
        setProblem(data.data);
      } else {
        message.error(data.msg || '加载题目失败');
      }
    } catch (error) {
      message.error('加载题目失败');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="problem-detail-container">
        <Spin size="large" />
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="problem-detail-container">
        <Card>题目不存在</Card>
      </div>
    );
  }

  return (
    <div className="problem-detail-container">
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/problems')}
        style={{ marginBottom: 16 }}
      >
        返回题目列表
      </Button>
      <Card className="problem-card">
        <div className="problem-header">
          <Title level={2}>
            #{problem.id} - {problem.title}
          </Title>
          <div className="problem-meta">
            <Tag color={getDifficultyColor(problem.difficulty)}>
              {problem.difficulty}
            </Tag>
            <span>提交: {problem.submitCount}</span>
            <span>通过: {problem.passCount}</span>
            <span>
              通过率:{' '}
              {problem.submitCount > 0
                ? Math.round((problem.passCount / problem.submitCount) * 10000) /
                  100
                : 0}
              %
            </span>
          </div>
        </div>
        <div className="problem-content">
          <Paragraph>{problem.description || '暂无描述'}</Paragraph>
        </div>
      </Card>
    </div>
  );
};

const getDifficultyColor = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case '简单':
      return 'green';
    case '中等':
      return 'orange';
    case '困难':
      return 'red';
    default:
      return 'default';
  }
};

export default ProblemDetail;

