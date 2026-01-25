import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Input,
  Modal,
  Form,
  DatePicker,
  Switch,
  Checkbox,
  Tag,
  Popconfirm,
  List,
  Empty,
} from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Settings, PlusCircle } from 'lucide-react';
import dayjs from 'dayjs';
import api from '@/utils/api';
import type { ApiResponse } from '@/types';

interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  password?: string;
  needPassword?: boolean;
  number?: number;
}

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

const AdminCompetitions: React.FC = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [form] = Form.useForm();

  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentCompetitionId, setCurrentCompetitionId] = useState<number | null>(null);
  const [competitionProblems, setCompetitionProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');

  useEffect(() => {
    loadCompetitions();
  }, [currentPage, pageSize, keyword]);

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = await api.get('/admin/competition/list', {
        params: { pageNum: currentPage.toString(), pageSize: pageSize.toString(), keyword: keyword || undefined },
      }) as ApiResponse<Competition[]>;
      if (data.code === 200) {
        setCompetitions(data.data || []);
      }

      const countData = await api.get('/admin/competition/count', {
        params: { keyword: keyword || undefined },
      }) as ApiResponse<number>;
      if (countData.code === 200) {
        setTotal(countData.data || 0);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载比赛列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingCompetition(null);
    form.resetFields();
    form.setFieldsValue({ needPassword: false });
    setModalVisible(true);
  };

  const handleEdit = (competition: Competition) => {
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

  const handleDelete = async (id: number) => {
    try {
      const data = await api.delete(`/admin/competition/delete/${id}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除比赛成功');
        loadCompetitions();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除比赛失败');
    }
  };

  const handleManageProblems = async (competition: Competition) => {
    setCurrentCompetitionId(competition.id);
    setProblemManageVisible(true);
    await loadCompetitionProblems(competition.id);
    await loadAllProblems();
  };

  const loadCompetitionProblems = async (cid: number) => {
    try {
      const data = await api.get(`/admin/competition/${cid}/problems`) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setCompetitionProblems(data.data || []);
      }
    } catch {
      toast.error('加载比赛题目失败');
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = await api.get('/admin/competition/problems') as ApiResponse<Problem[]>;
      if (data.code === 200) {
        setAllProblems(data.data || []);
      }
    } catch {
      toast.error('加载题目列表失败');
    }
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) {
      toast('请至少选择一个题目');
      return;
    }

    try {
      const data = await api.post('/admin/competition/add/problems/batch', {
        cid: currentCompetitionId!.toString(),
        pids: selectedProblems.map((p) => p.toString()),
      }) as ApiResponse;

      if (data.code === 200) {
        toast.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        loadCompetitionProblems(currentCompetitionId!);
      } else {
        toast.error((data as any).msg || '添加失败');
      }
    } catch {
      toast.error('添加题目失败');
    }
  };

  const handleDeleteProblemFromCompetition = async (pid: number) => {
    try {
      const data = await api.delete(`/admin/competition/${currentCompetitionId}/problems/${pid}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题目成功');
        loadCompetitionProblems(currentCompetitionId!);
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
        beginTime: values.beginTime.format('YYYY-MM-DD HH:mm:ss'),
        endTime: values.endTime.format('YYYY-MM-DD HH:mm:ss'),
        password: values.needPassword ? values.password || '' : '',
        needPassword: values.needPassword || false,
        ...(editingCompetition ? { id: editingCompetition.id } : {}),
      };

      const url = editingCompetition ? '/admin/competition/update' : '/admin/competition/create';
      const method = editingCompetition ? 'put' : 'post';

      const data = await (api as any)[method](url, submitData) as ApiResponse;

      if (data.code === 200) {
        toast.success(editingCompetition ? '更新比赛成功' : '创建比赛成功');
        setModalVisible(false);
        loadCompetitions();
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

  const addedProblemIds = new Set(competitionProblems.map((p) => p.id.toString()));
  const availableProblems = filteredProblems.filter((p) => !addedProblemIds.has(p.id.toString()));

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '开始时间', dataIndex: 'beginTime', key: 'beginTime', render: (t: string) => formatTime(t) },
    { title: '结束时间', dataIndex: 'endTime', key: 'endTime', render: (t: string) => formatTime(t) },
    { title: '参与人数', dataIndex: 'number', key: 'number', width: 100 },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: Competition) => (
        <div className="flex gap-2">
          <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Button type="link" icon={<Settings className="w-4 h-4" />} onClick={() => handleManageProblems(record)}>
            管理题目
          </Button>
          <Popconfirm title="确定要删除这个比赛吗？" onConfirm={() => handleDelete(record.id)}>
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>比赛列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有比赛</p>
        </div>
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
          新建比赛
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <Input.Search
          placeholder="搜索比赛..."
          allowClear
          className="w-72"
          onSearch={(value) => {
            setKeyword(value);
            setCurrentPage(1);
          }}
        />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadCompetitions}>
          刷新
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={competitions}
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

      {/* 新建/编辑比赛 Modal */}
      <Modal
        title={editingCompetition ? '编辑比赛' : '新建比赛'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="title" label="比赛标题" rules={[{ required: true, message: '请输入比赛标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="比赛描述">
            <Input.TextArea rows={4} />
          </Form.Item>
          <Form.Item name="beginTime" label="开始时间" rules={[{ required: true, message: '请选择开始时间' }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" className="w-full" />
          </Form.Item>
          <Form.Item name="endTime" label="结束时间" rules={[{ required: true, message: '请选择结束时间' }]}>
            <DatePicker showTime format="YYYY-MM-DD HH:mm:ss" className="w-full" />
          </Form.Item>
          <Form.Item name="needPassword" label="是否需要密码" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(prev, cur) => prev.needPassword !== cur.needPassword}>
            {({ getFieldValue }) =>
              getFieldValue('needPassword') ? (
                <Form.Item name="password" label="比赛密码" rules={[{ required: true, message: '请输入比赛密码' }]}>
                  <Input.Password placeholder="请输入比赛密码" />
                </Form.Item>
              ) : null
            }
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

      {/* 管理比赛题目 Modal */}
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
          dataSource={competitionProblems}
          loading={loading}
          locale={{ emptyText: <Empty description="暂无题目" /> }}
          renderItem={(problem) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="确定要从比赛中删除这个题目吗？"
                  onConfirm={() => handleDeleteProblemFromCompetition(problem.id)}
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

      {/* 添加题目到比赛 Modal */}
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

export default AdminCompetitions;
