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
  Select,
} from 'antd';
import {
  ReloadOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
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
  const [statusFilter, setStatusFilter] = useState(null);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    loadSolves();
  }, [currentPage, pageSize, keyword, statusFilter]);

  const loadSolves = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/solve/list', {
        params: {
          page: currentPage.toString(),
          size: pageSize.toString(),
          keyword: keyword || undefined,
          status: statusFilter !== null ? statusFilter : undefined,
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
        messageApi.error('加载题解列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/solve/${id}`);
      if (data.code === 200) {
        messageApi.success('删除题解成功');
        loadSolves();
      } else {
        messageApi.error(data.msg || '删除失败');
      }
    } catch (error) {
      messageApi.error(error?.response?.data?.msg || '删除题解失败');
    }
  };

  const handleAudit = async (id, status) => {
    try {
      const data = await api.put(`/admin/solve/${id}/status`, null, {
        params: { status },
      });
      if (data.code === 200) {
        messageApi.success(data.msg || '审核成功');
        loadSolves();
      } else {
        messageApi.error(data.msg || '审核失败');
      }
    } catch (error) {
      messageApi.error(error?.response?.data?.msg || '审核失败');
    }
  };

  const getStatusTag = (status) => {
    const colors = {
      0: 'default',
      1: 'success',
      2: 'error',
    };
    const texts = {
      0: '未审核',
      1: '审核通过',
      2: '审核不通过',
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
      width: 250,
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="确认审核通过该题解？"
            onConfirm={() => handleAudit(record.id, 1)}
            okText="确认"
            cancelText="取消"
          >
            <Button 
              type="primary" 
              size="small" 
              icon={<CheckOutlined />}
              disabled={record.status === 1}
            >
              通过
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确认审核不通过该题解？"
            onConfirm={() => handleAudit(record.id, 2)}
            okText="确认"
            cancelText="取消"
          >
            <Button 
              danger 
              size="small" 
              icon={<CloseOutlined />}
              disabled={record.status === 2}
            >
              不通过
            </Button>
          </Popconfirm>
          <Popconfirm
            title="确定要删除这个题解吗？"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="admin-solves">
      {contextHolder}
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
          <Space>
            <Search
              placeholder="搜索题解..."
              allowClear
              style={{ width: 300 }}
              onSearch={(value) => {
                setKeyword(value);
                setCurrentPage(0);
              }}
            />
            <Select
              placeholder="筛选审核状态"
              style={{ width: 160 }}
              allowClear
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value);
                setCurrentPage(0);
              }}
            >
              <Select.Option value={0}>未审核</Select.Option>
              <Select.Option value={1}>审核通过</Select.Option>
              <Select.Option value={2}>审核不通过</Select.Option>
            </Select>
          </Space>
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


