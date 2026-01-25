import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  InputNumber,
  Select,
  Switch,
  Upload,
  Tag,
  Popconfirm,
  Tabs,
  Row,
  Col,
} from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Upload as UploadIcon, Eye, Edit3 } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import hljs from 'highlight.js';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import type { ApiResponse } from '@/types';

marked.setOptions({
  gfm: true,
  breaks: true,
});

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: string;
  inputFormat: string;
  outputFormat: string;
  inputExample?: string;
  outputExample?: string;
  hint?: string;
  open: boolean;
  submitCount: number;
  passCount: number;
  tags?: string[];
}

// 渲染 LaTeX 公式
const renderLatex = (text: string) => {
  if (!text) return text;
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return match;
    }
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return match;
    }
  });
  return text;
};

// Markdown 编辑器组件 - Gemini 风格
const MarkdownEditor: React.FC<{
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows?: number;
  placeholder?: string;
}> = ({ value, onChange, rows = 4, placeholder }) => {
  const [activeTab, setActiveTab] = useState('edit');

  const renderMarkdown = useCallback((content: string) => {
    if (!content || !content.trim()) return '<span style="color: var(--gemini-text-disabled);">暂无内容</span>';
    const withLatex = renderLatex(content);
    return DOMPurify.sanitize(marked.parse(withLatex) as string);
  }, []);

  return (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      size="small"
      items={[
        {
          key: 'edit',
          label: (
            <span className="flex items-center gap-1">
              <Edit3 className="w-3 h-3" /> 编辑
            </span>
          ),
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
          label: (
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> 预览
            </span>
          ),
          children: (
            <div
              className="prose prose-sm max-w-none p-3 rounded-2xl min-h-[100px] overflow-auto"
              style={{ 
                minHeight: rows * 24,
                backgroundColor: 'var(--gemini-bg)',
                border: '1px solid var(--gemini-border-light)'
              }}
              dangerouslySetInnerHTML={{ __html: renderMarkdown(value || '') }}
            />
          ),
        },
      ]}
    />
  );
};

