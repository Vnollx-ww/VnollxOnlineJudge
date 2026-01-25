package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.vo.friend.FriendVo;
import com.example.vnollxonlinejudge.model.vo.friend.PrivateMessageVo;
import com.example.vnollxonlinejudge.model.vo.friend.UserSearchVo;

import java.util.List;

public interface FriendService {
    // 搜索用户
    List<UserSearchVo> searchUsers(Long currentUserId, String keyword, int pageNum, int pageSize);
    
    // 发送好友请求
    void sendFriendRequest(Long userId, Long friendId);
    
    // 接受好友请求
    void acceptFriendRequest(Long userId, Long requesterId);
    
    // 拒绝好友请求
    void rejectFriendRequest(Long userId, Long requesterId);
    
    // 删除好友
    void deleteFriend(Long userId, Long friendId);
    
    // 获取好友列表
    List<FriendVo> getFriendList(Long userId);
    
    // 获取待处理的好友请求
    List<FriendVo> getPendingRequests(Long userId);
    
    // 获取与某个好友的聊天记录
    List<PrivateMessageVo> getChatHistory(Long userId, Long friendId, int pageNum, int pageSize);
    
    // 发送私信
    PrivateMessageVo sendMessage(Long senderId, Long receiverId, String content);
    
    // 标记消息已读
    void markMessagesAsRead(Long userId, Long friendId);
    
    // 获取未读消息数
    Long getUnreadCount(Long userId);
    
    // 获取与某个好友的未读消息数
    Long getUnreadCountWithFriend(Long userId, Long friendId);
    
    // 清除与某个好友的聊天记录（单向）
    void clearChatHistory(Long userId, Long friendId);
}
