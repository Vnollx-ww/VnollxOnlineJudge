import { useState, useEffect } from 'react';
import { Table, Button, Input, Modal, Form, Select, Tag, Popconfirm, Checkbox, List, Empty, Badge, Card, Divider } from 'antd';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Users, X, ArrowRight, ArrowLeft, Search, UserPlus, UserMinus } from 'lucide-react';
import api from '@/utils/api';
import PermissionGuard from '@/components/PermissionGuard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';

interface StudentClass {
  id: number;
  className: string;
  teacherId: number;
  teacherName?: string;
  createTime: string;
  studentCount: number;
}

interface Teacher {
  id: number;
  name: string;
  email?: string;
}

interface Student {
  id: number;
  name: string;
  email: string;
  identity: string;
  classId?: number;
  className?: string;
}

const AdminStudentClasses: React.FC = () => {
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingClass, setEditingClass] = useState<StudentClass | null>(null);
  const [form] = Form.useForm();

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(false);

  const [manageStudentsVisible, setManageStudentsVisible] = useState(false);
  const [currentClassId, setCurrentClassId] = useState<number | null>(null);
  const [currentClassName, setCurrentClassName] = useState<string>('');
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [assignableStudents, setAssignableStudents] = useState<Student[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearchKeyword, setStudentSearchKeyword] = useState('');

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    setLoading(true);
    try {
      const data = (await api.get('/admin/student-class/list')) as ApiResponse<StudentClass[]>;
      if (data.code === 200) {
        setClasses(data.data || []);
      }
    } catch {
      toast.error('加载班级列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTeachers = async () => {
    if (teachers.length > 0) return;
    setTeachersLoading(true);
    try {
      const data = (await api.get('/admin/student-class/teachers')) as ApiResponse<Teacher[]>;
      if (data.code === 200) {
        setTeachers(data.data || []);
      }
    } catch {
      toast.error('加载教师列表失败');
    } finally {
      setTeachersLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingClass(null);
    form.resetFields();
    loadTeachers();
    setModalVisible(true);
  };

  const handleEdit = (cls: StudentClass) => {
    setEditingClass(cls);
    form.setFieldsValue({
      className: cls.className,
      teacherId: cls.teacherId,
    });
    loadTeachers();
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = (await api.delete(`/admin/student-class/delete/${id}`)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除班级成功');
        loadClasses();
      } else {
        toast.error((data as any).message || '删除失败');
      }
    } catch {
      toast.error('删除班级失败');
    }
  };

  const handleManageStudents = async (cls: StudentClass) => {
    setCurrentClassId(cls.id);
    setCurrentClassName(cls.className);
    setManageStudentsVisible(true);
    setSelectedStudentIds([]);
    setStudentSearchKeyword('');
    await loadClassStudents(cls.id);
    await loadAssignableStudents();
  };

  const loadClassStudents = async (classId: number) => {
    try {
      const data = (await api.get(`/admin/student-class/${classId}/students`)) as ApiResponse<Student[]>;
      if (data.code === 200) {
        setClassStudents(data.data || []);
      }
    } catch {
      toast.error('加载班级学生失败');
    }
  };

  const loadAssignableStudents = async () => {
    try {
      const data = (await api.get('/admin/student-class/students/assignable')) as ApiResponse<Student[]>;
      if (data.code === 200) {
        setAssignableStudents(data.data || []);
      }
    } catch {
      toast.error('加载可分配学生失败');
    }
  };

  const handleAssignStudents = async () => {
    if (selectedStudentIds.length === 0) {
      toast('请至少选择一个学生', { icon: '⚠️' });
      return;
    }
    try {
      const data = (await api.post(`/admin/student-class/${currentClassId}/students`, {
        studentIds: selectedStudentIds,
      })) as ApiResponse;
      if (data.code === 200) {
        toast.success('分配学生成功');
        setSelectedStudentIds([]);
        await loadClassStudents(currentClassId!);
        await loadAssignableStudents();
        loadClasses();
      } else {
        toast.error((data as any).message || '分配失败');
      }
    } catch {
      toast.error('分配学生失败');
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    try {
      const data = (await api.delete(`/admin/student-class/${currentClassId}/students/${studentId}`)) as ApiResponse;
      if (data.code === 200) {
        toast.success('移出学生成功');
        await loadClassStudents(currentClassId!);
        await loadAssignableStudents();
        loadClasses();
      } else {
        toast.error((data as any).message || '移出失败');
      }
    } catch {
      toast.error('移出学生失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      const payload = {
        className: values.className,
        teacherId: values.teacherId,
        ...(editingClass ? { id: editingClass.id } : {}),
      };
      const url = editingClass ? '/admin/student-class/update' : '/admin/student-class/create';
      const method = editingClass ? 'put' : 'post';
      const data = (await (api as any)[method](url, payload)) as ApiResponse;
      if (data.code === 200) {
        toast.success(editingClass ? '更新班级成功' : '创建班级成功');
        setModalVisible(false);
        loadClasses();
      } else {
        toast.error((data as any).message || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  // 获取当前班级学生的ID集合
  const classStudentIds = new Set(classStudents.map((s) => s.id));
  
  // 过滤：排除已在当前班级的学生，并支持搜索
  const filteredAssignable = assignableStudents.filter((s) => {
    // 排除已在当前班级的学生
    if (classStudentIds.has(s.id)) return false;
    // 搜索过滤
    if (!studentSearchKeyword) return true;
    const kw = studentSearchKeyword.toLowerCase();
    return s.name.toLowerCase().includes(kw) || s.email.toLowerCase().includes(kw);
  });

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: '班级名称', dataIndex: 'className', key: 'className' },
    { title: '教师', dataIndex: 'teacherName', key: 'teacherName', render: (v?: string) => v || '-' },
    {
      title: '学生数',
      dataIndex: 'studentCount',
      key: 'studentCount',
      width: 100,
      render: (count: number) => <Tag color="blue">{count}</Tag>,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (t?: string) => (t ? t.replace('T', ' ') : '-'),
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      render: (_: unknown, record: StudentClass) => (
        <div className="flex gap-2">
          <PermissionGuard permission={PermissionCode.CLASS_UPDATE}>
            <Button type="link" icon={<Edit className="w-4 h-4" />} onClick={() => handleEdit(record)}>
              编辑
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.CLASS_UPDATE}>
            <Button type="link" icon={<Users className="w-4 h-4" />} onClick={() => handleManageStudents(record)}>
              管理学生
            </Button>
          </PermissionGuard>
          <PermissionGuard permission={PermissionCode.CLASS_DELETE}>
            <Popconfirm title="确定要删除这个班级吗？" onConfirm={() => handleDelete(record.id)}>
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
            班级管理
          </h2>
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>管理班级与学生归属</p>
        </div>
        <PermissionGuard permission={PermissionCode.CLASS_CREATE}>
          <Button
            type="primary"
            icon={<Plus className="w-4 h-4" />}
            onClick={handleAdd}
            style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
          >
            新建班级
          </Button>
        </PermissionGuard>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div />
        <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadClasses}>
          刷新
        </Button>
      </div>

      <Table columns={columns} dataSource={classes} loading={loading} rowKey="id" pagination={{ showSizeChanger: true }} />

      <Modal
        title={editingClass ? '编辑班级' : '新建班级'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="className" label="班级名称" rules={[{ required: true, message: '请输入班级名称' }]}>
            <Input placeholder="例如：2024级软件工程1班" />
          </Form.Item>
          <Form.Item name="teacherId" label="任课教师" rules={[{ required: true, message: '请选择教师' }]}>
            <Select
              placeholder="选择教师"
              loading={teachersLoading}
              options={teachers.map((t) => ({ label: `${t.name} (#${t.id})`, value: t.id }))}
              showSearch
              filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase())}
            />
          </Form.Item>
          <Form.Item>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button
                type="primary"
                htmlType="submit"
                style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)', border: 'none' }}
              >
                保存
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--gemini-accent)' }} />
            <span>管理学生 - {currentClassName}</span>
            <Badge count={classStudents.length} showZero color="var(--gemini-accent)" />
          </div>
        }
        open={manageStudentsVisible}
        onCancel={() => {
          setManageStudentsVisible(false);
          setCurrentClassId(null);
          setCurrentClassName('');
          setClassStudents([]);
          setAssignableStudents([]);
          setSelectedStudentIds([]);
          setStudentSearchKeyword('');
        }}
        footer={null}
        width={900}
        bodyStyle={{ padding: '16px 24px' }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] gap-4" style={{ minHeight: 480 }}>
          {/* 左侧：当前班级学生 */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'var(--gemini-accent)' }} />
                  <span className="font-medium">班级成员</span>
                  <Tag color="blue">{classStudents.length}</Tag>
                </div>
              </div>
            }
            size="small"
            className="h-full"
            bodyStyle={{ padding: 0, height: 'calc(100% - 40px)' }}
          >
            <div style={{ height: '100%', overflow: 'auto', padding: 8 }}>
              {classStudents.length === 0 ? (
                <Empty description="暂无学生" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                <List
                  dataSource={classStudents}
                  renderItem={(s) => (
                    <List.Item
                      className="hover:bg-gray-50 rounded-lg transition-colors mb-1"
                      style={{ padding: '8px 12px' }}
                      actions={[
                        <Button
                          key="remove"
                          type="text"
                          danger
                          size="small"
                          icon={<UserMinus className="w-4 h-4" />}
                          onClick={() => handleRemoveStudent(s.id)}
                          title="移出班级"
                        />,
                      ]}
                    >
                      <List.Item.Meta
                        avatar={
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                            style={{ background: 'var(--gemini-accent)', color: 'white' }}
                          >
                            {s.name.charAt(0)}
                          </div>
                        }
                        title={<span className="font-medium">{s.name}</span>}
                        description={<span className="text-xs text-gray-400">{s.email}</span>}
                      />
                    </List.Item>
                  )}
                />
              )}
            </div>
          </Card>

          {/* 中间：操作提示 */}
          <div className="flex flex-col items-center justify-center gap-3 px-2">
            <div className="flex flex-col items-center gap-1">
              <ArrowLeft className="w-5 h-5 text-gray-300" />
              <span className="text-xs text-gray-400">移出</span>
            </div>
            <Divider type="vertical" style={{ height: 40 }} />
            <div className="flex flex-col items-center gap-1">
              <ArrowRight className="w-5 h-5 text-gray-300" />
              <span className="text-xs text-gray-400">加入</span>
            </div>
          </div>

          {/* 右侧：可分配学生 */}
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4" style={{ color: 'var(--gemini-accent)' }} />
                  <span className="font-medium">可选学生</span>
                  <Tag color="green">{filteredAssignable.length}</Tag>
                </div>
                {selectedStudentIds.length > 0 && (
                  <Tag color="orange">已选 {selectedStudentIds.length}</Tag>
                )}
              </div>
            }
            size="small"
            className="h-full"
            bodyStyle={{ padding: 0, height: 'calc(100% - 40px)' }}
            extra={
              <Button
                type="primary"
                size="small"
                disabled={selectedStudentIds.length === 0}
                onClick={handleAssignStudents}
                icon={<UserPlus className="w-4 h-4" />}
                style={{ backgroundColor: 'var(--gemini-accent)' }}
              >
                加入 ({selectedStudentIds.length})
              </Button>
            }
          >
            <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--gemini-border-light)' }}>
                <Input.Search
                  placeholder="搜索姓名或邮箱..."
                  allowClear
                  value={studentSearchKeyword}
                  onChange={(e) => setStudentSearchKeyword(e.target.value)}
                  size="small"
                />
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
                {filteredAssignable.length === 0 ? (
                  <Empty
                    description={studentSearchKeyword ? '无匹配学生' : '暂无可分配学生'}
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                ) : (
                  <Checkbox.Group
                    value={selectedStudentIds}
                    onChange={(values) => setSelectedStudentIds(values as number[])}
                    className="w-full"
                  >
                    <List
                      dataSource={filteredAssignable}
                      renderItem={(s) => (
                        <List.Item
                          className="hover:bg-gray-50 rounded-lg transition-colors mb-1 p-2"
                          style={{
                            background: selectedStudentIds.includes(s.id) ? 'rgba(66, 133, 244, 0.08)' : undefined,
                            border: selectedStudentIds.includes(s.id) ? '1px solid var(--gemini-accent)' : '1px solid transparent',
                          }}
                        >
                          <div className="flex items-center gap-3 w-full">
                            <Checkbox value={s.id} />
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                              style={{ background: 'var(--gemini-surface-variant)', color: 'var(--gemini-text-secondary)' }}
                            >
                              {s.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{s.name}</div>
                              <div className="text-xs text-gray-400 truncate">{s.email}</div>
                            </div>
                            {s.classId && s.classId !== currentClassId && (
                              <Tag color="orange" size="small" className="shrink-0">
                                已在{s.className || '其他班'}
                              </Tag>
                            )}
                          </div>
                        </List.Item>
                      )}
                    />
                  </Checkbox.Group>
                )}
              </div>
              {selectedStudentIds.length > 0 && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid var(--gemini-border-light)' }}>
                  <Button
                    type="link"
                    size="small"
                    onClick={() => setSelectedStudentIds([])}
                    style={{ padding: 0 }}
                  >
                    清空选择
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </Modal>
    </div>
  );
};

export default AdminStudentClasses;
