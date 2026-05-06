import { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Button,
  Modal,
  Form,
  InputNumber,
  Switch,
  Upload,
  Tag,
  Popconfirm,
  Tabs,
  Row,
  Col,
  Typography,
} from 'antd';
import toast from 'react-hot-toast';
import {
  Plus,
  RefreshCw,
  Edit,
  Trash2,
  Upload as UploadIcon,
  Eye,
  Edit3,
  Wand2,
  BookOpen,
} from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import 'highlight.js/styles/github.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import api from '@/utils/api';
import Select from '@/components/Select';
import Input from '@/components/Input';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

marked.setOptions({
  gfm: true,
  breaks: true,
});

const { Title, Paragraph, Text } = Typography;

interface ProblemExampleItem {
  input: string;
  output: string;
  sortOrder?: number;
}

interface Problem {
  id: number;
  title: string;
  description: string;
  timeLimit: number;
  memoryLimit: number;
  difficulty: string;
  inputFormat: string;
  outputFormat: string;
  judgeMode?: string;
  checkerFile?: string;
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

// 与 Input.TextArea 外壳一致（见 components/Input），预览区只读但视觉对齐
const markdownEditorSurfaceClass =
  'w-full border border-slate-200 bg-white/90 text-slate-800 shadow-sm outline-none backdrop-blur transition-all duration-200 rounded-2xl px-4 py-3 min-h-24 hover:border-blue-300';

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

  const minHeightPx = Math.max(96, rows * 24);

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
              className={`${markdownEditorSurfaceClass} prose prose-sm max-w-none overflow-auto cursor-default select-text resize-none`}
              style={{ minHeight: minHeightPx }}
              role="document"
              aria-label="Markdown 预览（只读）"
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
  const [filterTag, setFilterTag] = useState<string | undefined>(undefined);
  const [tagOptions, setTagOptions] = useState<{ id: number; name: string }[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [form] = Form.useForm();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [checkerFileList, setCheckerFileList] = useState<any[]>([]);
  const [checkerGuideVisible, setCheckerGuideVisible] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);
  const [examplesList, setExamplesList] = useState<ProblemExampleItem[]>([{ input: '', output: '', sortOrder: 0 }]);

  useEffect(() => {
    const loadTagList = async () => {
      try {
        const res = await api.get('/tag/list') as ApiResponse<{ id: number; name: string }[]>;
        if (res.code === 200 && res.data) {
          setTagOptions(res.data);
        }
      } catch {
        // 标签列表加载失败时忽略，筛选下拉可为空
      }
    };
    loadTagList();
  }, []);

  useEffect(() => {
    loadProblems();
  }, [currentPage, pageSize, keyword, filterTag]);

