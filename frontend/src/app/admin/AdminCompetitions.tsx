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
import { Plus, RefreshCw, Edit, Trash2, Settings, PlusCircle, ArrowUp, ArrowDown, ShieldAlert, Users, Phone, Mail, Building2, Download } from 'lucide-react';
import Input from '@/components/ui/input';
import Select from '@/components/ui/select';
import PermissionGuard from '@/components/common/permission-guard';
import { PermissionCode } from '@/constants/permissions';
import AdminCompetitionAntiCheat from './AdminCompetitionAntiCheat';
import { useAdminCompetitions, type Competition } from '@/hooks/admin/useAdminCompetitions';

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
  const {
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
    teamForm,
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
  } = useAdminCompetitions();

  const getDifficultyTag = (difficulty: string) => {
    const colors: Record<string, string> = { 简单: 'green', 中等: 'orange', 困难: 'red' };
    return <Tag color={colors[difficulty] || 'default'}>{difficulty || '未知'}</Tag>;
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
        zIndex={1100}
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

