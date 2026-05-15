import { Bell, Send, Users, Search, CheckCircle2 } from 'lucide-react';
import { Button, Tag } from '@/components';
import Input from '@/components/ui/input';
import { useAdminNotifications } from '@/hooks/admin/useAdminNotifications';

const AdminNotifications: React.FC = () => {
  const {
    sendForm,
    sending,
    userKeyword,
    userLoading,
    userSearchResults,
    selectedUsers,
    sendMode,
    showUserPicker,
    setShowUserPicker,
    updateSendForm,
    setUserKeyword,
    searchUsers,
    addUser,
    removeUser,
    handleSend,
    setSendMode,
  } = useAdminNotifications();

  const handleUserKeywordChange = (value: string) => {
    setUserKeyword(value);
    searchUsers(value);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden text-slate-900">
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-50 p-2.5">
            <Bell className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">通知管理</h1>
            <p className="text-xs text-slate-500">向指定用户或全站用户发送通知</p>
          </div>
        </div>

        {/* Send Form Card */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-slate-800">发送通知</h2>

          <div className="space-y-4">
            {/* Send Mode */}
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-600">发送对象</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSendMode('all')}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    sendMode === 'all'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Users className="h-4 w-4" />
                  全部用户
                </button>
                <button
                  type="button"
                  onClick={() => setSendMode('target')}
                  className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${
                    sendMode === 'target'
                      ? 'border-blue-200 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  指定用户
                </button>
              </div>
            </div>

            {/* Target User Picker */}
            {sendMode === 'target' && (
              <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">
                    已选择 {selectedUsers.length} 人
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showUserPicker;
                      setShowUserPicker(next);
                      if (next) searchUsers(userKeyword);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {showUserPicker ? '收起' : '添加用户'}
                  </button>
                </div>

                {selectedUsers.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <Tag
                        key={user.id}
                        color="blue"
                        closable
                        onClose={() => removeUser(user.id)}
                      >
                        {user.name}
                      </Tag>
                    ))}
                  </div>
                )}

                {showUserPicker && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        placeholder="搜索用户名称或邮箱..."
                        value={userKeyword}
                        onChange={(e) => handleUserKeywordChange(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {userLoading && (
                      <div className="py-3 text-center text-sm text-slate-400">
                        <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent align-middle" />
                        搜索中...
                      </div>
                    )}
                    {!userLoading && userSearchResults.length > 0 && (
                      <div className="max-h-48 overflow-auto rounded-xl border border-slate-100 bg-white">
                        {userSearchResults.map((user) => (
                          <button
                            key={user.id}
                            type="button"
                            onClick={() => addUser(user)}
                            className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm transition hover:bg-blue-50"
                          >
                            <div>
                              <span className="font-medium text-slate-800">{user.name}</span>
                              <span className="ml-2 text-xs text-slate-500">{user.email}</span>
                            </div>
                            <Tag color="default" className="text-[10px]">
                              {user.identity || 'USER'}
                            </Tag>
                          </button>
                        ))}
                      </div>
                    )}
                    {!userLoading && userSearchResults.length === 0 && (
                      <div className="py-3 text-center text-sm text-slate-400">
                        暂无用户
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">通知标题</label>
              <Input
                placeholder="请输入通知标题"
                value={sendForm.title}
                onChange={(e) => updateSendForm('title', e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">通知内容</label>
              <textarea
                placeholder="请输入通知内容..."
                value={sendForm.description}
                onChange={(e) => updateSendForm('description', e.target.value)}
                className="h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            {/* Send Button */}
            <div className="flex justify-end">
              <Button
                type="primary"
                icon={<Send className="h-4 w-4" />}
                loading={sending}
                onClick={handleSend}
              >
                {sending ? '发送中...' : '发送通知'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
