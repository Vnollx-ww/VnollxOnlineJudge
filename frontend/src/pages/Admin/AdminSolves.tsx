import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Popconfirm } from 'antd';
import toast from 'react-hot-toast';
import { RefreshCw, Check, X, Trash2 } from 'lucide-react';
import api from '@/utils/api';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface Solve {
  id: number;
  pid: number;
  name: string;
  title: string;
  status: number;
}

const AdminSolves: React.FC = () => {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<number | null>(null);

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
      }) as ApiResponse<Solve[]>;
      if (data.code === 200) {
        setSolves(data.data || []);
      }
    } catch (error: any) {
      if (error.response?.status !== 401) {
        toast.error('加载题解列表失败');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const data = await api.delete(`/admin/solve/${id}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除题解成功');
        loadSolves();
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除题解失败');
    }
  };

  const handleAudit = async (id: number, status: number) => {
    try {
      const data = await api.put(`/admin/solve/${id}/status`, null, {
        params: { status },
      }) as ApiResponse;
      if (data.code === 200) {
        toast.success((data as any).msg || '审核成功');
        loadSolves();
      } else {
        toast.error((data as any).msg || '审核失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '审核失败');
    }
  };

  const getStatusTag = (status: number) => {
    const config: Record<number, { text: string; color: string }> = {
      0: { text: '未审核', color: 'default' },
      1: { text: '审核通过', color: 'success' },
      2: { text: '审核不通过', color: 'error' },
    };
    const item = config[status] || { text: '未知', color: 'default' };
    return <Tag color={item.color}>{item.text}</Tag>;
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '题目ID', dataIndex: 'pid', key: 'pid', width: 100 },
    { title: '作者', dataIndex: 'name', key: 'name' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '状态', dataIndex: 'status', key: 'status', width: 120, render: (s: number) => getStatusTag(s) },
    {
      title: '操作',
      key: 'action',
      width: 250,
      render: (_: unknown, record: Solve) => (
        <div className="flex gap-2">
          <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
            <Popconfirm title="确认审核通过该题解？" onConfirm={() => handleAudit(record.id, 1)}>
              <Button type="primary" size="small" icon={<Check className="w-3 h-3" />} disabled={record.status === 1}>
                通过
              </Button>
            </Popconfirm>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.SOLVE_AUDIT}>
            <Popconfirm title="确认审核不通过该题解？" onConfirm={() => handleAudit(record.id, 2)}>
              <Button danger size="small" icon={<X className="w-3 h-3" />} disabled={record.status === 2}>
                不通过
              </Button>
            </Popconfirm>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.SOLVE_DELETE}>
            <Popconfirm title="确定要删除这个题解吗？" onConfirm={() => handleDelete(record.id)}>
              <Button type="link" danger size="small" icon={<Trash2 className="w-3 h-3" />}>
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
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>题解列表</h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理系统中的所有题解</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-3">
          <Input.Search
            placeholder="搜索题解..."
            allowClear
            className="w-72"
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(0);
            }}
          />
          <Select
            placeholder="筛选审核状态"
            className="w-40"
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
        </div>
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadSolves}>
          刷新
        </Button>
      </div>

      {/* Table */}
      <Table
        columns={columns}
        dataSource={solves}
        loading={loading}
        rowKey="id"
        pagination={{
          current: currentPage + 1,
          pageSize,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条记录`,
          onChange: (page, size) => {
            setCurrentPage(page - 1);
            setPageSize(size);
          },
        }}
      />
    </div>
  );
};

export default AdminSolves;
