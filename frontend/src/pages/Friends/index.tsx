import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Input, Avatar, Badge, Empty, Spin, Modal, Tabs } from 'antd';
import { Search, Send, UserPlus, Check, X, Trash2, Smile } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import toast from 'react-hot-toast';
import api from '@/utils/api';
import { isAuthenticated } from '@/utils/auth';
import { useMessageWebSocket } from '@/contexts/MessageWebSocketContext';
import type { ApiResponse } from '@/types';

interface Friend {
  id: number;
  userId: number;
  userName: string;
  userAvatar: string | null;
  userSignature: string | null;
  status: number;
  createTime: string;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageTime: string | null;
  isOnline: boolean;
}

interface UserSearch {
  id: number;
  name: string;
  avatar: string | null;
  signature: string | null;
  friendStatus: number | null;
  isRequester: boolean;
}

interface PrivateMessage {
  id: number;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  receiverId: number;
  content: string;
  isRead: boolean;
  createTime: string;
  isMine: boolean;
}

const Friends: React.FC = () => {
    const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [searchResults, setSearchResults] = useState<UserSearch[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [messages, setMessages] = useState<PrivateMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { subscribe } = useMessageWebSocket();
  const chatCacheRef = useRef<Map<number, PrivateMessage[]>>(new Map());
  const [modal, contextHolder] = Modal.useModal();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 加载好友列表
  const loadFriends = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    try {
      const data = await api.get('/friend/list') as ApiResponse<Friend[]>;
      if (data.code === 200) {
        setFriends(data.data || []);
      }
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载待处理请求
  const loadPendingRequests = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const data = await api.get('/friend/requests') as ApiResponse<Friend[]>;
      if (data.code === 200) {
        setPendingRequests(data.data || []);
      }
    } catch (error) {
      console.error('加载好友请求失败:', error);
    }
  }, []);

  // 搜索用户
  const searchUsers = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.get('/friend/search', { 
        params: { keyword, pageNum: 1, pageSize: 20 } 
      }) as ApiResponse<UserSearch[]>;
      if (data.code === 200) {
        setSearchResults(data.data || []);
      }
    } catch (error) {
      console.error('搜索用户失败:', error);
    }
  }, []);

  // 加载聊天记录
  const loadChatHistory = useCallback(async (friendId: number) => {
    // 检查缓存
    const cached = chatCacheRef.current.get(friendId);
    if (cached) {
      setMessages(cached);
      // 后台标记已读
      api.post(`/friend/read/${friendId}`).then(() => {
        window.dispatchEvent(new CustomEvent('message-updated'));
        setFriends(prev => prev.map(f => 
          f.userId === friendId ? { ...f, unreadCount: 0 } : f
        ));
      });
      return;
    }
    
    setChatLoading(true);
    try {
      const data = await api.get(`/friend/chat/${friendId}`, {
        params: { pageNum: 1, pageSize: 50 }
      }) as ApiResponse<PrivateMessage[]>;
      if (data.code === 200) {
        const msgs = data.data || [];
        setMessages(msgs);
        // 存入缓存
        chatCacheRef.current.set(friendId, msgs);
      }
      // 标记已读
      await api.post(`/friend/read/${friendId}`);
      window.dispatchEvent(new CustomEvent('message-updated'));
      // 本地更新未读数，避免刷新整个列表
      setFriends(prev => prev.map(f => 
        f.userId === friendId ? { ...f, unreadCount: 0 } : f
      ));
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    } finally {
      setChatLoading(false);
    }
  }, []);

  // 发送消息
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    try {
      const data = await api.post('/friend/message', {
        receiverId: selectedFriend.userId,
        content: newMessage
      }) as ApiResponse<PrivateMessage>;
      if (data.code === 200) {
        const newMsg = data.data;
        setMessages(prev => [...prev, newMsg]);
        setNewMessage('');
        // 更新缓存
        const cached = chatCacheRef.current.get(selectedFriend.userId);
        if (cached) {
          chatCacheRef.current.set(selectedFriend.userId, [...cached, newMsg]);
        }
        // 本地更新好友列表的最后消息，避免重新请求
        setFriends(prev => prev.map(f => 
          f.userId === selectedFriend.userId 
            ? { ...f, lastMessage: newMessage, lastMessageTime: newMsg.createTime }
            : f
        ));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '发送失败');
    }
  };

  // 发送好友请求
  const sendFriendRequest = async (userId: number) => {
    try {
      const data = await api.post(`/friend/request/${userId}`) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('好友请求已发送');
        searchUsers(searchKeyword);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '发送失败');
    }
  };

  // 接受好友请求
  const acceptRequest = async (requesterId: number) => {
    try {
      const data = await api.post(`/friend/accept/${requesterId}`) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('已同意好友请求');
        loadFriends();
        loadPendingRequests();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '操作失败');
    }
  };

  // 拒绝好友请求
  const rejectRequest = async (requesterId: number) => {
    try {
      const data = await api.post(`/friend/reject/${requesterId}`) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('已拒绝好友请求');
        loadPendingRequests();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '操作失败');
    }
  };

  // 清除聊天记录
  const clearChatHistory = (friendId: number) => {
    modal.confirm({
      title: '确认清除聊天记录？',
      content: '清除后无法恢复',
      okText: '清除',
      cancelText: '取消',
      okType: 'danger',
      onOk: async () => {
        try {
          const data = await api.delete(`/friend/chat/clear/${friendId}`) as ApiResponse<void>;
          if (data.code === 200) {
            toast.success('已清除聊天记录');
            setMessages([]);
          }
        } catch (error: any) {
          toast.error(error.response?.data?.msg || '清除失败');
        }
      }
    });
  };

  // 添加 Emoji
  const onEmojiClick = (emojiObject: any) => {
    setNewMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // 订阅全局WebSocket消息
  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      // 好友请求通知
      if (msg.type === 'friend_request') {
        toast.success(`${msg.requesterName} 向你发送了好友请求`);
        loadPendingRequests();
        return;
      }
      
      // 好友请求被接受通知
      if (msg.type === 'friend_accepted') {
        toast.success(`${msg.accepterName} 已同意你的好友请求`);
        loadFriends();
        return;
      }
      
      // 好友在线状态变化
      if (msg.type === 'online_status') {
        setFriends(prev => prev.map(f => 
          f.userId === msg.userId 
            ? { ...f, isOnline: msg.isOnline }
            : f
        ));
        return;
      }
      
      // 如果是当前聊天对象发来的消息，直接显示并标记已读
      if (selectedFriend && msg.senderId === selectedFriend.userId) {
        const newMsg: PrivateMessage = {
          id: msg.id || Date.now(),
          senderId: msg.senderId,
          senderName: msg.senderName || '',
          senderAvatar: msg.senderAvatar || null,
          receiverId: msg.receiverId || 0,
          content: msg.content || '',
          isRead: msg.isRead || false,
          createTime: msg.createTime || new Date().toISOString(),
          isMine: false
        };
        setMessages(prev => [...prev, newMsg]);
        // 更新缓存
        const cached = chatCacheRef.current.get(msg.senderId);
        if (cached) {
          chatCacheRef.current.set(msg.senderId, [...cached, newMsg]);
        }
        api.post(`/friend/read/${msg.senderId}`).then(() => {
          window.dispatchEvent(new CustomEvent('message-updated'));
        });
        // 本地更新好友列表的最后消息
        setFriends(prev => prev.map(f => 
          f.userId === msg.senderId 
            ? { ...f, lastMessage: msg.content, lastMessageTime: msg.createTime }
            : f
        ));
      } else if (msg.senderId) {
        // 不是当前聊天对象的消息，更新缓存、未读数和侧边栏
        const cached = chatCacheRef.current.get(msg.senderId);
        if (cached) {
          const cachedMsg: PrivateMessage = {
            id: msg.id || Date.now(),
            senderId: msg.senderId,
            senderName: msg.senderName || '',
            senderAvatar: msg.senderAvatar || null,
            receiverId: msg.receiverId || 0,
            content: msg.content || '',
            isRead: msg.isRead || false,
            createTime: msg.createTime || new Date().toISOString(),
            isMine: false
          };
          chatCacheRef.current.set(msg.senderId, [...cached, cachedMsg]);
        }
        setFriends(prev => prev.map(f => 
          f.userId === msg.senderId 
            ? { ...f, unreadCount: (f.unreadCount || 0) + 1, lastMessage: msg.content, lastMessageTime: msg.createTime }
            : f
        ));
        window.dispatchEvent(new CustomEvent('message-updated'));
      }
    });

    return unsubscribe;
  }, [subscribe, selectedFriend, loadFriends, loadPendingRequests]);

  // 初始加载
  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, [loadFriends, loadPendingRequests]);

  // 搜索防抖
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchKeyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchUsers]);

  // 点击外部关闭 Emoji 选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 选择好友
  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    loadChatHistory(friend.userId);
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return '昨天';
    } else if (days < 7) {
      return `${days}天前`;
    } else {
      return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    }
  };

  // 格式化消息时间（显示完整日期和时间）
  const formatMessageTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    if (isToday) {
      return time;
    } else if (isYesterday) {
      return `昨天 ${time}`;
    } else if (date.getFullYear() === now.getFullYear()) {
      return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
    } else {
      return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
    }
  };

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
                <Empty description="未找到用户" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                        <div className="flex justify-center py-8"><Spin /></div>
                      ) : friends.length === 0 ? (
                        <Empty description="暂无好友" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                        <Empty description="暂无好友请求" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                    {selectedFriend.userName}
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLoading ? (
                <div className="flex justify-center py-8"><Spin /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Empty description="暂无消息，发送第一条消息开始聊天吧" />
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.isMine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-end gap-2 max-w-[70%] ${msg.isMine ? 'flex-row-reverse' : ''}`}>
                      {!msg.isMine && (
                        <Avatar 
                          size={32} 
                          src={msg.senderAvatar}
                          style={{ backgroundColor: 'var(--gemini-accent)' }}
                        >
                          {msg.senderName?.charAt(0)?.toUpperCase()}
                        </Avatar>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          msg.isMine ? 'rounded-br-sm' : 'rounded-bl-sm'
                        }`}
                        style={{
                          backgroundColor: msg.isMine ? 'var(--gemini-accent)' : 'var(--gemini-bg)',
                          color: msg.isMine ? 'var(--gemini-accent-text)' : 'var(--gemini-text-primary)'
                        }}
                      >
                        <div className="break-words whitespace-pre-wrap">{msg.content}</div>
                        <div 
                          className="text-xs mt-1 text-right"
                          style={{ 
                            color: msg.isMine ? 'rgba(255,255,255,0.7)' : 'var(--gemini-text-disabled)' 
                          }}
                        >
                          {formatMessageTime(msg.createTime)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
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
                  onChange={(e) => setNewMessage(e.target.value)}
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
