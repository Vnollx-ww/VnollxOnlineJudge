import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import { adminCompetitionApi } from '@/lib';
import type { ApiResponse } from '@/types';

export interface Competition {
  id: number;
  title: string;
  description?: string;
  beginTime: string;
  endTime: string;
  password?: string;
  needPassword?: boolean;
  number?: number;
  antiCheatMode?: 'NORMAL' | 'STRICT' | string;
  participantType?: 'INDIVIDUAL' | 'TEAM' | string;
}

export interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

export interface CompetitionFormValues {
  title: string;
  description: string;
  beginTime: string;
  endTime: string;
  password: string;
  needPassword: boolean;
  antiCheatMode: string;
  participantType: string;
}

export interface TeamFormValues {
  teamName: string;
  leaderName: string;
  phone: string;
  email: string;
  school: string;
  member2Name: string;
  member3Name: string;
  femaleTeam: boolean;
}

export interface CompetitionTeam {
  id: number;
  teamName: string;
  leaderName: string;
  phone: string;
  email: string;
  school?: string;
  femaleTeam?: boolean;
  members?: { realName: string }[];
}

export const defaultCompetitionForm: CompetitionFormValues = {
  title: '',
  description: '',
  beginTime: '',
  endTime: '',
  password: '',
  needPassword: false,
  antiCheatMode: 'NORMAL',
  participantType: 'INDIVIDUAL',
};

export const defaultTeamForm: TeamFormValues = {
  teamName: '',
  leaderName: '',
  phone: '',
  email: '',
  school: '',
  member2Name: '',
  member3Name: '',
  femaleTeam: false,
};

export type AdminCompetitionsConfirmAction = 'deleteCompetition' | 'deleteTeam' | 'deleteProblemFromCompetition';

