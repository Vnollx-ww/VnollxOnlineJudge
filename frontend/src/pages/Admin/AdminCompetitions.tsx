import { useState, useEffect } from 'react';
import {
  Button,
  Modal,
  DatePicker,
  Switch,
  Checkbox,
  Tag,
  List,
  Empty,
  Field,
  DataTable,
  DataColumn,
} from '@/components';
import toast from 'react-hot-toast';
import { Plus, RefreshCw, Edit, Trash2, Settings, PlusCircle, ArrowUp, ArrowDown, ShieldAlert, Users, Phone, Mail, Building2, Download } from 'lucide-react';
import dayjs from 'dayjs';
import api from '@/utils/api';
import Input from '@/components/input';
import Select from '@/components/select';
import PermissionGuard from '@/components/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import type { ApiResponse } from '@/types';
import AdminCompetitionAntiCheat from './AdminCompetitionAntiCheat';

interface Competition {
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

interface Problem {
  id: number;
  title: string;
  difficulty: string;
}

interface CompetitionFormValues {
  title: string;
  description: string;
  beginTime: string;
  endTime: string;
  password: string;
  needPassword: boolean;
  antiCheatMode: string;
  participantType: string;
}

interface TeamFormValues {
  teamName: string;
  leaderName: string;
  phone: string;
  email: string;
  school: string;
  member2Name: string;
  member3Name: string;
  femaleTeam: boolean;
}

interface CompetitionTeam {
  id: number;
  teamName: string;
  leaderName: string;
  phone: string;
  email: string;
  school?: string;
  femaleTeam?: boolean;
  members?: { realName: string }[];
}

const defaultCompetitionForm: CompetitionFormValues = {
  title: '',
  description: '',
  beginTime: '',
  endTime: '',
  password: '',
  needPassword: false,
  antiCheatMode: 'NORMAL',
  participantType: 'INDIVIDUAL',
};

const defaultTeamForm: TeamFormValues = {
  teamName: '',
  leaderName: '',
  phone: '',
  email: '',
  school: '',
  member2Name: '',
  member3Name: '',
  femaleTeam: false,
};

const crc32Table = (() => {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

const crc32 = (content: Uint8Array) => {
  let crc = 0xffffffff;
  for (const byte of content) {
    crc = crc32Table[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const textEncoder = new TextEncoder();

const writeUint16 = (target: number[], value: number) => {
  target.push(value & 0xff, (value >>> 8) & 0xff);
};

const writeUint32 = (target: number[], value: number) => {
  target.push(value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff);
};

const createZip = (files: { name: string; content: string }[]) => {
  const output: number[] = [];
  const centralDirectory: number[] = [];

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = textEncoder.encode(file.content);
    const checksum = crc32(contentBytes);
    const localHeaderOffset = output.length;

    writeUint32(output, 0x04034b50);
    writeUint16(output, 20);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint16(output, 0);
    writeUint32(output, checksum);
    writeUint32(output, contentBytes.length);
    writeUint32(output, contentBytes.length);
    writeUint16(output, nameBytes.length);
    writeUint16(output, 0);
    output.push(...nameBytes, ...contentBytes);

    writeUint32(centralDirectory, 0x02014b50);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 20);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, checksum);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint32(centralDirectory, contentBytes.length);
    writeUint16(centralDirectory, nameBytes.length);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint16(centralDirectory, 0);
    writeUint32(centralDirectory, 0);
    writeUint32(centralDirectory, localHeaderOffset);
    centralDirectory.push(...nameBytes);
  }

  const centralDirectoryOffset = output.length;
  output.push(...centralDirectory);
  writeUint32(output, 0x06054b50);
  writeUint16(output, 0);
  writeUint16(output, 0);
  writeUint16(output, files.length);
  writeUint16(output, files.length);
  writeUint32(output, centralDirectory.length);
  writeUint32(output, centralDirectoryOffset);
  writeUint16(output, 0);

  return new Blob([new Uint8Array(output)], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
};

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const cell = (column: string, row: number, value: string) =>
  `<c r="${column}${row}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;

const createTeamTemplateBlob = () => {
  const headers = ['序号', '团队名称', '队员1姓名', '手机号', 'Email', '队员2姓名', '队员3姓名', '是否女子组'];
  const example = ['1', '示例队伍', '张三', '13800000000', 'team@example.com', '李四', '王五', '否'];
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const rows = [
    `<row r="1">${cell('A', 1, '重庆市第十四届大学生程序设计大赛选拔赛报名')}</row>`,
    `<row r="2">${cell('A', 2, '说明：真实数据从第 4 行开始；B-E、H 必填；是否女子组填写“是”或“否”。')}</row>`,
    `<row r="3">${headers.map((title, index) => cell(columns[index], 3, title)).join('')}</row>`,
    `<row r="4">${example.map((value, index) => cell(columns[index], 4, value)).join('')}</row>`,
  ].join('');

  const worksheet = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <cols>
    <col min="1" max="1" width="10" customWidth="1"/>
    <col min="2" max="3" width="18" customWidth="1"/>
    <col min="4" max="5" width="24" customWidth="1"/>
    <col min="6" max="8" width="18" customWidth="1"/>
  </cols>
  <sheetData>${rows}</sheetData>
</worksheet>`;

  return createZip([
    { name: '[Content_Types].xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>` },
    { name: '_rels/.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` },
    { name: 'xl/workbook.xml', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="重庆市第十四届大学生程序设计大赛选拔赛报名" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>` },
    { name: 'xl/worksheets/sheet1.xml', content: worksheet },
  ]);
};

const AdminCompetitions: React.FC = () => {
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
  const [confirmAction, setConfirmAction] = useState<'deleteCompetition' | 'deleteTeam' | 'deleteProblemFromCompetition' | null>(null);
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);
  const [confirmTargetName, setConfirmTargetName] = useState<string>('');

  const openConfirm = (action: 'deleteCompetition' | 'deleteTeam' | 'deleteProblemFromCompetition', id: number, name: string) => {
    setConfirmAction(action);
    setConfirmTargetId(id);
    setConfirmTargetName(name);
    setConfirmModalVisible(true);
  };

  const handleConfirm = () => {
    if (confirmTargetId === null) return;
    if (confirmAction === 'deleteCompetition') {
      handleDelete(confirmTargetId);
    } else if (confirmAction === 'deleteTeam') {
      handleDeleteTeam(confirmTargetId);
    } else if (confirmAction === 'deleteProblemFromCompetition') {
      handleDeleteProblemFromCompetition(confirmTargetId);
    }
    setConfirmModalVisible(false);
  };

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

  const handleMoveCompetitionProblem = async (index: number, direction: 'up' | 'down') => {
    if (currentCompetitionId == null) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= competitionProblems.length) return;

    const nextProblems = [...competitionProblems];
    [nextProblems[index], nextProblems[targetIndex]] = [nextProblems[targetIndex], nextProblems[index]];
    setCompetitionProblems(nextProblems);

    try {
      const data = await api.put(`/admin/competition/${currentCompetitionId}/problems/order`, {
        cid: currentCompetitionId,
        problemIds: nextProblems.map((problem) => problem.id),
      }) as ApiResponse;
      if (data.code === 200) {
        toast.success('题目顺序已更新');
      } else {
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

  const formatDateTimeForSubmit = (value: string) => value ? dayjs(value).format('YYYY-MM-DD HH:mm:ss') : '';

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
      const data = await api.get(`/admin/competition/${cid}/teams`) as ApiResponse<CompetitionTeam[]>;
      if (data.code === 200) {
        setCompetitionTeams(data.data || []);
      } else {
        toast.error((data as any).msg || '加载队伍列表失败');
      }
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
      const data = await api.post(`/admin/competition/${teamImportCompetition.id}/teams`, {
        ...teamForm,
        teamName: teamForm.teamName.trim(),
        leaderName: teamForm.leaderName.trim(),
        phone: teamForm.phone.trim(),
        email: teamForm.email.trim(),
        school: teamForm.school.trim(),
        member2Name: teamForm.member2Name.trim(),
        member3Name: teamForm.member3Name.trim(),
      }) as ApiResponse;
      if (data.code === 200) {
        toast.success('保存队伍成功，可继续添加下一个队伍');
        setTeamForm(defaultTeamForm);
        loadCompetitions();
        loadCompetitionTeams(teamImportCompetition.id);
      } else {
        toast.error((data as any).msg || '保存队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '保存队伍失败');
    }
  };

  const handleImportTeamsExcel = async () => {
    if (!teamImportCompetition) return;
    if (!teamExcelFile) {
      toast.error('请选择 .xlsx 文件');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', teamExcelFile);
      const data = await api.post(`/admin/competition/${teamImportCompetition.id}/teams/import/excel`, formData) as ApiResponse;
      if (data.code === 200) {
        toast.success('导入队伍成功');
        setTeamExcelFile(null);
        loadCompetitions();
        loadCompetitionTeams(teamImportCompetition.id);
      } else {
        toast.error((data as any).msg || '导入队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || 'Excel 导入失败');
    }
  };

  const handleDownloadTeamTemplate = () => {
    const blob = createTeamTemplateBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '比赛报名Excel导入模板.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDeleteTeam = async (teamId: number) => {
    if (!teamImportCompetition) return;
    try {
      const data = await api.delete(`/admin/competition/teams/${teamId}`) as ApiResponse;
      if (data.code === 200) {
        toast.success('删除队伍成功');
        loadCompetitionTeams(teamImportCompetition.id);
        loadCompetitions();
      } else {
        toast.error((data as any).msg || '删除队伍失败');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.msg || '删除队伍失败');
    }
  };

  const filteredProblems = allProblems.filter((p) => {
    if (!problemSearchKeyword) return true;
    const kw = problemSearchKeyword.toLowerCase();
    return p.id.toString().includes(kw) || p.title.toLowerCase().includes(kw);
  });

  const addedProblemIds = new Set(competitionProblems.map((p) => p.id.toString()));
  const availableProblems = filteredProblems.filter((p) => !addedProblemIds.has(p.id.toString()));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-gray-900">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 bg-gray-50/50 p-4">
          <Input.Search
            placeholder="搜索比赛..."
            allowClear
            className="w-72"
            onSearch={(value) => {
              setKeyword(value);
              setCurrentPage(1);
            }}
          />
          <div className="flex items-center gap-2">
            <Button icon={<RefreshCw className="w-4 h-4" />} onClick={loadCompetitions}>
              刷新
            </Button>
            <PermissionGuard permission={PermissionCode.COMPETITION_CREATE}>
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
            </PermissionGuard>
          </div>
        </div>

        <DataTable<Competition>
          className="rounded-none border-0 shadow-none"
          rows={competitions}
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
        >
        <DataColumn<Competition> header="ID" width={80} cell={(competition) => competition.id} />
        <DataColumn<Competition> header="标题" cell={(competition) => competition.title} />
        <DataColumn<Competition> header="开始时间" cell={(competition) => formatTime(competition.beginTime)} />
        <DataColumn<Competition> header="结束时间" cell={(competition) => formatTime(competition.endTime)} />
        <DataColumn<Competition> header="参赛模式" width={100} cell={(competition) => competition.participantType === 'TEAM' ? <Tag color="purple">团队赛</Tag> : <Tag color="blue">个人赛</Tag>} />
        <DataColumn<Competition> header="参与人数" width={100} cell={(competition) => competition.number ?? '-'} />
        <DataColumn<Competition>
          header="操作"
          width={380}
          cell={(competition) => (
            <div className="flex items-center gap-1">
              <PermissionGuard permission={PermissionCode.COMPETITION_UPDATE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleEdit(competition)} title="编辑">
                  <Edit size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.COMPETITION_UPDATE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleManageProblems(competition)} title="管理题目">
                  <Settings size={16} />
                </button>
              </PermissionGuard>
              {competition.participantType === 'TEAM' ? (
                <PermissionGuard permission={PermissionCode.COMPETITION_UPDATE}>
                  <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => handleOpenTeamImport(competition)} title="管理队伍">
                    <Users size={16} />
                  </button>
                </PermissionGuard>
              ) : null}
              <PermissionGuard permission={PermissionCode.COMPETITION_ANTI_CHEAT_VIEW}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-blue-50 hover:text-blue-600" onClick={() => { setAntiCheatTarget(competition); setAntiCheatOpen(true); }} title="防作弊">
                  <ShieldAlert size={16} />
                </button>
              </PermissionGuard>
              <PermissionGuard permission={PermissionCode.COMPETITION_DELETE}>
                <button type="button" className="rounded-lg p-1.5 text-gray-400 transition-all hover:bg-red-50 hover:text-red-600" onClick={() => openConfirm('deleteCompetition', competition.id, competition.title)} title="删除">
                  <Trash2 size={16} />
                </button>
              </PermissionGuard>
            </div>
          )}
        />
        </DataTable>
      </div>

      {/* 新建/编辑比赛 Modal */}
      <Modal
        title={editingCompetition ? '编辑比赛' : '新建比赛'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
        centered
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            handleSubmit(competitionForm);
          }}
        >
          <Field label="比赛标题">
            <Input value={competitionForm.title} onChange={(event) => updateCompetitionForm('title', event.target.value)} />
          </Field>
          <Field label="比赛描述">
            <Input.TextArea value={competitionForm.description} onChange={(event) => updateCompetitionForm('description', event.target.value)} rows={4} />
          </Field>
          <Field label="开始时间">
            <DatePicker value={competitionForm.beginTime} onChange={(value) => updateCompetitionForm('beginTime', String(value || ''))} showTime className="w-full" />
          </Field>
          <Field label="结束时间">
            <DatePicker value={competitionForm.endTime} onChange={(value) => updateCompetitionForm('endTime', String(value || ''))} showTime className="w-full" />
          </Field>
          <Field label="是否需要密码">
            <Switch checked={competitionForm.needPassword} onChange={(checked) => updateCompetitionForm('needPassword', checked)} />
          </Field>
          <Field label="防作弊模式">
            <Select
              value={competitionForm.antiCheatMode}
              onChange={(value) => updateCompetitionForm('antiCheatMode', value)}
              options={[
                { label: '普通模式（允许本地 IDE，不记录离开/失焦）', value: 'NORMAL' },
                { label: '严格模式（要求全屏，记录切屏/失焦/退出全屏）', value: 'STRICT' },
              ]}
            />
          </Field>
          <Field label="参赛模式">
            <Select
              value={competitionForm.participantType}
              onChange={(value) => updateCompetitionForm('participantType', value)}
              options={[
                { label: '个人赛', value: 'INDIVIDUAL' },
                { label: '团队赛（管理员预置队伍）', value: 'TEAM' },
              ]}
            />
          </Field>
          {competitionForm.needPassword ? (
            <Field label="比赛密码">
              <Input.Password value={competitionForm.password} onChange={(event) => updateCompetitionForm('password', event.target.value)} placeholder="请输入比赛密码" />
            </Field>
          ) : null}
          <div>
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
          </div>
        </form>
      </Modal>

      <Modal
        title={`管理队伍${teamImportCompetition ? ` - ${teamImportCompetition.title}` : ''}`}
        open={teamImportVisible}
        onCancel={() => setTeamImportVisible(false)}
        footer={null}
        width={760}
        centered
      >
        <div className="space-y-4">
          <p className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>
            可以上传报名 Excel 批量导入多个队伍，也可以在下方手动填写并连续添加队伍。
          </p>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--gemini-border-light)' }}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
                  已导入队伍
                </div>
                <div className="text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>
                  共 {competitionTeams.length} 支队伍
                </div>
              </div>
              <Button
                size="small"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => teamImportCompetition && loadCompetitionTeams(teamImportCompetition.id)}
              >
                刷新
              </Button>
            </div>
            {teamListLoading ? (
              <div className="flex h-32 items-center justify-center text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>
                正在加载队伍...
              </div>
            ) : competitionTeams.length === 0 ? (
              <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed" style={{ borderColor: 'var(--gemini-border-light)', color: 'var(--gemini-text-tertiary)' }}>
                <Users className="mb-2 h-8 w-8 opacity-50" />
                <div className="text-sm">暂无队伍</div>
                <div className="mt-1 text-xs">可以通过 Excel 导入或手动添加队伍</div>
              </div>
            ) : (
              <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
                {competitionTeams.map((team) => {
                  const names = team.members?.map((member) => member.realName).filter(Boolean);
                  const memberNames = names && names.length > 0 ? names : [team.leaderName].filter(Boolean);

                  return (
                    <div
                      key={team.id}
                      className="rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                      style={{ borderColor: 'var(--gemini-border-light)', background: 'var(--gemini-bg-secondary)' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="truncate text-base font-semibold" style={{ color: 'var(--gemini-text-primary)' }}>
                              {team.teamName}
                            </div>
                            {team.femaleTeam ? <Tag color="pink">女子组</Tag> : null}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>
                            <span className="inline-flex items-center gap-1">
                              <Building2 className="h-3.5 w-3.5" />
                              {team.school || '未填写学校'}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3.5 w-3.5" />
                              {team.phone || '-'}
                            </span>
                            <span className="inline-flex min-w-0 items-center gap-1">
                              <Mail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{team.email || '-'}</span>
                            </span>
                          </div>
                        </div>
                          <Button type="link" danger size="small" icon={<Trash2 className="h-4 w-4" />} onClick={() => openConfirm('deleteTeam', team.id, team.teamName)}>
                            删除
                          </Button>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {memberNames.map((name, index) => (
                          <span
                            key={`${team.id}-${name}-${index}`}
                            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                            style={{ background: 'var(--gemini-bg-primary)', color: 'var(--gemini-text-secondary)' }}
                          >
                            <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold" style={{ background: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)' }}>
                              {index + 1}
                            </span>
                            {name}
                            {index === 0 ? <span style={{ color: 'var(--gemini-text-tertiary)' }}>队长</span> : null}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-dashed p-4" style={{ borderColor: 'var(--gemini-border-light)' }}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
                批量导入队伍
              </div>
              <Button size="small" icon={<Download className="w-4 h-4" />} onClick={handleDownloadTeamTemplate}>
                下载 Excel 模板
              </Button>
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>
              支持上传报名 Excel（.xlsx），后端会从第 4 行开始读取 A-H 列。
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input
                id="team-excel-file"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(event) => setTeamExcelFile(event.target.files?.[0] || null)}
              />
              <Button onClick={() => document.getElementById('team-excel-file')?.click()}>
                选择 Excel 文件
              </Button>
              <span className="text-sm" style={{ color: 'var(--gemini-text-tertiary)' }}>
                {teamExcelFile ? teamExcelFile.name : '未选择文件'}
              </span>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="primary" onClick={handleImportTeamsExcel} disabled={!teamExcelFile}>
                上传 Excel 导入
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border p-4" style={{ borderColor: 'var(--gemini-border-light)' }}>
            <div className="mb-3 text-sm font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
              手动添加队伍
            </div>
            <p className="mb-3 text-xs" style={{ color: 'var(--gemini-text-tertiary)' }}>
              保存成功后表单会自动清空，可以继续添加下一个队伍。
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="队伍名称">
                <Input value={teamForm.teamName} onChange={(event) => updateTeamForm('teamName', event.target.value)} placeholder="请输入队伍名称" />
              </Field>
              <Field label="学校">
                <Input value={teamForm.school} onChange={(event) => updateTeamForm('school', event.target.value)} placeholder="可选" />
              </Field>
              <Field label="队员1姓名">
                <Input value={teamForm.leaderName} onChange={(event) => updateTeamForm('leaderName', event.target.value)} placeholder="默认队长" />
              </Field>
              <Field label="手机号">
                <Input value={teamForm.phone} onChange={(event) => updateTeamForm('phone', event.target.value)} placeholder="请输入手机号" />
              </Field>
              <Field label="Email">
                <Input value={teamForm.email} onChange={(event) => updateTeamForm('email', event.target.value)} placeholder="请输入邮箱" />
              </Field>
              <Field label="队员2姓名">
                <Input value={teamForm.member2Name} onChange={(event) => updateTeamForm('member2Name', event.target.value)} placeholder="可选" />
              </Field>
              <Field label="队员3姓名">
                <Input value={teamForm.member3Name} onChange={(event) => updateTeamForm('member3Name', event.target.value)} placeholder="可选" />
              </Field>
              <Field label="女子组">
                <Switch checked={teamForm.femaleTeam} onChange={(checked) => updateTeamForm('femaleTeam', checked)} />
              </Field>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setTeamImportVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleSaveTeam}>保存队伍</Button>
          </div>
        </div>
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
        centered
        destroyOnClose
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
          renderItem={(problem, index) => (
            <List.Item
              actions={[
                <Button
                  key="up"
                  type="link"
                  size="small"
                  icon={<ArrowUp className="w-4 h-4" />}
                  disabled={index === 0}
                  onClick={() => handleMoveCompetitionProblem(index, 'up')}
                >
                  上移
                </Button>,
                <Button
                  key="down"
                  type="link"
                  size="small"
                  icon={<ArrowDown className="w-4 h-4" />}
                  disabled={index === competitionProblems.length - 1}
                  onClick={() => handleMoveCompetitionProblem(index, 'down')}
                >
                  下移
                </Button>,
                <Button key="delete" type="link" danger size="small" onClick={() => openConfirm('deleteProblemFromCompetition', problem.id, problem.title)}>
                  删除
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <span>
                    <span className="mr-2"><Tag color="blue">{String.fromCharCode('A'.charCodeAt(0) + index)}</Tag></span>
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
        centered
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

      {/* 防作弊审查面板 */}
      {/* 确认弹窗 */}
      <Modal
        title="确认操作"
        open={confirmModalVisible}
        centered
        onCancel={() => setConfirmModalVisible(false)}
        footer={null}
      >
        <div className="py-2 text-sm text-slate-700">
          {confirmAction === 'deleteCompetition' ? (
            <>确定要删除比赛 <strong>{confirmTargetName}</strong> 吗？</>
          ) : confirmAction === 'deleteTeam' ? (
            <>确定要删除队伍 <strong>{confirmTargetName}</strong> 吗？</>
          ) : (
            <>确定要从比赛中删除题目 <strong>{confirmTargetName}</strong> 吗？</>
          )}
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={() => setConfirmModalVisible(false)}>取消</Button>
          <Button type="primary" danger onClick={handleConfirm}>确定</Button>
        </div>
      </Modal>

      <AdminCompetitionAntiCheat
        open={antiCheatOpen}
        competitionId={antiCheatTarget?.id ?? null}
        competitionTitle={antiCheatTarget?.title}
        onClose={() => setAntiCheatOpen(false)}
      />
    </div>
  );
};

export default AdminCompetitions;

