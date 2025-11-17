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
  message,
  Spin,
  Empty,
  Select,
  Input as AntInput,
} from 'antd';
import {
  TrophyOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './CompetitionSubmissions.css';

const { Title, Text } = Typography;
const { Option } = Select;

const CompetitionSubmissions = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState(null);
  const [language, setLanguage] = useState(null);


    const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/login');
      return;
    }
    loadCompetition();
  }, [id, navigate]);

  useEffect(() => {
    if (competition) {
      checkPassword();
    }
  }, [competition]);

  useEffect(() => {
    if (passwordVerified && competition) {
      loadSubmissions(1);
    }
  }, [passwordVerified, competition]);

  useEffect(() => {
    if (passwordVerified) {
      loadSubmissions(currentPage);
    }
  }, [currentPage, status, language]);

  const loadCompetition = async () => {
    try {
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
      message.error('密码验证失败');
      console.error(error);
    }
  };

  const loadSubmissions = async (page) => {
    setLoading(true);
    try {
      const params = {
        pageNum: String(page),
        pageSize: String(pageSize),
        cid: id,
      };
      if (status) {
        params.status = status;
      }
      if (language) {
        params.language = language;
      }

      const data = await api.get('/submission/list', { params });
      if (data.code === 200) {
        setSubmissions(data.data || []);
      }

      const countParams = { cid: id };
      if (status) countParams.status = status;
      if (language) countParams.language = language;

      const countData = await api.get('/submission/count', {
        params: countParams,
      });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('请先登录！');
        navigate('/login');
      } else {
        message.error('加载提交记录失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadSubmissions(1);
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const formatCompetitionTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const getStatusColor = (status) => {
        const statusMap = {
            '答案正确': 'success',
            '答案错误': 'error',
            '超时': 'warning',
            '内存超限': 'warning',
            '运行错误': 'error',
            '编译错误': 'error',
            '等待中': 'processing',
            '评测中': 'processing',
        };
        return statusMap[status] || 'default';
    };


    const getStatusText = (status) => {
    const statusMap = {
      ACCEPTED: '答案正确',
      WRONG_ANSWER: '答案错误',
      TIME_LIMIT_EXCEEDED: '超时',
      MEMORY_LIMIT_EXCEEDED: '内存超限',
      RUNTIME_ERROR: '运行错误',
      COMPILATION_ERROR: '编译错误',
      PENDING: '等待中',
      JUDGING: '评测中',
    };
    return statusMap[status] || status;
  };

  const getLanguageColor = (language) => {
    const langMap = {
      Python: 'blue',
      Java: 'orange',
      'C++': 'purple',
      C: 'cyan',
      JavaScript: 'green',
    };
    return langMap[language] || 'default';
  };

  const columns = [
    {
      title: '提交ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '题目',
      key: 'problem',
      render: (_, record) => (
        <Link
          to={`/competition/${id}/problem/${record.pid}`}
          style={{ color: '#1a73e8', fontWeight: 500 }}
        >
          #{record.pid} - {record.problemName || '未知题目'}
        </Link>
      ),
    },
    {
      title: '用户',
      dataIndex: 'userName',
      key: 'userName',
      width: 150,
    },
    {
      title: '语言',
      dataIndex: 'language',
      key: 'language',
      width: 120,
      render: (lang) => <Tag color={getLanguageColor(lang)}>{lang}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'submitTime',
      width: 180,
      render: (time) => formatTime(time),
    },
      {
          title: '运行时间',
          dataIndex: 'time',
          key: 'runTime',
          width: 150,
          render: (ms) => ms!=null ? `${ms} ms` : '-',
      },
      {
          title: '运行内存',
          dataIndex: 'memory',
          key: 'memory',
          width: 120,
          render: (mem) => mem!=null ? `${mem} MB` : '-',
      },

  ];

  if (loading && !competition) {
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
    <div className="competition-submissions">
      {/* 导航栏 */}
      <div className="competition-nav">
        <Space size="large">
          <Link to={`/competition/${id}`}>
            <Button type="link" className="nav-button">
              <UnorderedListOutlined /> 比赛详情
            </Button>
          </Link>
          <Link to={`/competition/${id}/ranklist`}>
            <Button type="link" className="nav-button">
              <TrophyOutlined /> 比赛排行榜
            </Button>
          </Link>
          <Button type="link" className="nav-button active">
            <HistoryOutlined /> 比赛提交记录
          </Button>
        </Space>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px' }}>
        {/* 比赛基本信息 */}
        <Card className="info-card" style={{ marginBottom: 24 }}>
          <Title level={2} style={{ marginBottom: 16 }}>
            {competition.title}
          </Title>
          <Space>
            <Text strong>开始时间：</Text>
            <Text>{formatCompetitionTime(competition.beginTime)}</Text>
            <Text strong style={{ marginLeft: 24 }}>结束时间：</Text>
            <Text>{formatCompetitionTime(competition.endTime)}</Text>
          </Space>
        </Card>

        {/* 提交记录 */}
        {passwordVerified ? (
          <Card
            className="info-card"
            title={
              <Space>
                <HistoryOutlined />
                <span>比赛提交记录</span>
              </Space>
            }
          >
            <div style={{ marginBottom: 16 }}>
              <Space>
                  <Select
                      placeholder="状态"
                      value={status}
                      onChange={setStatus}
                      style={{ width: 150 }}
                      allowClear
                      notFoundContent={null}
                  >
                      <Option value="答案正确">答案正确</Option>
                      <Option value="答案错误">答案错误</Option>
                      <Option value="时间超出限制">时间超出限制</Option>
                      <Option value="内存超出限制">内存超出限制</Option>
                      <Option value="运行时错误">运行时错误</Option>
                      <Option value="编译错误">编译错误</Option>
                      <Option value="等待中">等待中</Option>
                      <Option value="评测中">评测中</Option>
                  </Select>
                  <Select
                      placeholder="语言"
                      value={language}
                      onChange={setLanguage}
                      style={{ width: 150 }}
                      allowClear
                      notFoundContent={null}
                  >
                      <Option value="Python">Python</Option>
                      <Option value="Java">Java</Option>
                      <Option value="C++">C++</Option>
                  </Select>
                <Button type="primary" onClick={handleSearch}>
                  搜索
                </Button>
              </Space>
            </div>

            {submissions.length === 0 ? (
              <Empty description="暂无提交记录" />
            ) : (
              <>
                <Table
                  columns={columns}
                  dataSource={submissions}
                  loading={loading}
                  rowKey="id"
                  pagination={false}
                />
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                  <Space>
                    <Button
                      disabled={currentPage === 1}
                      onClick={() => {
                        setCurrentPage(currentPage - 1);
                      }}
                    >
                      上一页
                    </Button>
                    <Text>
                      第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                    </Text>
                    <Button
                      disabled={currentPage >= Math.ceil(total / pageSize)}
                      onClick={() => {
                        setCurrentPage(currentPage + 1);
                      }}
                    >
                      下一页
                    </Button>
                  </Space>
                </div>
              </>
            )}
          </Card>
        ) : (
          <Card style={{ textAlign: 'center' }}>
            <Text type="secondary">请输入密码以查看提交记录</Text>
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

export default CompetitionSubmissions;

