import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  message,
  Typography,
  Tag,
  Popconfirm,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './AdminSolves.css';

const { Title, Text } = Typography;
const { Search } = Input;

const AdminSolves = () => {
  const [solves, setSolves] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    loadSolves();
  }, [currentPage, pageSize, keyword]);

  const loadSolves = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/solve/list', {
        params: {
          page: currentPage.toString(),
          size: pageSize.toString(),
          keyword: keyword || undefined,
        },
      });
      if (data.code === 200) {
        setSolves(data.data || []);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // 401错误由响应拦截器处理，这里只记录
        console.error('认证失败，请重新登录');
      } else {
        message.error('加载题解列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      message.info('删除功能开发中');
    } catch (error) {
      message.error('删除题解失败');
    }
  };

  const getStatusTag = (status) => {
    const colors = {
      0: 'default',
      1: 'success',
    };
    const texts = {
      0: '待审核',
      1: '已通过',
    };
    return <Tag color={colors[status] || 'default'}>{texts[status] || '未知'}</Tag>;
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '题目ID',
      dataIndex: 'pid',
      key: 'problemId',
      width: 100,
    },
    {
      title: '作者',
      dataIndex: 'name',
      key: 'authorName',
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => getStatusTag(status),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确定要删除这个题解吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-solves">
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              题解列表
            </Title>
            <Text type="secondary">管理系统中的所有题解</Text>
          </div>
        </div>

        <div className="toolbar">
          <Search
            placeholder="搜索题解..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(0);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadSolves}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={solves}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage + 1,
            pageSize: pageSize,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page - 1);
              setPageSize(size);
            },
          }}
        />
      </Card>
    </div>
  );
};

export default AdminSolves;


