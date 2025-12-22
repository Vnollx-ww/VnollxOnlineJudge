import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  Switch,
  Checkbox,
  message,
  Typography,
  Tag,
  Popconfirm,
  List,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  SettingOutlined,
  PlusCircleOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './AdminPractices.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;

const AdminPractices = () => {
  const [practices, setPractices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [form] = Form.useForm();
  const [messageApi, contextHolder] = message.useMessage();

  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentPracticeId, setCurrentPracticeId] = useState(null);
  const [practiceProblems, setPracticeProblems] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');

  useEffect(() => {
    loadPractices();
  }, [currentPage, pageSize, keyword]);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/practice/list', {
        params: {
          pageNum: currentPage.toString(),
          pageSize: pageSize.toString(),
          keyword: keyword || undefined,
        },
      });
      if (data.code === 200) {
        setPractices(data.data || []);
      }

      const countData = await api.get('/admin/practice/count', {
        params: { keyword: keyword || undefined },
      });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        console.error('认证失败，请重新登录');
      } else {
        messageApi.error('加载练习列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPractice(null);
    form.resetFields();
    form.setFieldsValue({
      isPublic: true,
    });
    setModalVisible(true);
  };

  const handleEdit = (practice) => {
    setEditingPractice(practice);
    form.setFieldsValue({
      title: practice.title,
      description: practice.description,
      isPublic: practice.isPublic,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/practice/delete/${id}`);
      if (data.code === 200) {
        messageApi.success('删除练习成功');
        loadPractices();
      } else {
        messageApi.error(data.msg || '删除失败');
      }
    } catch (error) {
      messageApi.error('删除练习失败');
      console.error(error);
    }
  };

  const handleManageProblems = async (practice) => {
    setCurrentPracticeId(practice.id);
    setProblemManageVisible(true);
    await loadPracticeProblems(practice.id);
    await loadAllProblems();
  };

  const loadPracticeProblems = async (practiceId) => {
    try {
      const data = await api.get(`/admin/practice/${practiceId}/problems`);
      if (data.code === 200) {
        setPracticeProblems(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载练习题目失败');
      console.error(error);
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = await api.get('/admin/practice/problems');
      if (data.code === 200) {
        setAllProblems(data.data || []);
      }
    } catch (error) {
      messageApi.error('加载题目列表失败');
      console.error(error);
    }
  };

  const handleAddProblemsToPractice = () => {
    setAddProblemModalVisible(true);
    setSelectedProblems([]);
    setProblemSearchKeyword('');
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) {
      messageApi.warning('请至少选择一个题目');
      return;
    }

    try {
      const data = await api.post('/admin/practice/add/problems', {
        practiceId: currentPracticeId.toString(),
        problemIds: selectedProblems.map((p) => p.toString()),
      });

      if (data.code === 200) {
        messageApi.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        loadPracticeProblems(currentPracticeId);
      } else {
        messageApi.error(data.msg || '添加失败');
      }
    } catch (error) {
      messageApi.error('添加题目失败');
      console.error(error);
    }
  };

  const handleDeleteProblemFromPractice = async (problemId) => {
    try {
      const data = await api.delete(
        `/admin/practice/${currentPracticeId}/problems/${problemId}`
      );
      if (data.code === 200) {
        messageApi.success('删除题目成功');
        loadPracticeProblems(currentPracticeId);
      } else {
        messageApi.error(data.msg || '删除失败');
      }
    } catch (error) {
      messageApi.error('删除题目失败');
      console.error(error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        title: values.title,
        description: values.description || '',
        isPublic: values.isPublic,
      };

      if (editingPractice) {
        submitData.id = editingPractice.id;
      }

      const url = editingPractice
        ? '/admin/practice/update'
        : '/admin/practice/create';
      const method = editingPractice ? 'put' : 'post';

      const data = await api[method](url, submitData);

      if (data.code === 200) {
        messageApi.success(
          editingPractice ? '更新练习成功' : '创建练习成功'
        );
        setModalVisible(false);
        loadPractices();
      } else {
        messageApi.error(data.msg || '操作失败');
      }
    } catch (error) {
      messageApi.error('操作失败');
      console.error(error);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN');
  };

  const getDifficultyTag = (difficulty) => {
    const colors = {
      简单: 'green',
      中等: 'orange',
      困难: 'red',
    };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  const filteredProblems = allProblems.filter((problem) => {
    if (!problemSearchKeyword) return true;
    const kw = problemSearchKeyword.toLowerCase();
    return (
      problem.id.toString().includes(kw) ||
      problem.title.toLowerCase().includes(kw)
    );
  });

  const addedProblemIds = new Set(
    practiceProblems.map((p) => p.id.toString())
  );

  const availableProblems = filteredProblems.filter(
    (p) => !addedProblemIds.has(p.id.toString())
  );

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '题目数量',
      dataIndex: 'problemCount',
      key: 'problemCount',
      width: 100,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (time) => formatTime(time),
    },
    {
      title: '状态',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (isPublic) => (
        <Tag color={isPublic ? 'green' : 'default'}>
          {isPublic ? '公开' : '私有'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Button
            type="link"
            icon={<SettingOutlined />}
            onClick={() => handleManageProblems(record)}
          >
            管理题目
          </Button>
          <Popconfirm
            title="确定要删除这个练习吗？"
            description="此操作将删除练习及其相关数据，无法撤销"
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
    <div className="admin-practices">
      {contextHolder}
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              练习列表
            </Title>
            <Text type="secondary">管理系统中的所有练习</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新建练习
          </Button>
        </div>

        <div className="toolbar">
          <Search
            placeholder="搜索练习..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadPractices}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={practices}
          loading={loading}
          rowKey="id"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `共 ${total} 条记录`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size);
            },
          }}
        />
      </Card>

      <Modal
        title={editingPractice ? '编辑练习' : '新建练习'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="练习标题"
            rules={[{ required: true, message: '请输入练习标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="练习描述">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item name="isPublic" label="是否公开" valuePropName="checked">
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">
                保存
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="管理练习题目"
        open={problemManageVisible}
        onCancel={() => {
          setProblemManageVisible(false);
          setCurrentPracticeId(null);
          setPracticeProblems([]);
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleAddProblemsToPractice}
          >
            添加题目
          </Button>
        </div>

        <List
          dataSource={practiceProblems}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无题目" /> }}
          renderItem={(problem) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="确定要从练习中删除这个题目吗？"
                  onConfirm={() => handleDeleteProblemFromPractice(problem.id)}
                  okText="确定"
                  cancelText="取消"
                >
                  <Button type="link" danger size="small">
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>#{problem.id}</Text>
                    <Text>{problem.title}</Text>
                  </Space>
                }
                description={
                  <Space>
                    {getDifficultyTag(problem.difficulty)}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Modal>

      <Modal
        title="添加题目到练习"
        open={addProblemModalVisible}
        onCancel={() => {
          setAddProblemModalVisible(false);
          setSelectedProblems([]);
          setProblemSearchKeyword('');
        }}
        footer={null}
        width={700}
      >
        <div style={{ marginBottom: 16 }}>
          <Search
            placeholder="搜索题目（题号或标题）..."
            value={problemSearchKeyword}
            onChange={(e) => setProblemSearchKeyword(e.target.value)}
            allowClear
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">
            已选择 {selectedProblems.length} 个题目
          </Text>
        </div>

        <div
          style={{
            maxHeight: 400,
            overflowY: 'auto',
            border: '1px solid #d9d9d9',
            borderRadius: 4,
            padding: 8,
          }}
        >
          {availableProblems.length === 0 ? (
            <Empty description="没有可添加的题目" />
          ) : (
            <Checkbox.Group
              value={selectedProblems}
              onChange={(values) => setSelectedProblems(values)}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {availableProblems.map((problem) => (
                  <div
                    key={problem.id}
                    style={{
                      padding: 8,
                      border: '1px solid #f0f0f0',
                      borderRadius: 4,
                      marginBottom: 8,
                    }}
                  >
                    <Checkbox value={problem.id}>
                      <Space>
                        <Text strong>#{problem.id}</Text>
                        <Text>{problem.title}</Text>
                        {getDifficultyTag(problem.difficulty)}
                      </Space>
                    </Checkbox>
                  </div>
                ))}
              </Space>
            </Checkbox.Group>
          )}
        </div>

        <div style={{ marginTop: 16, textAlign: 'right' }}>
          <Space>
            <Button
              onClick={() => {
                setAddProblemModalVisible(false);
                setSelectedProblems([]);
                setProblemSearchKeyword('');
              }}
            >
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleBatchAddProblems}
              disabled={selectedProblems.length === 0}
            >
              批量添加 ({selectedProblems.length})
            </Button>
          </Space>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPractices;
