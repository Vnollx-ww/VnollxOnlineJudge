import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Typography, Tag, Button, message, Spin, Space, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './ProblemDetail.css';

const { Title, Paragraph, Text } = Typography;

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

  const renderSection = (title, content, type = 'text') => {
    if (!content) return null;
    return (
      <div className="problem-section">
        <Title level={4}>{title}</Title>
        {type === 'pre' ? (
          <pre className="problem-pre">{content}</pre>
        ) : (
          <Paragraph className="problem-section-text">{content}</Paragraph>
        )}
      </div>
    );
  };

  const infoItems = [
    { label: '时间限制', value: problem.timeLimit ? `${problem.timeLimit} ms` : '无限制' },
    { label: '内存限制', value: problem.memoryLimit ? `${problem.memoryLimit} MB` : '无限制' },
    { label: '提交', value: problem.submitCount ?? 0 },
    { label: '通过', value: problem.passCount ?? 0 },
    {
      label: '通过率',
      value:
        problem.submitCount > 0
          ? `${Math.round((problem.passCount / problem.submitCount) * 10000) / 100}%`
          : '0%',
    },
  ];

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
        <div className="problem-meta-grid">
          {infoItems.map((item) => (
            <div className="meta-card" key={item.label}>
              <Text type="secondary">{item.label}</Text>
              <Title level={4}>{item.value}</Title>
            </div>
          ))}
        </div>

        {problem.tags?.length ? (
          <div className="problem-tags">
            <Text strong>标签：</Text>
            <Space size={[8, 8]} wrap>
              {problem.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </Space>
          </div>
        ) : null}

        <Divider />

        {renderSection('题目描述', problem.description)}
        {renderSection('输入格式', problem.inputFormat)}
        {renderSection('输出格式', problem.outputFormat)}

        <div className="samples-grid">
          {renderSection(
            '输入样例',
            problem.inputExample || '暂无输入样例',
            'pre',
          )}
          {renderSection(
            '输出样例',
            problem.outputExample || '暂无输出样例',
            'pre',
          )}
        </div>

        {renderSection('提示', problem.hint)}
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