const AdminProblems: React.FC = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [form] = Form.useForm();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);

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
      }) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      const countData = await api.get('/admin/problem/count', {
        params: { keyword: keyword || undefined },
      }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载题目列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const showModal = (problem: Problem | null = null) => {
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

  const handleDelete = async (id: number) => {
    try {
      const data = await api.delete(`/admin/problem/delete/${id}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题目成功');
        loadProblems();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除题目失败');
    }
  };

  const handleSubmit = async (values: any) => {
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

      if (tags.length > 0) {
        tags.forEach((tag) => formData.append('tags', tag));
      } else {
        formData.append('tags', '');
      }

      let hasFile = false;
      if (fileList.length > 0) {
        const fileObj = fileList[0];
        const file = fileObj.originFileObj || fileObj;
        if (file && file instanceof File) {
          formData.append('testCaseFile', file);
          hasFile = true;
        }
      }

      if (!editingProblem && !hasFile) {
        toast.error('新建题目必须上传测试数据文件');
        return;
      }

      const url = editingProblem ? '/admin/problem/update' : '/admin/problem/create';

      let data: ApiResponse;
      if (editingProblem) {
        data = await api.put(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }) as ApiResponse;
      } else {
        data = await api.post(url, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        }) as ApiResponse;
      }

      if (data.code === 200) {
        toast.success(editingProblem ? '更新题目成功' : '创建题目成功');
        setModalVisible(false);
        loadProblems();
      } else {
        toast.error((data as any).msg || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const addTag = () => {
    if (!tagInput.trim()) return;
    if (tags.length >= 5) {
      toast('最多只能添加5个标签');
      return;
    }
    if (tagInput.length > 10) {
      toast('标签长度不能超过10个字符');
      return;
    }
    if (tags.includes(tagInput.trim())) {
      toast('该标签已存在');
      return;
    }
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const getDifficultyTag = (difficulty: string) => {
    const colors: Record<string, string> = { 简单: 'green', 中等: 'orange', 困难: 'red' };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  const columns = [
    { title: '题号', dataIndex: 'id', key: 'id', width: 80 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '难度', dataIndex: 'difficulty', key: 'difficulty', render: (d: string) => getDifficultyTag(d) },
    { title: '提交数', dataIndex: 'submitCount', key: 'submitCount', width: 100 },
    { title: '通过数', dataIndex: 'passCount', key: 'passCount', width: 100 },
    {
      title: '公开',
      dataIndex: 'open',
      key: 'open',
      width: 80,
      render: (open: boolean) => <Tag color={open ? 'green' : 'red'}>{open ? '公开' : '私有'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: Problem) => (
        <div className="flex gap-2">
          <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => showModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确定要删除这道题目吗？" onConfirm={() => handleDelete(record.id)}>
            <Button type="link" danger icon={<Trash2 className="w-4 h-4" />}>
              删除
            </Button>
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="gemini-card">
      {/* Header - Gemini 风格 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题目列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有题目</p>
        </div>
        <Button 
          type="primary" 
          icon={<Plus className="w-4 h-4" />} 
          onClick={() => showModal(null)}
          style={{ 
            backgroundColor: 'var(--gemini-accent)',
            color: 'var(--gemini-accent-text)',
            border: 'none'
          }}
        >
          新建题目
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <Input.Search
          placeholder="搜索题目..."
          allowClear
          className="w-72"
          onSearch={(value) => {
            setKeyword(value);
            setCurrentPage(1);
          }}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadProblems}>
          刷新
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={problems}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (page, size) => {
            setCurrentPage(page);
            setPageSize(size);
          },
        }}
      />

      {/* Modal */}
      <Modal
        title={editingProblem ? '编辑题目' : '新建题目'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={1100}
        style={{ top: 20 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ difficulty: '简单', open: true }}
        >
          <Form.Item name="title" label="题目标题" rules={[{ required: true, message: '请输入题目标题' }]}>
            <Input />
          </Form.Item>

          <Form.Item label="标签">
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="输入标签后按回车添加"
                onPressEnter={addTag}
                className="flex-1"
              />
              <Button onClick={addTag}>添加</Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <Tag key={tag} closable onClose={() => removeTag(tag)}>
                  {tag}
                </Tag>
              ))}
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--gemini-text-tertiary)' }}>最多5个标签，每个不超过10个字符</p>
          </Form.Item>

          <Form.Item
            name="description"
            label="题目描述（支持 Markdown）"
            rules={[{ required: true, message: '请输入题目描述' }]}
          >
            <MarkdownEditor rows={6} placeholder="请输入题目描述" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="timeLimit"
                label="时间限制 (ms)"
                rules={[{ required: true, message: '请输入时间限制' }]}
              >
                <InputNumber className="w-full" min={1} max={10000} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memoryLimit"
                label="内存限制 (MB)"
                rules={[{ required: true, message: '请输入内存限制' }]}
              >
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
                <Select>
                  <Select.Option value="简单">简单</Select.Option>
                  <Select.Option value="中等">中等</Select.Option>
                  <Select.Option value="困难">困难</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="inputFormat"
                label="输入格式"
                rules={[{ required: true, message: '请输入输入格式' }]}
              >
                <MarkdownEditor rows={4} placeholder="请输入输入格式说明" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="outputFormat"
                label="输出格式"
                rules={[{ required: true, message: '请输入输出格式' }]}
              >
                <MarkdownEditor rows={4} placeholder="请输入输出格式说明" />
              </Form.Item>
            </Col>
          </Row>

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

          <Form.Item name="hint" label="提示">
            <MarkdownEditor rows={4} placeholder="请输入提示信息" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={18}>
              <Form.Item label="测试数据文件">
                <Upload
                  fileList={fileList}
                  onChange={({ fileList }) => setFileList(fileList)}
                  beforeUpload={(file) => {
                    const isValid = ['.zip', '.rar', '.7z'].some((ext) => file.name.endsWith(ext));
                    if (!isValid) {
                      toast.error('只能上传 .zip, .rar, .7z 格式的文件！');
                      return Upload.LIST_IGNORE;
                    }
                    return false;
                  }}
                  maxCount={1}
                  accept=".zip,.rar,.7z"
                >
                  <Button icon={<UploadIcon className="w-4 h-4" />}>选择文件</Button>
                </Upload>
                <p className="text-xs mt-1" style={{ color: 'var(--gemini-text-tertiary)' }}>
                  {editingProblem ? '不选择文件则保留原有测试数据' : '必须上传测试数据文件'}
                </p>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="open" label="是否公开" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ 
                  backgroundColor: 'var(--gemini-accent)',
                  color: 'var(--gemini-accent-text)',
                  border: 'none'
                }}
              >
                保存
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminProblems;
