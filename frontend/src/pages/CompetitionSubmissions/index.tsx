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
  Spin,
  Empty,
  Select,
} from 'antd';
import toast from 'react-hot-toast';
import {
  TrophyOutlined,
  LockOutlined,
  UnorderedListOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';

const { Title, Text } = Typography;
const { Option } = Select;

interface Competition {
  id: number;
  title: string;
  beginTime: string;
  endTime: string;
  needPassword: boolean;
}

interface Submission {
  id: number;
  pid: number;
  problemName?: string;
  userName: string;
  language: string;
  status: string;
  createTime: string;
  time?: number;
  memory?: number;
}

const CompetitionSubmissions: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [language, setLanguage] = useState<string | null>(null);

  const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      toast.error('请先登录！');
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
        const comp = data.data.find((c: Competition) => c.id.toString() === id);
        if (comp) {
          setCompetition(comp);
        } else {
          toast.error('比赛不存在');
          navigate('/competitions');
        }
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载比赛信息失败');
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
        toast.success('密码验证成功');
        setPasswordVerified(true);
        setPasswordModalVisible(false);
        localStorage.setItem(`competition_${id}_verified`, 'true');
      } else {
        toast.error(data.msg || '密码错误');
      }
    } catch (error: any) {
      const errorMsg = error.response?.data?.msg || error.message || '密码验证失败';
      toast.error(errorMsg);
    }
  };

  const loadSubmissions = async (page: number) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        pageNum: String(page),
        pageSize: String(pageSize),
        cid: id!,
      };
      if (status) params.status = status;
      if (language) params.language = language;

      const data = await api.get('/submission/list', { params });
      if (data.code === 200) {
        setSubmissions(data.data || []);
      }

      const countParams: Record<string, string> = { cid: id! };
      if (status) countParams.status = status;
      if (language) countParams.language = language;

      const countData = await api.get('/submission/count', { params: countParams });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        toast.error('请先登录！');
        navigate('/login');
      } else {
        toast.error('加载提交记录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadSubmissions(1);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const getStatusColor = (status: string) => {
    const statusMap: Record<string, string> = {
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

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
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

  const getLanguageColor = (language: string) => {
    const langMap: Record<string, string> = {
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
      render: (_: any, record: Submission) => (
        <Link
          to={`/competition/${id}/problem/${record.pid}`}
          className="font-medium hover:opacity-70 transition-opacity"
          style={{ color: 'var(--gemini-accent-strong)' }}
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
      render: (lang: string) => <Tag color={getLanguageColor(lang)} className="!rounded-full">{lang}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 150,
      render: (status: string) => (
        <Tag color={getStatusColor(status)} className="!rounded-full">{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '时间',
      dataIndex: 'createTime',
      key: 'submitTime',
      width: 180,
      render: (time: string) => formatTime(time),
    },
    {
      title: '运行时间',
      dataIndex: 'time',
      key: 'runTime',
      width: 120,
      render: (ms: number) => ms != null ? `${ms} ms` : '-',
    },
    {
      title: '运行内存',
      dataIndex: 'memory',
      key: 'memory',
      width: 120,
      render: (mem: number) => mem != null ? `${mem} MB` : '-',
    },
  ];

  if (loading && !competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Spin size="large" tip="加载中..." />
      </div>
    );
  }

  if (!competition) {
    return (
      <div className="flex items-center justify-center py-24">
        <Empty description="比赛不存在" />
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--gemini-bg)' }}>
      {/* 导航栏 - Gemini 风格 */}
      <div 
        className="sticky top-0 z-10"
        style={{ 
          backgroundColor: 'var(--gemini-surface)',
          borderBottom: '1px solid var(--gemini-border-light)'
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Space size="large">
            <Link to={`/competition/${id}`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <UnorderedListOutlined /> 比赛详情
              </Button>
            </Link>
            <Link to={`/competition/${id}/ranklist`}>
              <Button type="link" style={{ color: 'var(--gemini-text-secondary)' }}>
                <TrophyOutlined /> 比赛排行榜
              </Button>
            </Link>
            <Button type="link" className="!font-medium" style={{ color: 'var(--gemini-accent-strong)' }}>
              <HistoryOutlined /> 比赛提交记录
            </Button>
          </Space>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 比赛基本信息 - Gemini 风格 */}
        <div className="gemini-card mb-6">
          <Title level={2} className="!mb-4" style={{ color: 'var(--gemini-text-primary)' }}>{competition.title}</Title>
          <Space>
            <Text strong style={{ color: 'var(--gemini-text-primary)' }}>开始时间：</Text>
            <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.beginTime)}</Text>
            <Text strong className="ml-6" style={{ color: 'var(--gemini-text-primary)' }}>结束时间：</Text>
            <Text style={{ color: 'var(--gemini-text-secondary)' }}>{formatTime(competition.endTime)}</Text>
          </Space>
        </div>

        {/* 提交记录 - Gemini 风格 */}
        {passwordVerified ? (
          <div className="gemini-card">
            <div className="flex items-center gap-2 mb-4">
              <HistoryOutlined style={{ color: 'var(--gemini-accent-strong)' }} />
              <span className="font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛提交记录</span>
            </div>
            <div className="mb-4">
              <Space wrap>
                <Select
                  placeholder="状态"
                  value={status}
                  onChange={setStatus}
                  className="w-36"
                  allowClear
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
                  className="w-36"
                  allowClear
                >
                  <Option value="Python">Python</Option>
                  <Option value="Java">Java</Option>
                  <Option value="C++">C++</Option>
                </Select>
                <Button 
                  type="primary" 
                  onClick={handleSearch}
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)',
                    color: 'var(--gemini-accent-text)',
                    border: 'none'
                  }}
                >
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
                  scroll={{ x: 1000 }}
                />
                <div className="mt-4 text-right">
                  <Space>
                    <Button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      上一页
                    </Button>
                    <Text style={{ color: 'var(--gemini-text-secondary)' }}>
                      第 {currentPage} 页，共 {Math.ceil(total / pageSize)} 页
                    </Text>
                    <Button
                      disabled={currentPage >= Math.ceil(total / pageSize)}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      下一页
                    </Button>
                  </Space>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="gemini-card text-center py-12">
            <Text style={{ color: 'var(--gemini-text-tertiary)' }}>请输入密码以查看提交记录</Text>
          </div>
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
        onCancel={() => navigate('/competitions')}
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
          className="!rounded-full"
        />
      </Modal>
    </div>
  );
};

export default CompetitionSubmissions;