  const loadProblems = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/problem/list', {
        params: {
          offset: ((currentPage - 1) * pageSize).toString(),
          size: pageSize.toString(),
          keyword: keyword || undefined,
          tag: filterTag || undefined,
        },
      }) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setProblems(data.data || []);
      }

      const countData = await api.get('/admin/problem/count', {
        params: { keyword: keyword || undefined, tag: filterTag || undefined },
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

  const showModal = async (problem: Problem | null = null) => {
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
        judgeMode: problem.judgeMode || 'standard',
        hint: problem.hint,
        open: problem.open,
      });
      setTags(problem.tags || []);
      setFileList([]);
      setCheckerFileList([]);
      try {
        const res = await api.get('/admin/problem/examples', { params: { pid: problem.id } }) as ApiResponse<ProblemExampleItem[]>;
        if (res.code === 200 && res.data?.length) {
          setExamplesList(res.data.map((e, i) => ({ input: e.input ?? '', output: e.output ?? '', sortOrder: i })));
        } else {
          setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
        }
      } catch {
        setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
      }
    } else {
      form.resetFields();
      setTags([]);
      setFileList([]);
      setCheckerFileList([]);
      setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
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
      formData.append(
        'judgeMode',
        String(values.judgeMode ?? form.getFieldValue('judgeMode') ?? 'standard')
      );
      const validExamples = examplesList.filter((e) => (e.input ?? '').trim() || (e.output ?? '').trim());
      formData.append('examples', JSON.stringify(validExamples.map((e, i) => ({ input: e.input ?? '', output: e.output ?? '', sortOrder: i }))));
      formData.append('inputExample', validExamples[0]?.input ?? '');
      formData.append('outputExample', validExamples[0]?.output ?? '');
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

      let hasCheckerFile = false;
      if (checkerFileList.length > 0) {
        const fileObj = checkerFileList[0];
        const file = fileObj.originFileObj || fileObj;
        if (file && file instanceof File) {
          formData.append('checkerFile', file);
          hasCheckerFile = true;
        }
      }

      if (!editingProblem && !hasFile) {
        toast.error('新建题目必须上传测试数据文件');
        return;
      }

      if (values.judgeMode === 'special' && !hasCheckerFile && !editingProblem?.checkerFile) {
        toast.error('构造题必须上传 checker 代码文件');
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

  // AI解析markdown题目描述
  const handleAiParse = async () => {
    if (!aiInput.trim()) {
      toast.error('请先粘贴题目内容');
      return;
    }
    setAiParsing(true);
    try {
      const prompt = `请解析以下题目描述，提取信息并返回JSON格式（不要返回其他内容，只返回纯JSON）。

要求：
1. 若题目中有多组「样例」「示例」「输入/输出」等，请全部识别并填入 examples 数组。
2. examples 为数组，每项为 { "input": "该组输入", "output": "该组输出" }，按出现顺序排列。

JSON 格式：
{
  "title": "题目标题",
  "description": "题目描述（保留原始markdown格式）",
  "inputFormat": "输入格式说明",
  "outputFormat": "输出格式说明",
  "examples": [
    { "input": "第一组输入内容", "output": "第一组输出内容" },
    { "input": "第二组输入内容", "output": "第二组输出内容" }
  ],
  "hint": "提示信息（如数据范围等，可为空）",
  "difficulty": "简单/中等/困难",
  "tags": ["标签1", "标签2"]
}

题目内容：
${aiInput}`;

      const response = await fetch('/api/v1/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: prompt,
      });

      if (!response.ok) {
        throw new Error('AI服务请求失败');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应');

      let fullText = '';
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // 处理SSE格式：移除 "data:" 前缀并拼接
      const lines = fullText.split('\n');
      let content = '';
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5); // 移除 "data:" 前缀
          if (data === '[DONE]') continue;
          content += data;
        }
      }

      // 提取JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI返回格式错误，无法解析');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 填充表单
      form.setFieldsValue({
        title: parsed.title || '',
        description: parsed.description || '',
        inputFormat: parsed.inputFormat || '',
        outputFormat: parsed.outputFormat || '',
        hint: parsed.hint || '',
        difficulty: parsed.difficulty || '简单',
      });

      // 多组样例：优先使用 examples 数组，否则用单组 inputExample/outputExample
      if (parsed.examples && Array.isArray(parsed.examples) && parsed.examples.length > 0) {
        setExamplesList(
          parsed.examples.map((e: { input?: string; output?: string }, i: number) => ({
            input: (e.input ?? '').trim(),
            output: (e.output ?? '').trim(),
            sortOrder: i,
          }))
        );
      } else if (parsed.inputExample != null || parsed.outputExample != null) {
        setExamplesList([
          { input: (parsed.inputExample ?? '').trim(), output: (parsed.outputExample ?? '').trim(), sortOrder: 0 },
        ]);
      } else {
        setExamplesList([{ input: '', output: '', sortOrder: 0 }]);
      }

      if (parsed.tags && Array.isArray(parsed.tags)) {
        setTags(parsed.tags.slice(0, 5));
      }

      toast.success('AI解析成功，已自动填充表单');
      setAiInput('');
    } catch (error: any) {
      console.error('AI解析失败:', error);
      toast.error(error.message || 'AI解析失败，请手动填写');
    } finally {
      setAiParsing(false);
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
    {
      title: '判题模式',
      dataIndex: 'judgeMode',
      key: 'judgeMode',
      width: 110,
      render: (mode: string) => <Tag color={mode === 'special' ? 'purple' : 'blue'}>{mode === 'special' ? '构造题' : '普通评测'}</Tag>,
    },
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
          <PermissionGuard permission={PermissionCode.PROBLEM_UPDATE}>
            <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => showModal(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.PROBLEM_DELETE}>
            <Popconfirm title="确定要删除这道题目吗？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger icon={<Trash2 className="w-4 h-4" />}>
                删除
              </Button>
            </Popconfirm>
          </PermissionGuard>
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
        <PermissionGuard permission={PermissionCode.PROBLEM_CREATE}>
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
        </PermissionGuard>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Input.Search
            placeholder="搜索题目..."
            allowClear
            className="w-72"
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <Select
            placeholder="按标签筛选"
            allowClear
            className="w-40"
            value={filterTag || undefined}
            onChange={(value) => {
              setFilterTag(value ?? undefined);
              setCurrentPage(1);
            }}
            options={tagOptions.map((t) => ({ label: t.name, value: t.name }))}
          />
        </div>
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
        centered
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ difficulty: '简单', open: true, judgeMode: 'standard' }}
        >
          {/* 智能解析：全宽输入 + 底部操作，避免侧栏挤压 */}
          <div className="mb-6">
            <div
              className="rounded-2xl p-4 space-y-3"
              style={{
                backgroundColor: 'var(--gemini-bg)',
                border: '1px solid var(--gemini-border-light)',
              }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: 'linear-gradient(135deg, color-mix(in srgb, var(--gemini-accent-strong) 22%, transparent), color-mix(in srgb, var(--gemini-accent) 12%, transparent))',
                  }}
                >
                  <Wand2 className="h-[18px] w-[18px]" style={{ color: 'var(--gemini-accent-strong)' }} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-sm font-semibold m-0 leading-snug" style={{ color: 'var(--gemini-text-primary)' }}>
                    从 Markdown 填入题目
                  </p>
                  <p className="text-xs mt-1 mb-0 leading-relaxed" style={{ color: 'var(--gemini-text-tertiary)' }}>
                    粘贴含标题、描述、输入输出说明与样例的文本；解析结果会写入下方表单（需已配置可用的 AI 接口）。
                  </p>
                </div>
              </div>
              <Input.TextArea
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                placeholder="在此粘贴题目全文…"
                rows={5}
                className="!rounded-xl"
                style={{ resize: 'vertical' }}
              />
              <div className="flex flex-wrap items-center justify-end gap-2 pt-0.5">
                <Button
                  type="primary"
                  shape="round"
                  size="middle"
                  icon={aiParsing ? undefined : <Wand2 className="w-4 h-4" />}
                  loading={aiParsing}
                  disabled={!aiInput.trim()}
                  onClick={handleAiParse}
                  style={{
                    backgroundColor: 'var(--gemini-accent)',
                    color: 'var(--gemini-accent-text)',
                    border: 'none',
                    paddingLeft: 18,
                    paddingRight: 18,
                    height: 36,
                  }}
                >
                  {aiParsing ? '正在解析…' : '解析并填入表单'}
                </Button>
              </div>
            </div>
          </div>

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
                <InputNumber
                  className="w-full"
                  size="large"
                  min={1}
                  max={10000}
                  style={{ borderRadius: '1rem', overflow: 'hidden' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="memoryLimit"
                label="内存限制 (MB)"
                rules={[{ required: true, message: '请输入内存限制' }]}
              >
                <InputNumber
                  className="w-full"
                  size="large"
                  min={1}
                  style={{ borderRadius: '1rem', overflow: 'hidden' }}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="difficulty" label="难度" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: '简单', label: '简单' },
                    { value: '中等', label: '中等' },
                    { value: '困难', label: '困难' },
                  ]}
                />
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

          <Form.Item name="judgeMode" label="判题模式" rules={[{ required: true, message: '请选择判题模式' }]}>
            <Select
              options={[
                { value: 'standard', label: '普通评测' },
                { value: 'special', label: '构造题（Special Judge）' },
              ]}
            />
          </Form.Item>

          <Form.Item label="输入/输出样例（可多组）">
            <div className="space-y-4">
              {examplesList.map((_, index) => (
                <div key={index} className="flex flex-col gap-2">
                  <div className="flex items-center justify-end">
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() => {
                        if (examplesList.length <= 1) return;
                        setExamplesList(examplesList.filter((_, i) => i !== index));
                      }}
                      disabled={examplesList.length <= 1}
                    >
                      删除样例 {index + 1}
                    </Button>
                  </div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <div className="text-sm font-medium mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
                        输入样例 {index + 1}
                      </div>
                      <Input.TextArea
                        rows={3}
                        value={examplesList[index]?.input ?? ''}
                        onChange={(e) => {
                          const next = [...examplesList];
                          next[index] = { ...next[index], input: e.target.value, sortOrder: index };
                          setExamplesList(next);
                        }}
                        placeholder="请输入样例输入"
                      />
                    </Col>
                    <Col span={12}>
                      <div className="text-sm font-medium mb-2" style={{ color: 'var(--gemini-text-primary)' }}>
                        输出样例 {index + 1}
                      </div>
                      <Input.TextArea
                        rows={3}
                        value={examplesList[index]?.output ?? ''}
                        onChange={(e) => {
                          const next = [...examplesList];
                          next[index] = { ...next[index], output: e.target.value, sortOrder: index };
                          setExamplesList(next);
                        }}
                        placeholder="请输入样例输出"
                      />
                    </Col>
                  </Row>
                </div>
              ))}
              <Button
                type="dashed"
                onClick={() => setExamplesList([...examplesList, { input: '', output: '', sortOrder: examplesList.length }])}
                className="w-full"
              >
                + 添加一组样例
              </Button>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--gemini-text-tertiary)' }}>
              至少保留一组样例；多组将按顺序展示给用户
            </p>
          </Form.Item>

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
            <Col span={18}>
              <Form.Item label="Checker 代码文件">
                <div className="flex flex-wrap items-center gap-2">
                  <Upload
                    fileList={checkerFileList}
                    onChange={({ fileList }) => setCheckerFileList(fileList)}
                    beforeUpload={(file) => {
                      const isValid = ['.cpp', '.cc', '.cxx'].some((ext) => file.name.endsWith(ext));
                      if (!isValid) {
                        toast.error('只能上传 .cpp, .cc, .cxx 格式的 checker 文件！');
                        return Upload.LIST_IGNORE;
                      }
                      return false;
                    }}
                    maxCount={1}
                    accept=".cpp,.cc,.cxx"
                  >
                    <Button icon={<UploadIcon className="w-4 h-4" />}>选择 Checker</Button>
                  </Upload>
                  <Button
                    type="default"
                    icon={<BookOpen className="w-4 h-4" />}
                    onClick={() => setCheckerGuideVisible(true)}
                  >
                    编写规范
                  </Button>
                </div>
                <p className="text-xs mt-1" style={{ color: 'var(--gemini-text-tertiary)' }}>
                  判题模式为构造题时必传；编辑时不选择则保留原 checker
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

      <Modal
        title="OJ Checker 编写规范指南"
        open={checkerGuideVisible}
        centered
        onCancel={() => setCheckerGuideVisible(false)}
        footer={
          <Button type="primary" onClick={() => setCheckerGuideVisible(false)}>
            知道了
          </Button>
        }
        width={760}
        destroyOnClose
      >
        <div className="text-sm" style={{ color: 'var(--gemini-text-secondary)' }}>
          <Paragraph style={{ marginBottom: 16 }}>
            <Text strong style={{ color: 'var(--gemini-text-primary)' }}>
              本 OJ 构造题
            </Text>
            调用 checker 时使用命令行：程序名后依次为{' '}
            <Text code>input.txt</Text>、<Text code>answer.txt</Text>（标答占位，可为空）、
            <Text code>output.txt</Text>（选手输出），即通常{' '}
            <Text code>argv[1]</Text> 为题面输入、<Text code>argv[2]</Text> 为标准答案文件、
            <Text code>argv[3]</Text> 为选手输出文件。编写 checker 时请与此保持一致。
          </Paragraph>

          <Title level={5} style={{ marginTop: 0 }}>
            1. 命令行参数处理（CLI Arguments）
          </Title>
          <Paragraph>
            Checker 应兼容常见评测插件（如 Lemon、HUSTOJ、Aris 等）的调用习惯。
          </Paragraph>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>
              <Text strong>参数映射：</Text>通常 <Text code>argv[1]</Text> 为标准输入，
              <Text code>argv[2]</Text> 为标准答案，<Text code>argv[3]</Text> 为选手输出。
            </li>
            <li>
              <Text strong>兼容性逻辑：</Text>根据 <Text code>argc</Text> 判断参数个数；在仅有 3
              个有效路径参数（或平台只传入输入与输出）时，仍能正确定位选手输出文件（常见写法：四参时用{' '}
              <Text code>argv[3]</Text>，三参时用 <Text code>argv[2]</Text>）。
            </li>
          </ul>

          <Title level={5}>2. 输入输出流管理（Stream Management）</Title>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>
              <Text strong>文件流：</Text>使用 <Text code>ifstream</Text> 读取输入文件与选手输出文件。
            </li>
            <li>
              <Text strong>异常防护：</Text>打开流后必须检查是否成功，避免缺文件导致 checker 崩溃。
            </li>
            <li>
              <Text strong>Token 化读取：</Text>优先使用 <Text code>{'>>'}</Text> 或自定义{' '}
              <Text code>readToken</Text>，便于忽略多余空格与换行。
            </li>
          </ul>

          <Title level={5}>3. 数据校验逻辑（Validation Logic）</Title>
          <Paragraph>构造类题目校验建议步骤：</Paragraph>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>
              <Text strong>非法值检查：</Text>输出是否为合法整数、是否在题面范围内（例如不超过 10⁹）。
            </li>
            <li>
              <Text strong>唯一性检查：</Text>若要求「互不相同」，应用比较或集合等方式去重验证。
            </li>
            <li>
              <Text strong>无解判定：</Text>若存在无解情况，需验证选手在恰当时机输出{' '}
              <Text code>-1</Text>（并与题面约定一致）。
            </li>
          </ul>

          <Title level={5}>4. 数值安全性（Numerical Safety）</Title>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li>
              <Text strong>精度：</Text>验证分式等式（如{' '}
              <Text code>1/x + 1/y + 1/z = 2/n</Text>
              ）时，禁止使用 <Text code>double</Text> / <Text code>float</Text> 直接比较；应通分转化为整数等式再判。
            </li>
            <li>
              <Text strong>溢出：</Text>10⁹ 量级三数相乘可达约 10²⁷，超出 <Text code>long long</Text>{' '}
              范围。请在 C++ 中对中间量使用 <Text code>__int128</Text>（或等价精确整数）后再比较。
            </li>
          </ul>

          <Title level={5}>5. 返回值约定（Exit Codes）</Title>
          <ul className="list-disc pl-5 space-y-1 mb-0">
            <li>
              <Text code>return 0</Text>：答案通过（Accepted）。
            </li>
            <li>
              <Text code>return 1</Text> 或非零：答案错误或输出格式错误（Wrong Answer）。
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProblems;