export const useAdminCompetitions = () => {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);
  const [competitionForm, setCompetitionForm] = useState<CompetitionFormValues>(defaultCompetitionForm);

  const [problemManageVisible, setProblemManageVisible] = useState(false);
  const [currentCompetitionId, setCurrentCompetitionId] = useState<number | null>(null);
  const [competitionProblems, setCompetitionProblems] = useState<Problem[]>([]);
  const [allProblems, setAllProblems] = useState<Problem[]>([]);
  const [selectedProblems, setSelectedProblems] = useState<number[]>([]);
  const [addProblemModalVisible, setAddProblemModalVisible] = useState(false);
  const [problemSearchKeyword, setProblemSearchKeyword] = useState('');

  const [antiCheatOpen, setAntiCheatOpen] = useState(false);
  const [antiCheatTarget, setAntiCheatTarget] = useState<Competition | null>(null);
  const [teamImportVisible, setTeamImportVisible] = useState(false);
  const [teamImportCompetition, setTeamImportCompetition] = useState<Competition | null>(null);
  const [teamForm, setTeamForm] = useState<TeamFormValues>(defaultTeamForm);
  const [teamExcelFile, setTeamExcelFile] = useState<File | null>(null);
  const [competitionTeams, setCompetitionTeams] = useState<CompetitionTeam[]>([]);
  const [teamListLoading, setTeamListLoading] = useState(false);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<AdminCompetitionsConfirmAction | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');

  const loadCompetitions = async () => {
    setLoading(true);
    try {
      const data = (await adminCompetitionApi.list<Competition[]>({
        pageNum: currentPage.toString(),
        pageSize: pageSize.toString(),
        keyword: keyword || undefined,
      })) as ApiResponse<Competition[]>;
      if (data.code === 200) setCompetitions(data.data || []);
      const countData = (await adminCompetitionApi.count({ keyword: keyword || undefined })) as ApiResponse<number>;
      if (countData.code === 200) setTotal(countData.data || 0);
    } catch (error: any) {
      if (error.response?.status !== 401) toast.error('加载比赛列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompetitions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, pageSize, keyword]);

  const handleAdd = () => {
    setEditingCompetition(null);
    setCompetitionForm(defaultCompetitionForm);
    setModalVisible(true);
  };

  const handleEdit = (competition: Competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      title: competition.title,
      description: competition.description || '',
      beginTime: competition.beginTime ? dayjs(competition.beginTime).format('YYYY-MM-DDTHH:mm') : '',
      endTime: competition.endTime ? dayjs(competition.endTime).format('YYYY-MM-DDTHH:mm') : '',
      password: competition.password || '',
      needPassword: competition.needPassword || false,
      antiCheatMode: competition.antiCheatMode || 'NORMAL',
      participantType: competition.participantType || 'INDIVIDUAL',
    });
    setModalVisible(true);
  };

  const handleDelete = async (id: number) => {
    try {
      const data = (await adminCompetitionApi.delete(id)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除比赛成功');
        setCompetitions((current) => current.filter((competition) => competition.id !== id));
        setTotal((current) => Math.max(0, current - 1));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除比赛失败');
    }
  };

  const loadCompetitionProblems = async (cid: number) => {
    try {
      const data = (await adminCompetitionApi.problems<Problem[]>(cid)) as ApiResponse<Problem[]>;
      if (data.code === 200) setCompetitionProblems(data.data || []);
    } catch {
      toast.error('加载比赛题目失败');
    }
  };

  const loadAllProblems = async () => {
    try {
      const data = (await adminCompetitionApi.allProblems<Problem[]>()) as ApiResponse<Problem[]>;
      if (data.code === 200) setAllProblems(data.data || []);
    } catch {
      toast.error('加载题目列表失败');
    }
  };

  const handleManageProblems = async (competition: Competition) => {
    setCurrentCompetitionId(competition.id);
    setProblemManageVisible(true);
    await loadCompetitionProblems(competition.id);
    await loadAllProblems();
  };

  const handleBatchAddProblems = async () => {
    if (selectedProblems.length === 0) { toast('请至少选择一个题目'); return; }
    try {
      const data = (await adminCompetitionApi.addProblems<Problem[]>(currentCompetitionId!, selectedProblems.map((p) => p.toString()))) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        toast.success('批量添加题目成功');
        setAddProblemModalVisible(false);
        setSelectedProblems([]);
        setCompetitionProblems(data.data || []);
      } else {
        toast.error((data as any).msg || '添加失败');
      }
    } catch {
      toast.error('添加题目失败');
    }
  };

  const handleDeleteProblemFromCompetition = async (pid: number) => {
    try {
      const data = (await adminCompetitionApi.deleteProblem<Problem[]>(currentCompetitionId!, pid)) as ApiResponse<Problem[]>;
      if (data.code === 200) {
        toast.success('删除题目成功');
        setCompetitionProblems(data.data || competitionProblems.filter((problem) => problem.id !== pid));
      } else {
        toast.error((data as any).msg || '删除失败');
      }
    } catch {
      toast.error('删除题目失败');
    }
  };

  const handleMoveCompetitionProblem = async (index: number, direction: 'up' | 'down') => {
    if (currentCompetitionId == null) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= competitionProblems.length) return;
    const nextProblems = [...competitionProblems];
    [nextProblems[index], nextProblems[targetIndex]] = [nextProblems[targetIndex], nextProblems[index]];
    setCompetitionProblems(nextProblems);
    try {
      const data = (await adminCompetitionApi.updateProblemOrder(currentCompetitionId!, nextProblems.map((problem) => problem.id))) as ApiResponse;
      if (data.code === 200) toast.success('题目顺序已更新');
      else {
        toast.error((data as any).msg || '更新题目顺序失败');
        loadCompetitionProblems(currentCompetitionId);
      }
    } catch {
      toast.error('更新题目顺序失败');
      loadCompetitionProblems(currentCompetitionId);
    }
  };

  const updateCompetitionForm = <K extends keyof CompetitionFormValues>(key: K, value: CompetitionFormValues[K]) => {
    setCompetitionForm((current) => ({ ...current, [key]: value }));
  };

  const formatDateTimeForSubmit = (value: string) => (value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '');

  const handleSubmit = async (values: CompetitionFormValues) => {
    try {
      const submitData = {
        title: values.title,
        description: values.description || '',
        beginTime: formatDateTimeForSubmit(values.beginTime),
        endTime: formatDateTimeForSubmit(values.endTime),
        password: values.needPassword ? values.password || '' : '',
        needPassword: values.needPassword || false,
        antiCheatMode: values.antiCheatMode || 'NORMAL',
        participantType: values.participantType || 'INDIVIDUAL',
        ...(editingCompetition ? { id: editingCompetition.id } : {}),
      };
      const data = (await (editingCompetition
        ? adminCompetitionApi.update<Competition>(submitData)
        : adminCompetitionApi.create<Competition>(submitData))) as ApiResponse<Competition>;
      if (data.code === 200) {
        toast.success(editingCompetition ? '更新比赛成功' : '创建比赛成功');
        setModalVisible(false);
        if (data.data) {
          if (editingCompetition) {
            setCompetitions((current) => current.map((competition) => (competition.id === data.data!.id ? data.data! : competition)));
          } else {
            setCompetitions((current) => [data.data!, ...current].slice(0, pageSize));
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

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    return new Date(timeStr).toLocaleString('zh-CN');
  };

  const handleOpenTeamImport = (competition: Competition) => {
    setTeamImportCompetition(competition);
    setTeamForm(defaultTeamForm);
    setTeamExcelFile(null);
    setTeamImportVisible(true);
    loadCompetitionTeams(competition.id);
  };

  const loadCompetitionTeams = async (cid: number) => {
    setTeamListLoading(true);
    try {
      const data = (await adminCompetitionApi.teams<CompetitionTeam[]>(cid)) as ApiResponse<CompetitionTeam[]>;
      if (data.code === 200) setCompetitionTeams(data.data || []);
      else toast.error((data as any).msg || '加载队伍列表失败');
    } catch {
      toast.error('加载队伍列表失败');
    } finally {
      setTeamListLoading(false);
    }
  };

  const updateTeamForm = <K extends keyof TeamFormValues>(key: K, value: TeamFormValues[K]) => {
    setTeamForm((current) => ({ ...current, [key]: value }));
  };

  const handleSaveTeam = async () => {
    if (!teamImportCompetition) return;
    if (!teamForm.teamName.trim() || !teamForm.leaderName.trim() || !teamForm.phone.trim() || !teamForm.email.trim()) {
      toast.error('请填写队名、队员1姓名、手机号和 Email');
      return;
    }
    try {
      const data = (await adminCompetitionApi.saveTeam(teamImportCompetition.id, {
        ...teamForm,
        teamName: teamForm.teamName.trim(),
        leaderName: teamForm.leaderName.trim(),
        phone: teamForm.phone.trim(),
        email: teamForm.email.trim(),
        school: teamForm.school.trim(),
        member2Name: teamForm.member2Name.trim(),
        member3Name: teamForm.member3Name.trim(),
      })) as ApiResponse<CompetitionTeam[]>;
      if (data.code === 200) {
        toast.success('保存队伍成功，可继续添加下一个队伍');
        setTeamForm(defaultTeamForm);
        setCompetitionTeams(data.data || []);
      } else {
        toast.error((data as any).msg || '保存队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '保存队伍失败');
    }
  };

  const handleImportTeamsExcel = async () => {
    if (!teamImportCompetition) return;
    if (!teamExcelFile) { toast.error('请选择 .xlsx 文件'); return; }
    try {
      const formData = new FormData();
      formData.append('file', teamExcelFile);
      const data = (await adminCompetitionApi.importTeams<CompetitionTeam[]>(teamImportCompetition.id, formData)) as ApiResponse<CompetitionTeam[]>;
      if (data.code === 200) {
        toast.success('导入队伍成功');
        setTeamExcelFile(null);
        setCompetitionTeams(data.data || []);
      } else {
        toast.error((data as any).msg || '导入队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || 'Excel 导入失败');
    }
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!teamImportCompetition) return;
    try {
      const data = (await adminCompetitionApi.deleteTeam(teamId)) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除队伍成功');
        setCompetitionTeams((current) => current.filter((team) => team.id !== teamId));
      } else {
        toast.error((data as any).msg || '删除队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除队伍失败');
    }
  };

  const openConfirm = (action: AdminCompetitionsConfirmAction, id: number, name: string) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmTargetId === null) return;
    if (confirmAction === 'deleteCompetition') handleDelete(confirmTargetId);
    else if (confirmAction === 'deleteTeam') handleDeleteTeam(confirmTargetId);
    else if (confirmAction === 'deleteProblemFromCompetition') handleDeleteProblemFromCompetition(confirmTargetId);
    setConfirmModalVisible(false);
  };

  const filteredProblems = allProblems.filter((p) => {
    if (!problemSearchKeyword) return true;
    const kw = problemSearchKeyword.toLowerCase();
    return p.id.toString().includes(kw) || p.title.toLowerCase().includes(kw);
  });

  const addedProblemIds = new Set(competitionProblems.map((p) => p.id.toString()));
  const availableProblems = filteredProblems.filter((p) => !addedProblemIds.has(p.id.toString()));

  return {
    competitions,
    loading,
    total,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    setKeyword,
    modalVisible,
    setModalVisible,
    editingCompetition,
    competitionForm,
    problemManageVisible,
    setProblemManageVisible,
    currentCompetitionId,
    setCurrentCompetitionId,
    competitionProblems,
    setCompetitionProblems,
    selectedProblems,
    setSelectedProblems,
    addProblemModalVisible,
    setAddProblemModalVisible,
    problemSearchKeyword,
    setProblemSearchKeyword,
    antiCheatOpen,
    setAntiCheatOpen,
    antiCheatTarget,
    setAntiCheatTarget,
    teamImportVisible,
    setTeamImportVisible,
    teamImportCompetition,
    setTeamImportCompetition,
    teamForm,
    setTeamForm,
    teamExcelFile,
    setTeamExcelFile,
    competitionTeams,
    teamListLoading,
    confirmModalVisible,
    setConfirmModalVisible,
    confirmAction,
    confirmTargetName,
    loadCompetitions,
    loadCompetitionTeams,
    handleAdd,
    handleEdit,
    handleManageProblems,
    handleBatchAddProblems,
    handleMoveCompetitionProblem,
    updateCompetitionForm,
    handleSubmit,
    formatTime,
    handleOpenTeamImport,
    updateTeamForm,
    handleSaveTeam,
    handleImportTeamsExcel,
    openConfirm,
    handleConfirm,
    availableProblems,
  };
};
