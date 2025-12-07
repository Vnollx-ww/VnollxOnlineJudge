import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from 'antd';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
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
  Switch,
} from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../../utils/api';
import { isAuthenticated, getUserInfo, setUserInfo } from '../../utils/auth';
import { useJudgeWebSocket } from '../../hooks/useJudgeWebSocket';
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
  const [onlyMine, setOnlyMine] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [currentLang, setCurrentLang] = useState('');
  
  // 使用 ref 保存最新的 currentPage，避免闭包问题
  const currentPageRef = useRef(currentPage);
  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const handleWebSocketMessage = useCallback((msg) => {
    if (!msg || !msg.snowflakeId) {
      return;
    }
    
    console.log('收到 WebSocket 消息:', msg);
    
    setSubmissions((prev) => {
      return prev.map((item) => {
        // 使用字符串比较，避免类型不匹配问题
        if (String(item.snowflakeId) === String(msg.snowflakeId)) {
          console.log('匹配到提交记录，更新状态:', msg.status);
          return {
            ...item,
            status: msg.status,
            time: msg.time,
            memory: msg.memory,
          };
        }
        return item;
      });
    });
    
    // 如果是评测完成，重新加载当前页以确保数据最新
    if (msg.status !== '评测中') {
      setTimeout(() => {
        loadSubmissions(currentPageRef.current);
      }, 500);
    }
  }, []);

  useJudgeWebSocket(handleWebSocketMessage);

  const pageSize = 15;

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    setCurrentPage(1);
    loadSubmissions(1);
  }, [onlyMine]);
    const handleShowCode = async (id) => {
        try {
            const res = await api.get(`/submission/detail/${id}`);
            if (res.code === 200) {
                setCurrentCode(res.data.code || '');
                setCurrentLang(res.data.language || 'plaintext');
                setCodeModalVisible(true);
            } else {
                message.error('获取代码失败');
            }
        } catch (error) {
            console.error(error);
            message.error('获取代码失败');
        }
    };

  const loadSubmissions = async (page) => {
    setLoading(true);
    try {
      let currentUid = null;
      if (onlyMine) {
        const userInfo = getUserInfo();
        if (userInfo && userInfo.id) {
          currentUid = userInfo.id;
        } else {
          // 如果本地没有ID，尝试重新获取用户信息
          try {
            const res = await api.get('/user/profile');
            if (res.code === 200) {
              setUserInfo(res.data);
              currentUid = res.data.id;
            }
          } catch (e) {
            console.error('获取用户信息失败', e);
          }
        }
        
        if (!currentUid) {
            message.warning('无法获取用户信息，请重新登录');
        }
      }

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
      if (currentUid) {
        params.uid = currentUid;
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
      if (currentUid) {
        countParams.uid = currentUid;
      }
      
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
          render: (id, record) => (
              <a
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                      console.log('点击了记录:', record);  // 用于调试
                      setCurrentCode(record.code || '（无代码）');
                      setCurrentLang(record.language || 'plaintext');
                      setCodeModalVisible(true);
                  }}
              >
                  {id}
              </a>
          ),
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

        <div className="filter-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Space.Compact style={{ width: 'auto' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>仅看自己</span>
            <Switch
                checked={onlyMine}
                onChange={setOnlyMine}
            />
          </div>
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
        <Modal
            title="代码查看"
            open={codeModalVisible}
            onCancel={() => setCodeModalVisible(false)}
            footer={null}
            width="80%"
        >
            <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
                <SyntaxHighlighter
                    language={currentLang.toLowerCase() === 'c++' ? 'cpp' : currentLang.toLowerCase()}
                    style={vscDarkPlus}
                    showLineNumbers
                    customStyle={{ margin: 0, borderRadius: 8, fontSize: 14 }}
                >
                    {currentCode}
                </SyntaxHighlighter>
            </div>
        </Modal>

    </div>
  );
};

export default Submissions;

