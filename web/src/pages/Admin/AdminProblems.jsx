import { useState, useEffect, useCallback } from 'react';
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
  Row,
  Col,
  Tabs,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  EditOutlined,
  DeleteOutlined,
  UploadOutlined,
  EyeOutlined,
  EditFilled,
} from '@ant-design/icons';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '../../utils/api';
import './AdminProblems.css';

// 配置 marked
marked.setOptions({
  gfm: true,
  breaks: true,
  highlight(code, lang) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  },
});

// 渲染 LaTeX 公式
const renderLatex = (text) => {
  if (!text) return text;
  // 处理块级公式 $$...$$
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch (e) {
      return match;
    }
  });
  // 处理行内公式 $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch (e) {
      return match;
    }
  });
  return text;
};

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

// Markdown 编辑器组件，支持编辑和预览切换
const MarkdownEditor = ({ value, onChange, rows = 4, placeholder }) => {
  const [activeTab, setActiveTab] = useState('edit');
  
  const renderMarkdown = useCallback((content) => {
    if (!content || !content.trim()) return '<span style="color: #999;">暂无内容</span>';
    // 先处理 LaTeX 公式，再解析 Markdown
    const withLatex = renderLatex(content);
    return DOMPurify.sanitize(marked.parse(withLatex));
  }, []);

  return (
    <div className="markdown-editor">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={[
          {
            key: 'edit',
            label: <span><EditFilled /> 编辑</span>,
            children: (
              <Input.TextArea
                value={value}
                onChange={onChange}
                rows={rows}
                placeholder={placeholder || '支持 Markdown 格式'}
              />
            ),
          },
          {
            key: 'preview',
            label: <span><EyeOutlined /> 预览</span>,
            children: (
              <div
                className="markdown-preview markdown-body"
                style={{
                  minHeight: rows * 24,
                  padding: '8px 12px',
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                  backgroundColor: '#fafafa',
                  overflow: 'auto',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

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
  const [fileList, setFileList] = useState([]);
  const [messageApi, contextHolder] = message.useMessage();

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
        messageApi.error('加载题目列表失败');
        console.error(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const showModal = (problem = null) => {
    setEditingProblem(problem);
    setModalVisible(true);
    if (problem) {
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
      setFileList([]);
    } else {
      form.resetFields();
      setTags([]);
      setFileList([]);
    }
  };

  const handleAdd = () => {
    showModal(null);
  };

  const handleDelete = async (id) => {
    try {
      const data = await api.delete(`/admin/problem/delete/${id}`);
      if (data.code === 200) {
        messageApi.success('删除题目成功');
        loadProblems();
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
      const formData = new FormData();
      
      if (editingProblem) {
        formData.append('id', editingProblem.id.toString());
      }
      
      formData.append('title', values.title);
      formData.append('description', values.description);
      formData.append('timeLimit', String(Number(values.timeLimit)));
      formData.append('memoryLimit', String(Number(values.memoryLimit)));
      formData.append('difficulty', values.difficulty);
      formData.append('inputFormat', values.inputFormat);
      formData.append('outputFormat', values.outputFormat);
      formData.append('inputExample', values.inputExample || '');
      formData.append('outputExample', values.outputExample || '');
      formData.append('hint', values.hint || '');
      formData.append('open', values.open ? 'true' : 'false');
      
      // 处理标签 - 后端期望的是List<String>
      if (tags.length > 0) {
        // 发送多个tags参数，Spring会自动转换为List
        tags.forEach((tag) => {
          formData.append('tags', tag);
        });
      } else {
        // 没有标签时，发送空数组（通过发送空的tags参数）
        formData.append('tags', '');
      }

      // 处理测试用例文件 - 直接从 fileList 状态获取
      let hasFile = false;
      if (fileList && fileList.length > 0) {
        const fileObj = fileList[0];
        const file = fileObj.originFileObj || fileObj;
        
        if (file && file instanceof File) {
          formData.append('testCaseFile', file);
          hasFile = true;
          console.log('上传文件:', file.name, '大小:', file.size);
        } else {
          console.error('文件对象无效:', fileObj);
        }
      }
      
      if (!editingProblem && !hasFile) {
        messageApi.error('新建题目必须上传测试数据文件');
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
        messageApi.success(editingProblem ? '更新题目成功' : '创建题目成功');
        setModalVisible(false);
        loadProblems();
      } else {
        messageApi.error(data.msg || '操作失败');
      }
    } catch (error) {
      messageApi.error('操作失败');
      console.error(error);
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= 5) {
      messageApi.warning('最多只能添加5个标签');
      return;
    }
    if (tagInput.length > 10) {
      messageApi.warning('标签长度不能超过10个字符');
      return;
    }
    if (tags.includes(tagInput.trim())) {
      messageApi.warning('该标签已存在');
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
            onClick={() => showModal(record)}
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
      {contextHolder}
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
        width={1200}
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
          {/* 第一行：标题 */}
          <Form.Item
            name="title"
            label="题目标题"
            rules={[{ required: true, message: '请输入题目标题' }]}
          >
            <Input />
          </Form.Item>

          {/* 第二行：标签 */}
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

          {/* 第三行：题目描述 */}
          <Form.Item
            name="description"
            label="题目描述（支持 Markdown）"
            rules={[{ required: true, message: '请输入题目描述' }]}
          >
            <MarkdownEditor rows={6} placeholder="请输入题目描述，支持 Markdown 格式" />
          </Form.Item>

          {/* 第四行：两列布局 - 基本信息 */}
          <Row gutter={16}>
            <Col span={8}>
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
            </Col>
            <Col span={8}>
              <Form.Item
                name="memoryLimit"
                label="内存限制 (MB)"
                rules={[
                  { required: true, message: '请输入内存限制' },
                  { type: 'number', min: 1, message: '内存限制必须大于0' },
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
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
            </Col>
          </Row>

          {/* 第五行：两列布局 - 输入输出格式 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inputFormat"
                label="输入格式（支持 Markdown）"
                rules={[{ required: true, message: '请输入输入格式' }]}
              >
                <MarkdownEditor rows={4} placeholder="请输入输入格式说明" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="outputFormat"
                label="输出格式（支持 Markdown）"
                rules={[{ required: true, message: '请输入输出格式' }]}
              >
                <MarkdownEditor rows={4} placeholder="请输入输出格式说明" />
              </Form.Item>
            </Col>
          </Row>

          {/* 第六行：两列布局 - 输入输出样例 */}
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="inputExample" label="输入样例">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="outputExample" label="输出样例">
                <Input.TextArea rows={3} />
              </Form.Item>
            </Col>
          </Row>

          {/* 第七行：提示 */}
          <Form.Item name="hint" label="提示（支持 Markdown）">
            <MarkdownEditor rows={4} placeholder="请输入提示信息，如数据范围、注意事项等" />
          </Form.Item>

          {/* 第八行：两列布局 - 文件上传和公开设置 */}
          <Row gutter={16}>
            <Col span={18}>
              <div style={{ marginBottom: 24 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text>测试数据文件</Text>
                  {!editingProblem && <Text type="danger"> *</Text>}
                </div>
                <Upload
                  fileList={fileList}
                  onChange={({ fileList: newFileList }) => {
                    setFileList(newFileList);
                  }}
                  beforeUpload={(file) => {
                    // 验证文件类型
                    const isValidType = file.name.endsWith('.zip') || 
                                       file.name.endsWith('.rar') || 
                                       file.name.endsWith('.7z');
                    if (!isValidType) {
                      messageApi.error('只能上传 .zip, .rar, .7z 格式的文件！');
                      return Upload.LIST_IGNORE;
                    }
                    
                    // 验证文件大小（限制 100MB）
                    const isLt100M = file.size / 1024 / 1024 < 100;
                    if (!isLt100M) {
                      messageApi.error('文件大小不能超过 100MB！');
                      return Upload.LIST_IGNORE;
                    }
                    
                    console.log('文件选择成功:', file.name, '大小:', (file.size / 1024).toFixed(2), 'KB');
                    return false; // 阻止自动上传
                  }}
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
              </div>
            </Col>
            <Col span={6}>
              <Form.Item name="open" label="是否公开" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

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
