import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  Switch,
  Checkbox,
  Tag,
  Popconfirm,
  List,
  Empty,
} from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Settings, PlusCircle } from 'lucide-react';
import api from '@/utils/api';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface Practice {
  id: number;
  title: string;
  description?: string;
  problemCount: number;
  createTime: string;
  isPublic: boolean;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

const AdminPractices: React.FC = () => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [form] = Form.useForm();

  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentPracticeId, setCurrentPracticeId] = useState<number | null>(null);
  const [practiceProblems, setPracticeProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');

  useEffect(() => {
    loadPractices();
  }, [currentPage, pageSize, keyword]);

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/practice/list', {
        params: { pageNum: currentPage.toString(), pageSize: pageSize.toString(), keyword: keyword || undefined },
      }) as ApiResponse<Practice[]>;
      if (data.code === 200) {
        setPractices(data.data || []);
      }

      const countData = await api.get('/admin/practice/count', {
        params: { keyword: keyword || undefined },
      }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载练习列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingPractice(null);
    form.resetFields();
    form.setFieldsValue({ isPublic: true });
    setModalVisible(true);
  };

  const handleEdit = (practice: Practice) => {
    setEditingPractice(practice);
    form.setFieldsValue({
      title: practice.title,
      description: practice.description,
      isPublic: practice.isPublic,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = await api.delete(`/admin/practice/delete/${id}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除练习成功');
        loadPractices();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除练习失败');
    }
  };

  const handleManageProblems = async (practice: Practice) => {
    setCurrentPracticeId(practice.id);
    setProblemManageVisible(true);
    await loadPracticeProblems(practice.id);
    await loadAllProblems();
  };

  const loadPracticeProblems = async (practiceId: number) => {
    try {
      const data = await api.get(`/admin/practice/${practiceId}/problems`) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setPracticeProblems(data.data || []);
      }
    } catch {
      toast.error('加载练习题目失败');
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = await api.get('/admin/practice/problems') as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setAllProblems(data.data || []);
      }
    } catch {
      toast.error('加载题目列表失败');
    }
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) {
      toast('请至少选择一个题目', { icon: '⚠️' });
      return;
    }

    try {
      const data = await api.post('/admin/practice/add/problems', {
        practiceId: currentPracticeId!.toString(),
        problemIds: selectedProblems.map((p) => p.toString()),
      }) as ApiResponse;

      if (data.code === 200) {
        toast.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        loadPracticeProblems(currentPracticeId!);
      } else {
        toast.error((data as any).msg || '添加失败');
      }
    } catch {
      toast.error('添加题目失败');
    }
  };

  const handleDeleteProblemFromPractice = async (problemId: number) => {
    try {
      const data = await api.delete(`/admin/practice/${currentPracticeId}/problems/${problemId}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题目成功');
        loadPracticeProblems(currentPracticeId!);
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除题目失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const submitData = {
        title: values.title,
        description: values.description || '',
        isPublic: values.isPublic,
        ...(editingPractice ? { id: editingPractice.id } : {}),
      };

      const url = editingPractice ? '/admin/practice/update' : '/admin/practice/create';
      const method = editingPractice ? 'put' : 'post';

      const data = await (api as any)[method](url, submitData) as ApiResponse;

      if (data.code === 200) {
        toast.success(editingPractice ? '更新练习成功' : '创建练习成功');
        setModalVisible(false);
        loadPractices();
      } else {
        toast.error((data as any).msg || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const getDifficultyTag = (difficulty: string) => {
    const colors: Record<string, string> = { 简单: 'green', 中等: 'orange', 困难: 'red' };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
  };

  const filteredProblems = allProblems.filter((p) => {
    if (!problemSearchKeyword) return true;
    const kw = problemSearchKeyword.toLowerCase();
    return p.id.toString().includes(kw) || p.title.toLowerCase().includes(kw);
  });

  const addedProblemIds = new Set(practiceProblems.map((p) => p.id.toString()));
  const availableProblems = filteredProblems.filter((p) => !addedProblemIds.has(p.id.toString()));

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '题目数量', dataIndex: 'problemCount', key: 'problemCount', width: 100 },
    { title: '创建时间', dataIndex: 'createTime', key: 'createTime', render: (t: string) => formatTime(t) },
    {
      title: '状态',
      dataIndex: 'isPublic',
      key: 'isPublic',
      width: 100,
      render: (isPublic: boolean) => <Tag color={isPublic ? 'green' : 'default'}>{isPublic ? '公开' : '私有'}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: Practice) => (
        <div className="flex gap-2">
          <PermissionGuard permission={PermissionCode.PRACTICE_UPDATE}>
            <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.PRACTICE_UPDATE}>
            <Button type="link" icon={<Settings className="w-4 h-4" />} onClick={() => handleManageProblems(record)}>
              管理题目
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.PRACTICE_DELETE}>
            <Popconfirm title="确定要删除这个练习吗？" onConfirm={() => handleDelete(record.id)}>
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>练习列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有练习</p>
        </div>
        <PermissionGuard permission={PermissionCode.PRACTICE_CREATE}>
          <Button 
            type="primary" 
            icon={<Plus className="w-4 h-4" />} 
            onClick={handleAdd}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            新建练习
          </Button>
        </PermissionGuard>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <Input.Search
          placeholder="搜索练习..."
          allowClear
          className="w-72"
          onSearch={(value) => {
            setKeyword(value);
            setCurrentPage(1);
          }}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadPractices}>
          刷新
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={practices}
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

      {/* 新建/编辑练习 Modal */}
      <Modal
        title={editingPractice ? '编辑练习' : '新建练习'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="练习标题" rules={[{ required: true, message: '请输入练习标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="练习描述">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="isPublic" label="是否公开" valuePropName="checked">
            <Switch checkedChildren="公开" unCheckedChildren="私有" />
          </Form.Item>
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

      {/* 管理练习题目 Modal */}
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
        <div className="mb-4">
          <Button
            type="primary"
            icon={<PlusCircle className="w-4 h-4" />}
            onClick={() => {
              setAddProblemModalVisible(true);
              setSelectedProblems([]);
              setProblemSearchKeyword('');
            }}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
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
                  key="delete"
                  title="确定要从练习中删除这个题目吗？"
                  onConfirm={() => handleDeleteProblemFromPractice(problem.id)}
                >
                  <Button type="link" danger size="small">
                    删除
                  </Button>
                </Popconfirm>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <strong>#{problem.id}</strong> {problem.title}
                  </span>
                }
                description={getDifficultyTag(problem.difficulty)}
              />
            </List.Item>
          )}
        />
      </Modal>

      {/* 添加题目到练习 Modal */}
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
        <div className="mb-4">
          <Input.Search
            placeholder="搜索题目..."
            value={problemSearchKeyword}
            onChange={(e) => setProblemSearchKeyword(e.target.value)}
            allowClear
          />
        </div>

        <p className="text-sm mb-4" style={{ color: 'var(--gemini-text-tertiary)' }}>已选择 {selectedProblems.length} 个题目</p>

        <div 
          className="max-h-96 overflow-auto rounded-2xl p-2"
          style={{ 
            backgroundColor: 'var(--gemini-bg)',
            border: '1px solid var(--gemini-border-light)'
          }}
        >
          {availableProblems.length === 0 ? (
            <Empty description="没有可添加的题目" />
          ) : (
            <Checkbox.Group
              value={selectedProblems}
              onChange={(values) => setSelectedProblems(values as number[])}
              className="w-full"
            >
              <div className="space-y-2">
                {availableProblems.map((problem) => (
                  <div 
                    key={problem.id} 
                    className="p-2 rounded-xl"
                    style={{ 
                      backgroundColor: 'var(--gemini-surface)',
                      border: '1px solid var(--gemini-border-light)'
                    }}
                  >
                    <Checkbox value={problem.id}>
                      <strong>#{problem.id}</strong> {problem.title} {getDifficultyTag(problem.difficulty)}
                    </Checkbox>
                  </div>
                ))}
              </div>
            </Checkbox.Group>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={() => {
              setAddProblemModalVisible(false);
              setSelectedProblems([]);
            }}
          >
            取消
          </Button>
          <Button
            type="primary"
            onClick={handleBatchAddProblems}
            disabled={selectedProblems.length === 0}
            style={{ 
              backgroundColor: 'var(--gemini-accent)',
              color: 'var(--gemini-accent-text)',
              border: 'none'
            }}
          >
            批量添加 ({selectedProblems.length})
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminPractices;
