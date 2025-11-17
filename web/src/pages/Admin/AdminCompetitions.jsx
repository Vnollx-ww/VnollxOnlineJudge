import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  DatePicker,
  Switch,
  Select,
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
import dayjs from 'dayjs';
import api from '../../utils/api';
import './AdminCompetitions.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

const AdminCompetitions = () => {
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [form] = Form.useForm();

  // 题目管理相关状态
  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentCompetitionId, setCurrentCompetitionId] = useState(null);
  const [competitionProblems, setCompetitionProblems] = useState([]);
  const [allProblems, setAllProblems] = useState([]);
  const [selectedProblems, setSelectedProblems] = useState([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');

  useEffect(() => {
    loadCompetitions();
  }, [currentPage, pageSize, keyword]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/competition/list', {
        params: {
          pageNum: currentPage.toString(),
          pageSize: pageSize.toString(),
          keyword: keyword || undefined,
        },
      });
      if (data.code === 200) {
        setCompetitions(data.data || []);
      }

      const countData = await api.get('/admin/competition/count', {
        params: { keyword: keyword || undefined },
      });
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        // 401错误由响应拦截器处理，这里只记录
        console.error('认证失败，请重新登录');
      } else {
        message.error('加载比赛列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCompetition(null);
    form.resetFields();
    form.setFieldsValue({
      needPassword: false,
    });
    setModalVisible(true);
  };

  const handleEdit = (competition) => {
    setEditingCompetition(competition);
    form.setFieldsValue({
      title: competition.title,
      description: competition.description,
      beginTime: competition.beginTime ? dayjs(competition.beginTime) : null,
      endTime: competition.endTime ? dayjs(competition.endTime) : null,
      password: competition.password || '',
      needPassword: competition.needPassword || false,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/competition/delete/${id}`);
      if (data.code === 200) {
        message.success('删除比赛成功');
        loadCompetitions();
      } else {
        message.error(data.msg || '删除失败');
      }
    } catch (error) {
      message.error('删除比赛失败');
      console.error(error);
    }
  };

  const handleManageProblems = async (competition) => {
    setCurrentCompetitionId(competition.id);
    setProblemManageVisible(true);
    await loadCompetitionProblems(competition.id);
    await loadAllProblems();
  };

  const loadCompetitionProblems = async (cid) => {
    try {
      const data = await api.get(`/admin/competition/${cid}/problems`);
      if (data.code === 200) {
        setCompetitionProblems(data.data || []);
      }
    } catch (error) {
      message.error('加载比赛题目失败');
      console.error(error);
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = await api.get('/admin/competition/problems');
      if (data.code === 200) {
        setAllProblems(data.data || []);
      }
    } catch (error) {
      message.error('加载题目列表失败');
      console.error(error);
    }
  };

  const handleAddProblemsToCompetition = () => {
    setAddProblemModalVisible(true);
    setSelectedProblems([]);
    setProblemSearchKeyword('');
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) {
      message.warning('请至少选择一个题目');
      return;
    }

    try {
      const data = await api.post('/admin/competition/add/problems/batch', {
        cid: currentCompetitionId.toString(),
        pids: selectedProblems.map((p) => p.toString()),
      });

      if (data.code === 200) {
        message.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        loadCompetitionProblems(currentCompetitionId);
      } else {
        message.error(data.msg || '添加失败');
      }
    } catch (error) {
      message.error('添加题目失败');
      console.error(error);
    }
  };

  const handleDeleteProblemFromCompetition = async (pid) => {
    try {
      const data = await api.delete(
        `/admin/competition/${currentCompetitionId}/problems/${pid}`
      );
      if (data.code === 200) {
        message.success('删除题目成功');
        loadCompetitionProblems(currentCompetitionId);
      } else {
        message.error(data.msg || '删除失败');
      }
    } catch (error) {
      message.error('删除题目失败');
      console.error(error);
    }
  };

  const handleSubmit = async (values) => {
    try {
      const submitData = {
        title: values.title,
        description: values.description || '',
        beginTime: values.beginTime.format('YYYY-MM-DD HH:mm:ss'),
        endTime: values.endTime.format('YYYY-MM-DD HH:mm:ss'),
        password: values.needPassword ? values.password || '' : '',
        needPassword: values.needPassword || false,
      };

      if (editingCompetition) {
        submitData.id = editingCompetition.id;
      }

      const url = editingCompetition
        ? '/admin/competition/update'
        : '/admin/competition/create';
      const method = editingCompetition ? 'put' : 'post';

      const data = await api[method](url, submitData);

      if (data.code === 200) {
        message.success(
          editingCompetition ? '更新比赛成功' : '创建比赛成功'
        );
        setModalVisible(false);
        loadCompetitions();
      } else {
        message.error(data.msg || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
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

  // 过滤题目列表
  const filteredProblems = allProblems.filter((problem) => {
    if (!problemSearchKeyword) return true;
    const keyword = problemSearchKeyword.toLowerCase();
    return (
      problem.id.toString().includes(keyword) ||
      problem.title.toLowerCase().includes(keyword)
    );
  });

  // 获取已添加的题目ID集合
  const addedProblemIds = new Set(
    competitionProblems.map((p) => p.id.toString())
  );

  // 过滤掉已添加的题目
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
      title: '开始时间',
      dataIndex: 'beginTime',
      key: 'beginTime',
      render: (time) => formatTime(time),
    },
    {
      title: '结束时间',
      dataIndex: 'endTime',
      key: 'endTime',
      render: (time) => formatTime(time),
    },
    {
      title: '参与人数',
      dataIndex: 'number',
      key: 'number',
      width: 100,
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
            title="确定要删除这个比赛吗？"
            description="此操作将删除比赛及其相关数据，无法撤销"
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
    <div className="admin-competitions">
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              比赛列表
            </Title>
            <Text type="secondary">管理系统中的所有比赛</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新建比赛
          </Button>
        </div>

        <div className="toolbar">
          <Search
            placeholder="搜索比赛..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadCompetitions}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={competitions}
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

      {/* 新建/编辑比赛Modal */}
      <Modal
        title={editingCompetition ? '编辑比赛' : '新建比赛'}
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
            label="比赛标题"
            rules={[{ required: true, message: '请输入比赛标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="比赛描述">
            <TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="beginTime"
            label="开始时间"
            rules={[{ required: true, message: '请选择开始时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="endTime"
            label="结束时间"
            rules={[{ required: true, message: '请选择结束时间' }]}
          >
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item name="needPassword" label="是否需要密码" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) =>
              prevValues.needPassword !== currentValues.needPassword
            }
          >
            {({ getFieldValue }) =>
              getFieldValue('needPassword') ? (
                <Form.Item
                  name="password"
                  label="比赛密码"
                  rules={[{ required: true, message: '请输入比赛密码' }]}
                >
                  <Input.Password placeholder="请输入比赛密码" />
                </Form.Item>
              ) : null
            }
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

      {/* 管理比赛题目Modal */}
      <Modal
        title="管理比赛题目"
        open={problemManageVisible}
        onCancel={() => {
          setProblemManageVisible(false);
          setCurrentCompetitionId(null);
          setCompetitionProblems([]);
        }}
        footer={null}
        width={800}
      >
        <div style={{ marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlusCircleOutlined />}
            onClick={handleAddProblemsToCompetition}
          >
            添加题目
          </Button>
        </div>

        <List
          dataSource={competitionProblems}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无题目" /> }}
          renderItem={(problem) => (
            <List.Item
              actions={[
                <Popconfirm
                  title="确定要从比赛中删除这个题目吗？"
                  onConfirm={() => handleDeleteProblemFromCompetition(problem.id)}
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

      {/* 添加题目到比赛Modal */}
      <Modal
        title="添加题目到比赛"
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

export default AdminCompetitions;
