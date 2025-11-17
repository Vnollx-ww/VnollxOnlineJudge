import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Input,
  Space,
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  Upload,
  message,
  Typography,
  Tag,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import api from '../../utils/api';
import './AdminProblems.css';

const { Title, Text, TextArea } = Typography;
const { Search } = Input;
const { Option } = Select;

const AdminProblems = () => {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProblem, setEditingProblem] = useState(null);
  const [form] = Form.useForm();
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    loadProblems();
  }, [currentPage, pageSize, keyword]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/problem/list', {
        params: {
          offset: ((currentPage - 1) * pageSize).toString(),
          size: pageSize.toString(),
          keyword: keyword || undefined,
        },
      });
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      const countData = await api.get('/admin/problem/count', {
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
        message.error('加载题目列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingProblem(null);
    setTags([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (problem) => {
    setEditingProblem(problem);
    form.setFieldsValue({
      title: problem.title,
      description: problem.description,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      difficulty: problem.difficulty,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      inputExample: problem.inputExample,
      outputExample: problem.outputExample,
      hint: problem.hint,
      open: problem.open,
    });
    setTags(problem.tags || []);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/problem/delete/${id}`);
      if (data.code === 200) {
        message.success('删除题目成功');
        loadProblems();
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
      const formData = new FormData();
      
      if (editingProblem) {
        formData.append('id', editingProblem.id.toString());
      }
      
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('timeLimit', values.timeLimit.toString());
      formData.append('memoryLimit', values.memoryLimit.toString());
      formData.append('difficulty', values.difficulty);
      formData.append('inputFormat', values.inputFormat);
      formData.append('outputFormat', values.outputFormat);
      formData.append('inputExample', values.inputExample || '');
      formData.append('outputExample', values.outputExample || '');
      formData.append('hint', values.hint || '');
      formData.append('open', values.open ? 'true' : 'false');
      
      // 处理标签 - 后端期望的是List<String>，Spring会自动将逗号分隔的字符串转换为List
      // 或者我们可以发送多个tags参数，但根据原始HTML代码，使用逗号分隔的字符串
      if (tags.length > 0) {
        // 发送多个tags参数，Spring会自动转换为List
        tags.forEach((tag) => {
          formData.append('tags', tag);
        });
      }

      // 处理测试用例文件
      const testCaseFile = form.getFieldValue('testCaseFile');
      let hasFile = false;
      if (testCaseFile && Array.isArray(testCaseFile) && testCaseFile.length > 0) {
        const file = testCaseFile[0].originFileObj || testCaseFile[0];
        if (file) {
          formData.append('testCaseFile', file);
          hasFile = true;
        }
      }
      
      if (!editingProblem && !hasFile) {
        message.error('新建题目必须上传测试数据文件');
        return;
      }

      const url = editingProblem
        ? '/admin/problem/update'
        : '/admin/problem/create';
      
      let data;
      if (editingProblem) {
        data = await api.put(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      } else {
        data = await api.post(url, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      if (data.code === 200) {
        message.success(editingProblem ? '更新题目成功' : '创建题目成功');
        setModalVisible(false);
        loadProblems();
      } else {
        message.error(data.msg || '操作失败');
      }
    } catch (error) {
      message.error('操作失败');
      console.error(error);
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= 5) {
      message.warning('最多只能添加5个标签');
      return;
    }
    if (tagInput.length > 10) {
      message.warning('标签长度不能超过10个字符');
      return;
    }
    if (tags.includes(tagInput.trim())) {
      message.warning('该标签已存在');
      return;
    }
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const getDifficultyTag = (difficulty) => {
    const colors = {
      简单: 'green',
      中等: 'orange',
      困难: 'red',
    };
    return (
      <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>
    );
  };

  const columns = [
    {
      title: '题号',
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
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty) => getDifficultyTag(difficulty),
    },
    {
      title: '提交数',
      dataIndex: 'submitCount',
      key: 'submitCount',
      width: 100,
    },
    {
      title: '通过数',
      dataIndex: 'passCount',
      key: 'passCount',
      width: 100,
    },
    {
      title: '是否公开',
      dataIndex: 'open',
      key: 'open',
      width: 100,
      render: (open) => (
        <Tag color={open ? 'green' : 'red'}>{open ? '公开' : '私有'}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这道题目吗？"
            description="此操作将删除题目及其相关数据，无法撤销"
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
    <div className="admin-problems">
      <Card>
        <div className="page-header">
          <div>
            <Title level={2} style={{ margin: 0 }}>
              题目列表
            </Title>
            <Text type="secondary">管理系统中的所有题目</Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
          >
            新建题目
          </Button>
        </div>

        <div className="toolbar">
          <Search
            placeholder="搜索题目..."
            allowClear
            style={{ width: 300 }}
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <Button icon={<ReloadOutlined />} onClick={loadProblems}>
            刷新
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={problems}
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
        title={editingProblem ? '编辑题目' : '新建题目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            difficulty: '简单',
            open: true,
          }}
        >
          <Form.Item
            name="title"
            label="题目标题"
            rules={[{ required: true, message: '请输入题目标题' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item label="标签">
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入标签后按回车添加"
                onPressEnter={addTag}
              />
              <Button onClick={addTag}>添加</Button>
            </Space.Compact>
            <div style={{ marginTop: 8 }}>
              {tags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => removeTag(tag)}
                  style={{ marginBottom: 4 }}
                >
                  {tag}
                </Tag>
              ))}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              最多5个标签，每个标签不超过10个字符
            </Text>
          </Form.Item>

          <Form.Item
            name="description"
            label="题目描述"
            rules={[{ required: true, message: '请输入题目描述' }]}
          >
            <Input.TextArea rows={6} />
          </Form.Item>

          <Form.Item
            name="timeLimit"
            label="时间限制 (ms)"
            rules={[
              { required: true, message: '请输入时间限制' },
              { type: 'number', min: 1, max: 10000, message: '时间限制必须在1-10000ms之间' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={10000} />
          </Form.Item>

          <Form.Item
            name="memoryLimit"
            label="内存限制 (MB)"
            rules={[
              { required: true, message: '请输入内存限制' },
              { type: 'number', min: 1, max: 512, message: '内存限制必须在1-512MB之间' },
            ]}
          >
            <InputNumber style={{ width: '100%' }} min={1} max={512} />
          </Form.Item>

          <Form.Item
            name="difficulty"
            label="难度"
            rules={[{ required: true, message: '请选择难度' }]}
          >
            <Select>
              <Option value="简单">简单</Option>
              <Option value="中等">中等</Option>
              <Option value="困难">困难</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="inputFormat"
            label="输入格式"
            rules={[{ required: true, message: '请输入输入格式' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="outputFormat"
            label="输出格式"
            rules={[{ required: true, message: '请输入输出格式' }]}
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="inputExample" label="输入样例">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="outputExample" label="输出样例">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="hint" label="提示">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item
            name="testCaseFile"
            label="测试数据文件"
            rules={
              !editingProblem
                ? [
                    {
                      required: true,
                      message: '请上传测试数据文件',
                      validator: (_, value) => {
                        if (!value || (Array.isArray(value) && value.length === 0)) {
                          return Promise.reject(new Error('请上传测试数据文件'));
                        }
                        return Promise.resolve();
                      },
                    },
                  ]
                : []
            }
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList || [];
            }}
          >
            <Upload
              beforeUpload={() => false}
              maxCount={1}
              accept=".zip,.rar,.7z"
            >
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 4 }}>
              {editingProblem
                ? '不选择文件则保留原有测试数据'
                : '必须上传测试数据文件（zip/rar/7z格式）'}
            </Text>
          </Form.Item>

          <Form.Item name="open" label="是否公开" valuePropName="checked">
            <Switch />
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
    </div>
  );
};

export default AdminProblems;
