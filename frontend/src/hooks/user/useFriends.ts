import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { confirm } from '@/components';
import { friendApi } from '@/lib';
import { isAuthenticated } from '@/utils/auth';
import { useMessageWebSocket } from '@/contexts/MessageWebSocketContext';
import type { ApiResponse } from '@/types';

export interface Friend {
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

export interface UserSearch {
  id: number;
  name: string;
  avatar: string | null;
  signature: string | null;
  friendStatus: number | null;
  isRequester: boolean;
}

export interface PrivateMessage {
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

const PAGE_SIZE = 20;

export const useFriends = () => {
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isInitialLoadRef = useRef(true);
  const pendingScrollRestoreRef = useRef<number | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const { subscribe, sendMessage: wsSendMessage } = useMessageWebSocket();
  const chatCacheRef = useRef<Map<number, PrivateMessage[]>>(new Map());
  const contextHolder = null;
  const [friendTyping, setFriendTyping] = useState<number | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingRef = useRef<number>(0);

  const scrollToBottomSmooth = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, []);

  const loadFriends = useCallback(async () => {
    if (!isAuthenticated()) return;
    setLoading(true);
    try {
      const data = (await friendApi.list<Friend[]>()) as ApiResponse<Friend[]>;
      if (data.code === 200) setFriends(data.data || []);
    } catch (error) {
      console.error('加载好友列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPendingRequests = useCallback(async () => {
    if (!isAuthenticated()) return;
    try {
      const data = (await friendApi.requests<Friend[]>()) as ApiResponse<Friend[]>;
      if (data.code === 200) setPendingRequests(data.data || []);
    } catch (error) {
      console.error('加载好友请求失败:', error);
    }
  }, []);

  const searchUsers = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const data = (await friendApi.search<UserSearch[]>(keyword)) as ApiResponse<UserSearch[]>;
      if (data.code === 200) setSearchResults(data.data || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
    }
  }, []);

  const loadChatHistory = useCallback(async (friendId: number) => {
    setCurrentPage(1);
    setHasMoreMessages(true);
    isInitialLoadRef.current = true;

    const cached = chatCacheRef.current.get(friendId);
    if (cached && cached.length > 0) {
      setMessages(cached);
      setHasMoreMessages(cached.length >= PAGE_SIZE);
      friendApi.read(friendId).then(() => {
        window.dispatchEvent(new CustomEvent('message-updated'));
        setFriends((prev) => prev.map((f) => (f.userId === friendId ? { ...f, unreadCount: 0 } : f)));
      });
      return;
    }

    setChatLoading(true);
    try {
      const data = (await friendApi.chat<PrivateMessage[]>(friendId, 1, PAGE_SIZE)) as ApiResponse<PrivateMessage[]>;
      if (data.code === 200) {
        const msgs = data.data || [];
        setMessages(msgs);
        setHasMoreMessages(msgs.length >= PAGE_SIZE);
        chatCacheRef.current.set(friendId, msgs);
      }
      await friendApi.read(friendId);
      window.dispatchEvent(new CustomEvent('message-updated'));
      setFriends((prev) => prev.map((f) => (f.userId === friendId ? { ...f, unreadCount: 0 } : f)));
    } catch (error) {
      console.error('加载聊天记录失败:', error);
    } finally {
      setChatLoading(false);
    }
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!selectedFriend || loadingMore || !hasMoreMessages) return;
    setLoadingMore(true);
    const nextPage = currentPage + 1;
    try {
      const data = (await friendApi.chat<PrivateMessage[]>(selectedFriend.userId, nextPage, PAGE_SIZE)) as ApiResponse<PrivateMessage[]>;
      if (data.code === 200) {
        const olderMsgs = data.data || [];
        if (olderMsgs.length > 0) {
          pendingScrollRestoreRef.current = messagesContainerRef.current?.scrollHeight || null;
          setMessages((prev) => [...olderMsgs, ...prev]);
          setCurrentPage(nextPage);
          chatCacheRef.current.set(selectedFriend.userId, [
            ...olderMsgs,
            ...(chatCacheRef.current.get(selectedFriend.userId) || []),
          ]);
        }
        setHasMoreMessages(olderMsgs.length >= PAGE_SIZE);
      }
    } catch (error) {
      console.error('加载更多消息失败:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [selectedFriend, loadingMore, hasMoreMessages, currentPage]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    const handleScroll = () => {
      if (isInitialLoadRef.current || throttleTimer) return;
      if (container.scrollTop < 50 && hasMoreMessages && !loadingMore && !chatLoading) {
        loadMoreMessages();
        throttleTimer = setTimeout(() => {
          throttleTimer = null;
        }, 300);
      }
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (throttleTimer) clearTimeout(throttleTimer);
    };
  }, [hasMoreMessages, loadingMore, chatLoading, loadMoreMessages]);

  useLayoutEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0 && !chatLoading) {
      isInitialLoadRef.current = false;
      const container = messagesContainerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }, [messages, chatLoading]);

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

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    try {
      const data = (await friendApi.sendMessage<PrivateMessage>(selectedFriend.userId, newMessage)) as ApiResponse<PrivateMessage>;
      if (data.code === 200) {
        const newMsg = data.data;
        setMessages((prev) => [...prev, newMsg]);
        setNewMessage('');
        setTimeout(scrollToBottomSmooth, 50);
        const cached = chatCacheRef.current.get(selectedFriend.userId);
        if (cached) chatCacheRef.current.set(selectedFriend.userId, [...cached, newMsg]);
        setFriends((prev) =>
          prev.map((f) =>
            f.userId === selectedFriend.userId
              ? { ...f, lastMessage: newMessage, lastMessageTime: newMsg.createTime }
              : f,
          ),
        );
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '发送失败');
    }
  };

  const sendFriendRequest = async (userId: number) => {
    try {
      const data = (await friendApi.request(userId)) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('好友请求已发送');
        setSearchResults((current) => current.map((user) => (
          user.id === userId ? { ...user, friendStatus: 0, isRequester: true } : user
        )));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '发送失败');
    }
  };

  const acceptRequest = async (requesterId: number) => {
    try {
      const data = (await friendApi.accept(requesterId)) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('已同意好友请求');
        const request = pendingRequests.find((item) => item.userId === requesterId);
        if (request) {
          setFriends((current) => current.some((item) => item.userId === requesterId) ? current : [{ ...request, status: 1, unreadCount: 0 }, ...current]);
        }
        setPendingRequests((current) => current.filter((item) => item.userId !== requesterId));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '操作失败');
    }
  };

  const rejectRequest = async (requesterId: number) => {
    try {
      const data = (await friendApi.reject(requesterId)) as ApiResponse<void>;
      if (data.code === 200) {
        toast.success('已拒绝好友请求');
        setPendingRequests((current) => current.filter((item) => item.userId !== requesterId));
      }
    } catch (error: any) {
      toast.error(error.response?.data?.msg || '操作失败');
    }
  };

  const clearChatHistory = (friendId: number) => {
    confirm({
      title: '确认清除聊天记录？',
      content: '清除后无法恢复',
      okText: '清除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const data = (await friendApi.clearChat(friendId)) as ApiResponse<void>;
          if (data.code === 200) {
            toast.success('已清除聊天记录');
            setMessages([]);
          }
        } catch (error: any) {
          toast.error(error.response?.data?.msg || '清除失败');
        }
      },
    });
  };

  const onEmojiClick = (emojiObject: any) => {
    setNewMessage((prev) => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  useEffect(() => {
    const unsubscribe = subscribe((msg) => {
      if (msg.type === 'friend_request') {
        toast.success(`${msg.requesterName} 向你发送了好友请求`);
        const requesterId = Number(msg.requesterId);
        if (requesterId) {
          setPendingRequests((current) => current.some((item) => item.userId === requesterId) ? current : [{
            id: Date.now(),
            userId: requesterId,
            userName: msg.requesterName || '未知用户',
            userAvatar: msg.requesterAvatar || null,
            userSignature: null,
            status: 0,
            createTime: new Date().toISOString(),
            unreadCount: 0,
            lastMessage: null,
            lastMessageTime: null,
            isOnline: false,
          }, ...current]);
        }
        return;
      }
      if (msg.type === 'friend_accepted') {
        toast.success(`${msg.accepterName} 已同意你的好友请求`);
        const accepterId = Number(msg.accepterId);
        if (accepterId) {
          setFriends((current) => current.some((item) => item.userId === accepterId) ? current : [{
            id: Date.now(),
            userId: accepterId,
            userName: msg.accepterName || '未知用户',
            userAvatar: msg.accepterAvatar || null,
            userSignature: null,
            status: 1,
            createTime: new Date().toISOString(),
            unreadCount: 0,
            lastMessage: null,
            lastMessageTime: null,
            isOnline: false,
          }, ...current]);
          setSearchResults((current) => current.map((user) => (
            user.id === accepterId ? { ...user, friendStatus: 1, isRequester: false } : user
          )));
        }
        return;
      }
      if (msg.type === 'online_status') {
        setFriends((prev) => prev.map((f) => (f.userId === msg.userId ? { ...f, isOnline: msg.isOnline } : f)));
        return;
      }
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
      if (msg.type === 'message_read') {
        if (selectedFriend && msg.fromUid === selectedFriend.userId) {
          setMessages((prev) => prev.map((m) => (m.isMine ? { ...m, isRead: true } : m)));
        }
        return;
      }
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
          isMine: false,
        };
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(scrollToBottomSmooth, 50);
        const cached = chatCacheRef.current.get(msg.senderId);
        if (cached) chatCacheRef.current.set(msg.senderId, [...cached, newMsg]);
        friendApi.read(msg.senderId).then(() => {
          window.dispatchEvent(new CustomEvent('message-updated'));
          wsSendMessage({ type: 'message_read', toUid: msg.senderId });
        });
        setFriends((prev) =>
          prev.map((f) =>
            f.userId === msg.senderId
              ? { ...f, lastMessage: msg.content, lastMessageTime: msg.createTime }
              : f,
          ),
        );
      } else if (msg.senderId) {
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
            isMine: false,
          };
          chatCacheRef.current.set(msg.senderId, [...cached, cachedMsg]);
        }
        setFriends((prev) =>
          prev.map((f) =>
            f.userId === msg.senderId
              ? {
                  ...f,
                  unreadCount: (f.unreadCount || 0) + 1,
                  lastMessage: msg.content,
                  lastMessageTime: msg.createTime,
                }
              : f,
          ),
        );
        window.dispatchEvent(new CustomEvent('message-updated'));
      }
    });
    return unsubscribe;
  }, [subscribe, selectedFriend, loadFriends, loadPendingRequests, scrollToBottomSmooth, wsSendMessage]);

  useEffect(() => {
    loadFriends();
    loadPendingRequests();
  }, [loadFriends, loadPendingRequests]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(searchKeyword), 300);
    return () => clearTimeout(timer);
  }, [searchKeyword, searchUsers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFriend = (friend: Friend) => {
    setSelectedFriend(friend);
    loadChatHistory(friend.userId);
  };

  const handleNewMessageChange = (value: string) => {
    setNewMessage(value);
    if (selectedFriend && Date.now() - lastTypingRef.current > 500) {
      lastTypingRef.current = Date.now();
      wsSendMessage({ type: 'typing', toUid: selectedFriend.userId, isTyping: true });
    }
  };

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
  };

  const formatMessageTime = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();
    const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    if (isToday) return time;
    if (isYesterday) return `昨天 ${time}`;
    if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
  };

  return {
    friends,
    pendingRequests,
    searchResults,
    selectedFriend,
    messages,
    newMessage,
    setNewMessage,
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
  };
};
