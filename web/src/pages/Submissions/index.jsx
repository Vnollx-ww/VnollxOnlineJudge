import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Input,
  Select,
  Button,
  Tag,
  Card,
  Space,
  Typography,
  message,
  Pagination,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated } from '../../utils/auth';
import './Submissions.css';

const { Title } = Typography;
const { Option } = Select;

const Submissions = () => {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [problemId, setProblemId] = useState('');
  const [status, setStatus] = useState(undefined);
  const [language, setLanguage] = useState(undefined);

  const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadSubmissions(1);
  }, []);

  const loadSubmissions = async (page) => {
    setLoading(true);
    try {
      const params = {
        pageNum: String(page),
        pageSize: String(pageSize),
      };
      if (problemId) {
        params.keyword = problemId;
      }
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

      // 获取总数
      const countParams = {};
      if (problemId) countParams.keyword = problemId;
      if (status) countParams.status = status;
      if (language) countParams.language = language;
      
      const countData = await api.get('/submission/count', { params: countParams });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      message.error('加载提交记录失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadSubmissions(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadSubmissions(page);
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
      ACCEPTED: '通过',
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
        <a
          href={`/problem/${record.pid}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/problem/${record.pid}`);
          }}
          className="problem-link"
        >
          #{record.pid} - {record.problemName || '未知题目'}
        </a>
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
      render: (lang) => (
        <Tag color={getLanguageColor(lang)}>{lang}</Tag>
      ),
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
      render: (time) => {
        if (!time) return '-';
        return new Date(time).toLocaleString('zh-CN');
      },

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

  return (
    <div className="submissions-container">
      <Card className="submissions-card">
        <Title level={2} className="page-title">
          提交记录
        </Title>

        <div className="filter-container">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="题目ID"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              style={{ width: 150 }}
            />
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
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
            >
              搜索
            </Button>
          </Space.Compact>
        </div>

        <Table
          columns={columns}
          dataSource={submissions}
          loading={loading}
          rowKey="id"
          pagination={false}
          className="submissions-table"
        />

        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => `共 ${total} 条记录`}
          />
        </div>
      </Card>
    </div>
  );
};

export default Submissions;

