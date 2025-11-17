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
import './Problems.css';

const { Title } = Typography;
const { Option } = Select;

const Problems = () => {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const pageSize = 10;

  useEffect(() => {
    if (!isAuthenticated()) {
      message.error('请先登录！');
      navigate('/');
      return;
    }
    loadTags();
    loadProblems(1);
  }, []);

  const loadTags = async () => {
    try {
      const data = await api.get('/tag/list');
      if (data.code === 200) {
        setTags(data.data || []);
      }
    } catch (error) {
      console.error('加载标签失败:', error);
    }
  };

  const loadProblems = async (page) => {
    setLoading(true);
    try {
      const keyword = searchKeyword || selectedTag || '';
      const params = {
        offset: String((page - 1) * pageSize),
        size: String(pageSize),
      };
      if (keyword) {
        params.keyword = keyword;
      }

      const data = await api.get('/problem/list', { params });
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      // 获取总数
      const countParams = keyword ? { keyword } : {};
      const countData = await api.get('/problem/count', { params: countParams });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      message.error('加载题目列表失败');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    loadProblems(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    loadProblems(page);
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

  const calculatePassRate = (submitCount, passCount) => {
    if (submitCount === 0) return '0%';
    return `${Math.round((passCount / submitCount) * 10000) / 100}%`;
  };

  const columns = [
    {
      title: '题号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id) => `#${id}`,
    },
    {
      title: '题目名称',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <a
          href={`/problem/${record.id}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/problem/${record.id}`);
          }}
          className="problem-link"
        >
          {title}
        </a>
      ),
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      width: 120,
      render: (difficulty) => (
        <Tag color={getDifficultyColor(difficulty)}>{difficulty}</Tag>
      ),
    },
    {
      title: '提交次数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 120,
      align: 'center',
    },
    {
      title: '通过次数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 120,
      align: 'center',
    },
    {
      title: '通过率',
      key: 'passRate',
      width: 120,
      align: 'center',
      render: (_, record) => {
        const rate = calculatePassRate(record.submitCount, record.passCount);
        const rateNum = parseFloat(rate);
        let color = 'red';
        if (rateNum >= 60) color = 'green';
        else if (rateNum >= 30) color = 'orange';
        return <Tag color={color}>{rate}</Tag>;
      },
    },
  ];

  return (
    <div className="problems-container">
      <Card className="problems-card">
        <Title level={2} className="page-title">
          题目列表
        </Title>

        <div className="search-container">
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入题目编号或名称和标签"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onPressEnter={handleSearch}
              style={{ flex: 1 }}
            />
            <Select
              placeholder="选择标签"
              value={selectedTag}
              onChange={setSelectedTag}
              style={{ width: 200 }}
              allowClear
            >
              <Option value="">所有标签</Option>
              {tags.map((tag) => (
                <Option key={tag.name} value={tag.name}>
                  {tag.name}
                </Option>
              ))}
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
          dataSource={problems}
          loading={loading}
          rowKey="id"
          pagination={false}
          className="problems-table"
        />

        <div className="pagination-container">
          <Pagination
            current={currentPage}
            total={total}
            pageSize={pageSize}
            onChange={handlePageChange}
            showSizeChanger={false}
            showQuickJumper
            showTotal={(total) => `共 ${total} 题`}
          />
        </div>
      </Card>
    </div>
  );
};

export default Problems;

