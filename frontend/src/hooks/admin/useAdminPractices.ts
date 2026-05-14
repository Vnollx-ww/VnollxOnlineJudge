import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { adminPracticeApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface Practice {
  id: number;
  title: string;
  description?: string;
  problemCount: number;
  createTime: string;
  isPublic: boolean;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

export interface PracticeFormValues {
  title: string;
  description: string;
  isPublic: boolean;
}

export const defaultPracticeForm: PracticeFormValues = { title: '', description: '', isPublic: true };

export type AdminPracticeConfirmAction = 'deletePractice' | 'deleteProblemFromPractice';

export const useAdminPractices = () => {
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [practiceForm, setPracticeForm] = useState<PracticeFormValues>(defaultPracticeForm);

  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentPracticeId, setCurrentPracticeId] = useState<number | null>(null);
  const [practiceProblems, setPracticeProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AdminPracticeConfirmAction | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');

  const loadPractices = async () => {
    setLoading(true);
    try {
      const data = (await adminPracticeApi.list<Practice[]>({
        pageNum: currentPage.toString(),
        pageSize: pageSize.toString(),
        keyword: keyword || undefined,
      })) as ApiResponse<Practice[]>;
      if (data.code === 200) setPractices(data.data || []);
      const countData = (await adminPracticeApi.count({ keyword: keyword || undefined })) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error: any) {
      if (error.response?.status !== 401) toast.error('加载练习列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPractices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, keyword]);

  const handleAdd = () => {
    setEditingPractice(null);
    setPracticeForm(defaultPracticeForm);
    setModalVisible(true);
  };

  const handleEdit = (practice: Practice) => {
    setEditingPractice(practice);
    setPracticeForm({
      title: practice.title,
      description: practice.description || '',
      isPublic: practice.isPublic,
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = (await adminPracticeApi.delete(id)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除练习成功');
        setPractices((current) => current.filter((practice) => practice.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除练习失败');
    }
  };

  const loadPracticeProblems = async (practiceId: number) => {
    try {
      const data = (await adminPracticeApi.practiceProblems<Problem[]>(practiceId)) as ApiResponse<Problem[]>;
      if (data.code === 200) setPracticeProblems(data.data || []);
    } catch {
      toast.error('加载练习题目失败');
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = (await adminPracticeApi.allProblems<Problem[]>()) as ApiResponse<Problem[]>;
      if (data.code === 200) setAllProblems(data.data || []);
    } catch {
      toast.error('加载题目列表失败');
    }
  };

  const handleManageProblems = async (practice: Practice) => {
    setCurrentPracticeId(practice.id);
    setProblemManageVisible(true);
    await loadPracticeProblems(practice.id);
    await loadAllProblems();
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) {
      toast('请至少选择一个题目', { icon: '⚠️' });
      return;
    }
    try {
      const data = (await adminPracticeApi.addProblems<Problem[]>(currentPracticeId!, selectedProblems.map((p) => p.toString()))) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        toast.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        setPracticeProblems(data.data || []);
        setPractices((current) => current.map((practice) => (
          practice.id === currentPracticeId ? { ...practice, problemCount: (data.data || []).length } : practice
        )));
      } else {
        toast.error((data as any).msg || '添加失败');
      }
    } catch {
      toast.error('添加题目失败');
    }
  };

  const handleDeleteProblemFromPractice = async (problemId: number) => {
    try {
      const data = (await adminPracticeApi.deleteProblem<Problem[]>(currentPracticeId!, problemId)) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        toast.success('删除题目成功');
        const nextProblems = data.data || practiceProblems.filter((problem) => problem.id !== problemId);
        setPracticeProblems(nextProblems);
        setPractices((current) => current.map((practice) => (
          practice.id === currentPracticeId ? { ...practice, problemCount: nextProblems.length } : practice
        )));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除题目失败');
    }
  };

  const updatePracticeForm = <K extends keyof PracticeFormValues>(key: K, value: PracticeFormValues[K]) => {
    setPracticeForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (values: PracticeFormValues) => {
    try {
      const submitData = {
        title: values.title,
        description: values.description || '',
        isPublic: values.isPublic,
        ...(editingPractice ? { id: editingPractice.id } : {}),
      };
      const data = (await (editingPractice
        ? adminPracticeApi.update<Practice>(submitData)
        : adminPracticeApi.create<Practice>(submitData))) as ApiResponse<Practice>;
      if (data.code === 200) {
        toast.success(editingPractice ? '更新练习成功' : '创建练习成功');
        setModalVisible(false);
        if (data.data) {
          if (editingPractice) {
            setPractices((current) => current.map((practice) => (practice.id === data.data!.id ? data.data! : practice)));
          } else {
            setPractices((current) => [data.data!, ...current].slice(0, pageSize));
            setTotal((current) => current + 1);
          }
        }
      } else {
        toast.error((data as any).msg || '操作失败');
      }
    } catch {
      toast.error('操作失败');
    }
  };

  const openConfirm = (action: AdminPracticeConfirmAction, id: number, name: string) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmAction === 'deletePractice' && confirmTargetId !== null) handleDelete(confirmTargetId);
    else if (confirmAction === 'deleteProblemFromPractice' && confirmTargetId !== null) handleDeleteProblemFromPractice(confirmTargetId);
    setConfirmModalVisible(false);
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const filteredProblems = allProblems.filter((p) => {
    if (!problemSearchKeyword) return true;
    const kw = problemSearchKeyword.toLowerCase();
    return p.id.toString().includes(kw) || p.title.toLowerCase().includes(kw);
  });

  const addedProblemIds = new Set(practiceProblems.map((p) => p.id.toString()));
  const availableProblems = filteredProblems.filter((p) => !addedProblemIds.has(p.id.toString()));

  return {
    practices,
    loading,
    total,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setKeyword,
    modalVisible,
    setModalVisible,
    editingPractice,
    practiceForm,
    problemManageVisible,
    setProblemManageVisible,
    setCurrentPracticeId,
    practiceProblems,
    setPracticeProblems,
    selectedProblems,
    setSelectedProblems,
    addProblemModalVisible,
    setAddProblemModalVisible,
    problemSearchKeyword,
    setProblemSearchKeyword,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmAction,
    confirmTargetName,
    loadPractices,
    handleAdd,
    handleEdit,
    handleManageProblems,
    handleBatchAddProblems,
    updatePracticeForm,
    handleSubmit,
    openConfirm,
    handleConfirm,
    formatTime,
    availableProblems,
  };
};
