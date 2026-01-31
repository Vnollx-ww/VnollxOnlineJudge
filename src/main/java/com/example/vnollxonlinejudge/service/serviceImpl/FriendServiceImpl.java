package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.FriendMapper;
import com.example.vnollxonlinejudge.mapper.PrivateMessageMapper;
import com.example.vnollxonlinejudge.model.entity.Friend;
import com.example.vnollxonlinejudge.model.entity.PrivateMessage;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.model.vo.friend.FriendVo;
import com.example.vnollxonlinejudge.model.vo.friend.PrivateMessageVo;
import com.example.vnollxonlinejudge.model.vo.friend.UserSearchVo;
import com.example.vnollxonlinejudge.service.FriendService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.websocket.MessageWebSocketHandler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class FriendServiceImpl extends ServiceImpl<FriendMapper, Friend> implements FriendService {
    
    private final PrivateMessageMapper privateMessageMapper;
    private final UserService userService;
    private final MessageWebSocketHandler messageWebSocketHandler;
    
    @Autowired
    public FriendServiceImpl(PrivateMessageMapper privateMessageMapper, 
                            UserService userService,
                            MessageWebSocketHandler messageWebSocketHandler) {
        this.privateMessageMapper = privateMessageMapper;
        this.userService = userService;
        this.messageWebSocketHandler = messageWebSocketHandler;
    }
    
    @Override
    public List<UserSearchVo> searchUsers(Long currentUserId, String keyword, int pageNum, int pageSize) {
        if (StringUtils.isBlank(keyword)) {
            return Collections.emptyList();
        }
        
        // 搜索用户
        List<User> users = userService.searchByName(keyword, pageNum, pageSize);
        
        // 获取当前用户与搜索结果的好友关系
        List<Long> userIds = users.stream().map(User::getId).collect(Collectors.toList());
        Map<Long, Friend> friendMap = new HashMap<>();
        
        if (!userIds.isEmpty()) {
            QueryWrapper<Friend> wrapper = new QueryWrapper<>();
            wrapper.and(w -> w
                .and(inner -> inner.eq("user_id", currentUserId).in("friend_id", userIds))
                .or(inner -> inner.eq("friend_id", currentUserId).in("user_id", userIds))
            );
            List<Friend> friends = this.list(wrapper);
            
            for (Friend f : friends) {
                Long otherId = f.getUserId().equals(currentUserId) ? f.getFriendId() : f.getUserId();
                friendMap.put(otherId, f);
            }
        }
        
        return users.stream()
            .filter(u -> !u.getId().equals(currentUserId))
            .map(u -> {
                Friend f = friendMap.get(u.getId());
                return UserSearchVo.builder()
                    .id(u.getId())
                    .name(u.getName())
                    .avatar(u.getAvatar())
                    .signature(u.getSignature())
                    .friendStatus(f != null ? f.getStatus() : null)
                    .isRequester(f != null && f.getUserId().equals(currentUserId))
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    @Override
    @Transactional
    public void sendFriendRequest(Long userId, Long friendId) {
        if (userId.equals(friendId)) {
            throw new BusinessException("不能添加自己为好友");
        }
        
        // 检查是否已存在好友关系
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.and(w -> w
            .and(inner -> inner.eq("user_id", userId).eq("friend_id", friendId))
            .or(inner -> inner.eq("user_id", friendId).eq("friend_id", userId))
        );
        Friend existing = this.getOne(wrapper);
        
        if (existing != null) {
            if (existing.getStatus() == 1) {
                throw new BusinessException("你们已经是好友了");
            } else if (existing.getStatus() == 0) {
                throw new BusinessException("已有待处理的好友请求");
            }
        }
        
        // 创建好友请求
        Friend friend = Friend.builder()
            .userId(userId)
            .friendId(friendId)
            .status(0)
            .createTime(LocalDateTime.now())
            .updateTime(LocalDateTime.now())
            .build();
        this.save(friend);
        
        // 发送WebSocket通知给被请求者
        User requester = userService.getUserEntityById(userId);
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "friend_request");
        notification.put("requesterId", userId);
        notification.put("requesterName", requester != null ? requester.getName() : "未知用户");
        notification.put("requesterAvatar", requester != null ? requester.getAvatar() : null);
        messageWebSocketHandler.sendFriendRequestNotification(friendId, notification);
    }
    
    @Override
    @Transactional
    public void acceptFriendRequest(Long userId, Long requesterId) {
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", requesterId)
               .eq("friend_id", userId)
               .eq("status", 0);
        Friend friend = this.getOne(wrapper);
        
        if (friend == null) {
            throw new BusinessException("好友请求不存在");
        }
        
        friend.setStatus(1);
        friend.setUpdateTime(LocalDateTime.now());
        this.updateById(friend);
        
        // 发送WebSocket通知给请求者，告知好友请求已被接受
        User accepter = userService.getUserEntityById(userId);
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "friend_accepted");
        notification.put("accepterId", userId);
        notification.put("accepterName", accepter != null ? accepter.getName() : "未知用户");
        notification.put("accepterAvatar", accepter != null ? accepter.getAvatar() : null);
        messageWebSocketHandler.sendFriendRequestNotification(requesterId, notification);
    }
    
    @Override
    @Transactional
    public void rejectFriendRequest(Long userId, Long requesterId) {
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.eq("user_id", requesterId)
               .eq("friend_id", userId)
               .eq("status", 0);
        Friend friend = this.getOne(wrapper);
        
        if (friend == null) {
            throw new BusinessException("好友请求不存在");
        }
        
        this.removeById(friend.getId());
    }
    
    @Override
    @Transactional
    public void deleteFriend(Long userId, Long friendId) {
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.and(w -> w
            .and(inner -> inner.eq("user_id", userId).eq("friend_id", friendId))
            .or(inner -> inner.eq("user_id", friendId).eq("friend_id", userId))
        );
        this.remove(wrapper);
    }
    
    @Override
    public List<FriendVo> getFriendList(Long userId) {
        // 获取已确认的好友关系
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.and(w -> w
            .eq("user_id", userId).or().eq("friend_id", userId)
        ).eq("status", 1);
        List<Friend> friends = this.list(wrapper);
        
        if (friends.isEmpty()) {
            return Collections.emptyList();
        }
        
        // 获取好友用户信息
        Set<Long> friendIds = friends.stream()
            .map(f -> f.getUserId().equals(userId) ? f.getFriendId() : f.getUserId())
            .collect(Collectors.toSet());
        
        Map<Long, User> userMap = userService.getUsersByIds(friendIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        
        // 获取最后一条消息和未读数
        List<FriendVo> result = new ArrayList<>();
        for (Friend f : friends) {
            Long friendUserId = f.getUserId().equals(userId) ? f.getFriendId() : f.getUserId();
            User friendUser = userMap.get(friendUserId);
            if (friendUser == null) continue;
            
            // 获取最后一条消息
            QueryWrapper<PrivateMessage> msgWrapper = new QueryWrapper<>();
            msgWrapper.and(w -> w
                .and(inner -> inner.eq("sender_id", userId).eq("receiver_id", friendUserId))
                .or(inner -> inner.eq("sender_id", friendUserId).eq("receiver_id", userId))
            ).orderByDesc("create_time").last("LIMIT 1");
            PrivateMessage lastMsg = privateMessageMapper.selectOne(msgWrapper);
            
            // 获取未读消息数
            QueryWrapper<PrivateMessage> unreadWrapper = new QueryWrapper<>();
            unreadWrapper.eq("sender_id", friendUserId)
                        .eq("receiver_id", userId)
                        .eq("is_read", false);
            Long unreadCount = privateMessageMapper.selectCount(unreadWrapper);
            
            result.add(FriendVo.builder()
                .id(f.getId())
                .userId(friendUserId)
                .userName(friendUser.getName())
                .userAvatar(friendUser.getAvatar())
                .userSignature(friendUser.getSignature())
                .status(f.getStatus())
                .createTime(f.getCreateTime())
                .unreadCount(unreadCount.intValue())
                .lastMessage(lastMsg != null ? lastMsg.getContent() : null)
                .lastMessageTime(lastMsg != null ? lastMsg.getCreateTime() : f.getCreateTime())
                .isOnline(messageWebSocketHandler.isUserOnline(friendUserId))
                .build());
        }
        
        // 按最后消息时间排序
        result.sort((a, b) -> {
            if (a.getLastMessageTime() == null) return 1;
            if (b.getLastMessageTime() == null) return -1;
            return b.getLastMessageTime().compareTo(a.getLastMessageTime());
        });
        
        return result;
    }
    
    @Override
    public List<FriendVo> getPendingRequests(Long userId) {
        // 获取发给我的待处理请求
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.eq("friend_id", userId).eq("status", 0);
        List<Friend> requests = this.list(wrapper);
        
        if (requests.isEmpty()) {
            return Collections.emptyList();
        }
        
        Set<Long> requesterIds = requests.stream()
            .map(Friend::getUserId)
            .collect(Collectors.toSet());
        
        Map<Long, User> userMap = userService.getUsersByIds(requesterIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));
        
        return requests.stream()
            .map(f -> {
                User requester = userMap.get(f.getUserId());
                return FriendVo.builder()
                    .id(f.getId())
                    .userId(f.getUserId())
                    .userName(requester != null ? requester.getName() : "未知用户")
                    .userAvatar(requester != null ? requester.getAvatar() : null)
                    .userSignature(requester != null ? requester.getSignature() : null)
                    .status(f.getStatus())
                    .createTime(f.getCreateTime())
                    .build();
            })
            .collect(Collectors.toList());
    }
    
    @Override
    public List<PrivateMessageVo> getChatHistory(Long userId, Long friendId, int pageNum, int pageSize) {
        // 验证好友关系
        if (!isFriend(userId, friendId)) {
            throw new BusinessException("你们还不是好友");
        }
        
        Page<PrivateMessage> page = new Page<>(pageNum, pageSize);
        QueryWrapper<PrivateMessage> wrapper = new QueryWrapper<>();
        // 查询用户发送的消息（未被发送者删除）或用户收到的消息（未被接收者删除）
        wrapper.and(w -> w
            .and(inner -> inner.eq("sender_id", userId).eq("receiver_id", friendId)
                .and(i -> i.isNull("deleted_by_sender").or().eq("deleted_by_sender", false)))
            .or(inner -> inner.eq("sender_id", friendId).eq("receiver_id", userId)
                .and(i -> i.isNull("deleted_by_receiver").or().eq("deleted_by_receiver", false)))
        ).orderByDesc("create_time");
        
        Page<PrivateMessage> result = privateMessageMapper.selectPage(page, wrapper);
        
        // 获取发送者信息
        Set<Long> senderIds = result.getRecords().stream()
            .map(PrivateMessage::getSenderId)
            .collect(Collectors.toSet());
        Map<Long, User> userMap = senderIds.isEmpty() ? Collections.emptyMap() :
            userService.getUsersByIds(senderIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        
        List<PrivateMessageVo> messages = result.getRecords().stream()
            .map(m -> {
                User sender = userMap.get(m.getSenderId());
                return PrivateMessageVo.builder()
                    .id(m.getId())
                    .senderId(m.getSenderId())
                    .senderName(sender != null ? sender.getName() : "未知用户")
                    .senderAvatar(sender != null ? sender.getAvatar() : null)
                    .receiverId(m.getReceiverId())
                    .content(m.getContent())
                    .isRead(m.getIsRead())
                    .createTime(m.getCreateTime())
                    .isMine(m.getSenderId().equals(userId))
                    .build();
            })
            .collect(Collectors.toList());
        
        // 倒序返回，让最新的在下面
        Collections.reverse(messages);
        return messages;
    }
    
    @Override
    @Transactional
    public PrivateMessageVo sendMessage(Long senderId, Long receiverId, String content) {
        // 验证好友关系
        if (!isFriend(senderId, receiverId)) {
            throw new BusinessException("你们还不是好友");
        }
        
        if (StringUtils.isBlank(content)) {
            throw new BusinessException("消息内容不能为空");
        }
        
        PrivateMessage message = PrivateMessage.builder()
            .senderId(senderId)
            .receiverId(receiverId)
            .content(content)
            .isRead(false)
            .createTime(LocalDateTime.now())
            .build();
        privateMessageMapper.insert(message);
        
        User sender = userService.getUserEntityById(senderId);
        PrivateMessageVo vo = PrivateMessageVo.builder()
            .id(message.getId())
            .senderId(senderId)
            .senderName(sender != null ? sender.getName() : "未知用户")
            .senderAvatar(sender != null ? sender.getAvatar() : null)
            .receiverId(receiverId)
            .content(content)
            .isRead(false)
            .createTime(message.getCreateTime())
            .isMine(true)
            .build();
        
        // 通过 WebSocket 推送给接收者
        messageWebSocketHandler.sendMessageToUser(receiverId, vo);
        
        return vo;
    }
    
    @Override
    @Transactional
    public void markMessagesAsRead(Long userId, Long friendId) {
        UpdateWrapper<PrivateMessage> wrapper = new UpdateWrapper<>();
        wrapper.eq("sender_id", friendId)
               .eq("receiver_id", userId)
               .eq("is_read", false)
               .set("is_read", true);
        privateMessageMapper.update(null, wrapper);
    }
    
    @Override
    public Long getUnreadCount(Long userId) {
        QueryWrapper<PrivateMessage> wrapper = new QueryWrapper<>();
        wrapper.eq("receiver_id", userId).eq("is_read", false);
        return privateMessageMapper.selectCount(wrapper);
    }
    
    @Override
    public Long getUnreadCountWithFriend(Long userId, Long friendId) {
        QueryWrapper<PrivateMessage> wrapper = new QueryWrapper<>();
        wrapper.eq("sender_id", friendId)
               .eq("receiver_id", userId)
               .eq("is_read", false);
        return privateMessageMapper.selectCount(wrapper);
    }
    
    @Override
    @Transactional
    public void clearChatHistory(Long userId, Long friendId) {
        // 用户发送的消息，标记为发送者已删除
        UpdateWrapper<PrivateMessage> sentWrapper = new UpdateWrapper<>();
        sentWrapper.eq("sender_id", userId).eq("receiver_id", friendId)
                   .set("deleted_by_sender", true);
        privateMessageMapper.update(null, sentWrapper);
        
        // 用户收到的消息，标记为接收者已删除
        UpdateWrapper<PrivateMessage> receivedWrapper = new UpdateWrapper<>();
        receivedWrapper.eq("sender_id", friendId).eq("receiver_id", userId)
                       .set("deleted_by_receiver", true);
        privateMessageMapper.update(null, receivedWrapper);
    }
    
    private boolean isFriend(Long userId, Long friendId) {
        QueryWrapper<Friend> wrapper = new QueryWrapper<>();
        wrapper.and(w -> w
            .and(inner -> inner.eq("user_id", userId).eq("friend_id", friendId))
            .or(inner -> inner.eq("user_id", friendId).eq("friend_id", userId))
        ).eq("status", 1);
        return this.count(wrapper) > 0;
    }
}
