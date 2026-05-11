import { Empty, Spin, Avatar, Badge, Tabs } from '../../components';
import { Search, Send, UserPlus, Check, X, Trash2, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Input from '../../components/input';
import { useFriends } from '@/hooks/useFriends';

const Friends: React.FC = () => {
  const {
    friends,
    pendingRequests,
    searchResults,
    selectedFriend,
    messages,
    newMessage,
    handleNewMessageChange,
    searchKeyword,
    setSearchKeyword,
    loading,
    chatLoading,
    loadingMore,
    hasMoreMessages,
    showEmojiPicker,
    setShowEmojiPicker,
    activeTab,
    setActiveTab,
    messagesEndRef,
    messagesContainerRef,
    emojiPickerRef,
    contextHolder,
    friendTyping,
    sendMessage,
    sendFriendRequest,
    acceptRequest,
    rejectRequest,
    clearChatHistory,
    onEmojiClick,
    handleSelectFriend,
    formatTime,
    formatMessageTime,
  } = useFriends();

  return (
    <div className="h-[calc(100vh-120px)] flex rounded-3xl overflow-hidden" style={{ backgroundColor: 'var(--gemini-surface)' }}>
      {contextHolder}
      {/* 左侧好友列表 */}
      <div className="w-80 flex flex-col border-r" style={{ borderColor: 'var(--gemini-border-light)' }}>
        {/* 搜索框 */}
        <div className="p-4">
          <Input
            placeholder="搜索用户添加好友..."
            prefix={<Search className="w-4 h-4" style={{ color: 'var(--gemini-text-disabled)' }} />}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="rounded-full"
            style={{ backgroundColor: 'var(--gemini-bg)' }}
          />
        </div>

        {/* 搜索结果或好友列表 */}
        <div className="flex-1 overflow-y-auto">
          {searchKeyword ? (
            // 搜索结果
            <div className="px-2">
              <div className="px-3 py-2 text-xs font-medium" style={{ color: 'var(--gemini-text-disabled)' }}>
                搜索结果
              </div>
              {searchResults.length === 0 ? (
                <Empty description="未找到用户" />
              ) : (
                searchResults.map(user => (
                  <div 
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-2xl mb-1 transition-colors"
                    style={{ backgroundColor: 'var(--gemini-bg)' }}
                  >
                    <Avatar 
                      size={40} 
                      src={user.avatar}
                      style={{ backgroundColor: 'var(--gemini-accent)' }}
                    >
                      {user.name?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate" style={{ color: 'var(--gemini-text-primary)' }}>
                        {user.name}
                      </div>
                      <div className="text-xs truncate" style={{ color: 'var(--gemini-text-disabled)' }}>
                        {user.signature || '暂无签名'}
                      </div>
                    </div>
                    {user.friendStatus === 1 ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)' }}>
                        已是好友
                      </span>
                    ) : user.friendStatus === 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--gemini-surface-hover)', color: 'var(--gemini-text-secondary)' }}>
                        {user.isRequester ? '等待对方确认' : '待你确认'}
                      </span>
                    ) : (
                      <button
                        onClick={() => sendFriendRequest(user.id)}
                        className="p-2 rounded-full transition-colors hover:bg-opacity-80"
                        style={{ backgroundColor: 'var(--gemini-accent)', color: 'var(--gemini-accent-text)' }}
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            // 好友列表和请求
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              centered
              items={[
                {
                  key: 'friends',
                  label: `好友 (${friends.length})`,
                  children: (
                    <div className="px-2">
                      {loading ? (
                        <div className="flex justify-center py-8"><Spin spinning /></div>
                      ) : friends.length === 0 ? (
                        <Empty description="暂无好友" />
                      ) : (
                        friends.map(friend => (
                          <div
                            key={friend.id}
                            onClick={() => handleSelectFriend(friend)}
                            className={`flex items-center gap-3 p-3 rounded-2xl mb-1 cursor-pointer transition-colors ${
                              selectedFriend?.userId === friend.userId ? '' : 'hover:bg-opacity-50'
                            }`}
                            style={{ 
                              backgroundColor: selectedFriend?.userId === friend.userId 
                                ? 'var(--gemini-accent)' 
                                : 'transparent'
                            }}
                          >
                            <Badge count={friend.unreadCount} size="small">
                              <div className="relative">
                                <Avatar 
                                  size={44} 
                                  src={friend.userAvatar}
                                  style={{ backgroundColor: 'var(--gemini-accent-strong)' }}
                                >
                                  {friend.userName?.charAt(0)?.toUpperCase()}
                                </Avatar>
                                <span 
                                  className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
                                  style={{ 
                                    backgroundColor: friend.isOnline ? '#22c55e' : '#9ca3af',
                                    borderColor: selectedFriend?.userId === friend.userId 
                                      ? 'var(--gemini-accent)' 
                                      : 'var(--gemini-surface)'
                                  }}
                                />
                              </div>
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span 
                                  className="font-medium truncate"
                                  style={{ 
                                    color: selectedFriend?.userId === friend.userId 
                                      ? 'var(--gemini-accent-text)' 
                                      : 'var(--gemini-text-primary)' 
                                  }}
                                >
                                  {friend.userName}
                                </span>
                                <span 
                                  className="text-xs"
                                  style={{ 
                                    color: selectedFriend?.userId === friend.userId 
                                      ? 'var(--gemini-accent-text)' 
                                      : 'var(--gemini-text-disabled)' 
                                  }}
                                >
                                  {formatTime(friend.lastMessageTime)}
                                </span>
                              </div>
                              <div 
                                className="text-sm truncate"
                                style={{ 
                                  color: selectedFriend?.userId === friend.userId 
                                    ? 'var(--gemini-accent-text)' 
                                    : 'var(--gemini-text-secondary)' 
                                }}
                              >
                                {friend.lastMessage || '暂无消息'}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                },
                {
                  key: 'requests',
                  label: (
                    <Badge count={pendingRequests.length} size="small" offset={[10, 0]}>
                      <span>请求</span>
                    </Badge>
                  ),
                  children: (
                    <div className="px-2">
                      {pendingRequests.length === 0 ? (
                        <Empty description="暂无好友请求" />
                      ) : (
                        pendingRequests.map(request => (
                          <div
                            key={request.id}
                            className="flex items-center gap-3 p-3 rounded-2xl mb-1"
                            style={{ backgroundColor: 'var(--gemini-bg)' }}
                          >
                            <Avatar 
                              size={44} 
                              src={request.userAvatar}
                              style={{ backgroundColor: 'var(--gemini-accent)' }}
                            >
                              {request.userName?.charAt(0)?.toUpperCase()}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate" style={{ color: 'var(--gemini-text-primary)' }}>
                                {request.userName}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                                请求添加你为好友
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => acceptRequest(request.userId)}
                                className="p-2 rounded-full"
                                style={{ backgroundColor: 'var(--gemini-success)', color: '#fff' }}
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => rejectRequest(request.userId)}
                                className="p-2 rounded-full"
                                style={{ backgroundColor: 'var(--gemini-error)', color: '#fff' }}
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )
                }
              ]}
            />
          )}
        </div>
      </div>

      {/* 右侧聊天区域 */}
      <div className="flex-1 flex flex-col">
        {selectedFriend ? (
          <>
            {/* 聊天头部 */}
            <div 
              className="h-16 px-6 flex items-center justify-between"
              style={{ borderBottom: '1px solid var(--gemini-border-light)' }}
            >
              <div className="flex items-center gap-3">
                <Avatar 
                  size={40} 
                  src={selectedFriend.userAvatar}
                  style={{ backgroundColor: 'var(--gemini-accent)' }}
                >
                  {selectedFriend.userName?.charAt(0)?.toUpperCase()}
                </Avatar>
                <div>
                  <div className="font-medium" style={{ color: 'var(--gemini-text-primary)' }}>
                    {friendTyping === selectedFriend.userId ? '对方正在输入...' : selectedFriend.userName}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                    {selectedFriend.userSignature || '暂无签名'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => clearChatHistory(selectedFriend.userId)}
                className="p-2 rounded-full transition-colors hover:bg-red-50"
                style={{ color: 'var(--gemini-error)' }}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* 聊天消息区域 */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLoading ? (
                <div className="flex justify-center py-8"><Spin spinning /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Empty description="暂无消息，发送第一条消息开始聊天吧" />
                </div>
              ) : (
                <>
                  {/* 加载更多提示 - 仅在加载中显示 */}
                  {loadingMore && (
                    <div className="text-center py-2">
                      <Spin spinning />
                    </div>
                  )}
                  {!hasMoreMessages && messages.length > 0 && (
                    <div className="text-center py-2 text-xs" style={{ color: 'var(--gemini-text-disabled)' }}>
                      已加载全部消息
                    </div>
                  )}
                  {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start gap-2 max-w-[70%] ${msg.isMine ? 'flex-row-reverse' : ''}`}>
                      <Avatar 
                        size={32} 
                        src={msg.senderAvatar}
                        className="flex-shrink-0"
                        style={{ backgroundColor: 'var(--gemini-accent)' }}
                      >
                        {msg.senderName?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <div className="min-w-0">
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            msg.isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
                          }`}
                          style={{
                            backgroundColor: msg.isMine ? 'var(--gemini-accent)' : 'var(--gemini-bg)',
                            color: msg.isMine ? 'var(--gemini-accent-text)' : 'var(--gemini-text-primary)'
                          }}
                        >
                          <span className="break-words whitespace-pre-wrap">{msg.content}</span>
                        </div>
                        <div 
                          className={`text-xs mt-1 flex items-center gap-2 ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                          style={{ color: 'var(--gemini-text-disabled)' }}
                        >
                          {msg.isMine && (
                            <span style={{ color: msg.isRead ? 'var(--gemini-success)' : 'var(--gemini-text-disabled)' }}>
                              {msg.isRead ? '已读' : '未读'}
                            </span>
                          )}
                          <span>{formatMessageTime(msg.createTime)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  ))}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div 
              className="p-4"
              style={{ borderTop: '1px solid var(--gemini-border-light)' }}
            >
              <div className="flex items-center gap-3">
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    className="p-2 rounded-full transition-colors"
                    style={{ 
                      backgroundColor: 'var(--gemini-bg)', 
                      color: 'var(--gemini-text-secondary)' 
                    }}
                  >
                    <Smile className="w-5 h-5" />
                  </button>
                  {showEmojiPicker && (
                    <div className="absolute bottom-12 left-0 z-50">
                      <EmojiPicker onEmojiClick={onEmojiClick} />
                    </div>
                  )}
                </div>
                <Input
                  placeholder="输入消息..."
                  value={newMessage}
                  onChange={(e) => handleNewMessageChange(e.target.value)}
                  onPressEnter={sendMessage}
                  className="flex-1 rounded-full"
                  style={{ backgroundColor: 'var(--gemini-bg)' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="p-3 rounded-full transition-colors disabled:opacity-50"
                  style={{ 
                    backgroundColor: 'var(--gemini-accent)', 
                    color: 'var(--gemini-accent-text)' 
                  }}
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <Empty description="选择一个好友开始聊天" />
          </div>
        )}
      </div>
    </div>
  );
};

export default Friends;
