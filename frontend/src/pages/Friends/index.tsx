import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { subscribe, sendMessage: wsSendMessage } = useMessageWebSocket();
  const chatCacheRef = useRef<Map<number, PrivateMessage[]>>(new Map());
  const [modal, contextHolder] = Modal.useModal();
  const [friendTyping, setFriendTyping] = useState<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef<number>(0);

  // 立即滚动到底部（无动画）
  const scrollToBottomInstant = useCallback(() => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  // 平滑滚动到底部
  const scrollToBottomSmooth = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

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

  // 加载聊天记录（初次加载，从最新消息开始）
  const loadChatHistory = useCallback(async (friendId: number) => {
    // 重置分页状态
    setCurrentPage(1);
    setHasMoreMessages(true);
    isInitialLoadRef.current = true;
    
    // 检查缓存
    const cached = chatCacheRef.current.get(friendId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setHasMoreMessages(cached.length >= PAGE_SIZE);
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
        params: { pageNum: 1, pageSize: PAGE_SIZE }
      }) as ApiResponse<PrivateMessage[]>;
      if (data.code === 200) {
        const msgs = data.data || [];
        // 消息按时间正序排列（旧的在前，新的在后）
        setMessages(msgs);
        setHasMoreMessages(msgs.length >= PAGE_SIZE);
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
  }, [PAGE_SIZE]);

  // 加载更多历史消息（向上滚动时触发）
  const loadMoreMessages = useCallback(async () => {
    if (!selectedFriend || loadingMore || !hasMoreMessages) return;
    
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const data = await api.get(`/friend/chat/${selectedFriend.userId}`, {
        params: { pageNum: nextPage, pageSize: PAGE_SIZE }
      }) as ApiResponse<PrivateMessage[]>;
      
      if (data.code === 200) {
        const olderMsgs = data.data || [];
        if (olderMsgs.length > 0) {
          // 保存当前滚动高度，用于 useLayoutEffect 恢复滚动位置
          pendingScrollRestoreRef.current = messagesContainerRef.current?.scrollHeight || null;
          
          // 将旧消息添加到前面
          setMessages(prev => [...olderMsgs, ...prev]);
          setCurrentPage(nextPage);
          
          // 更新缓存
          chatCacheRef.current.set(selectedFriend.userId, [...olderMsgs, ...(chatCacheRef.current.get(selectedFriend.userId) || [])]);
        }
        setHasMoreMessages(olderMsgs.length >= PAGE_SIZE);
      }
    } catch (error) {
      console.error('加载更多消息失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedFriend, loadingMore, hasMoreMessages, currentPage, PAGE_SIZE]);

  // 监听滚动，触发加载更多（带节流，排除初始加载阶段）
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    
    const handleScroll = () => {
      if (isInitialLoadRef.current || throttleTimer) return;
      // 当滚动到顶部附近时加载更多
      if (container.scrollTop < 50 && hasMoreMessages && !loadingMore && !chatLoading) {
        loadMoreMessages();
        throttleTimer = setTimeout(() => { throttleTimer = null; }, 300);
      }
    };
    
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [hasMoreMessages, loadingMore, chatLoading, loadMoreMessages]);

  // 初次加载/切换聊天后，同步滚动到底部（useLayoutEffect 在 DOM 更新后立即执行，不会闪烁）
  useLayoutEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0 && !chatLoading) {
      isInitialLoadRef.current = false;
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, chatLoading]);

  // 加载更多历史消息后，恢复滚动位置（保持用户视角不变）
  useLayoutEffect(() => {
    if (pendingScrollRestoreRef.current !== null) {
      const container = messagesContainerRef.current;
      if (container) {
        const previousScrollHeight = pendingScrollRestoreRef.current;
        container.scrollTop = container.scrollHeight - previousScrollHeight;
      }
      pendingScrollRestoreRef.current = null;
    }
  }, [messages]);

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
        // 发送消息后平滑滚动到底部
        setTimeout(scrollToBottomSmooth, 50);
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
      
      // 对方正在输入
      if (msg.type === 'typing') {
        if (msg.isTyping && selectedFriend && msg.fromUid === selectedFriend.userId) {
          setFriendTyping(msg.fromUid);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setFriendTyping(null), 3000);
        } else if (!msg.isTyping) {
          setFriendTyping(null);
        }
        return;
      }
      
      // 对方已读我的消息
      if (msg.type === 'message_read') {
        if (selectedFriend && msg.fromUid === selectedFriend.userId) {
          setMessages(prev => prev.map(m => 
            m.isMine ? { ...m, isRead: true } : m
          ));
        }
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
          // 通知对方消息已读
          console.log('[WS] 发送 message_read:', { type: 'message_read', toUid: msg.senderId });
          wsSendMessage({ type: 'message_read', toUid: msg.senderId });
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
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatLoading ? (
                <div className="flex justify-center py-8"><Spin /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Empty description="暂无消息，发送第一条消息开始聊天吧" />
                </div>
              ) : (
                <>
                  {/* 加载更多提示 - 仅在加载中显示 */}
                  {loadingMore && (
                    <div className="text-center py-2">
                      <Spin size="small" />
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

            {/* 正在输入提示 */}
            {friendTyping === selectedFriend?.userId && (
              <div 
                className="px-4 py-2 text-sm flex items-center gap-2"
                style={{ color: 'var(--gemini-text-secondary)' }}
              >
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
                <span>{selectedFriend?.userName} 正在输入...</span>
              </div>
            )}

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
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    // 发送正在输入状态（节流：500ms内只发一次）
                    if (selectedFriend && Date.now() - lastTypingRef.current > 500) {
                      lastTypingRef.current = Date.now();
                      console.log('[WS] 发送 typing:', { type: 'typing', toUid: selectedFriend.userId, isTyping: true });
                      wsSendMessage({ type: 'typing', toUid: selectedFriend.userId, isTyping: true });
                    }
                  }}
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
