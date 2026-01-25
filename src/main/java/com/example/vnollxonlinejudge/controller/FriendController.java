package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.friend.FriendVo;
import com.example.vnollxonlinejudge.model.vo.friend.PrivateMessageVo;
import com.example.vnollxonlinejudge.model.vo.friend.UserSearchVo;
import com.example.vnollxonlinejudge.service.FriendService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/friend")
@Validated
public class FriendController {
    
    private final FriendService friendService;
    
    @Autowired
    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }
    
    @GetMapping("/search")
    public Result<List<UserSearchVo>> searchUsers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "20") int pageSize
    ) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.searchUsers(userId, keyword, pageNum, pageSize));
    }
    
    @PostMapping("/request/{friendId}")
    public Result<Void> sendFriendRequest(@PathVariable Long friendId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.sendFriendRequest(userId, friendId);
        return Result.Success("好友请求已发送");
    }
    
    @PostMapping("/accept/{requesterId}")
    public Result<Void> acceptFriendRequest(@PathVariable Long requesterId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.acceptFriendRequest(userId, requesterId);
        return Result.Success("已同意好友请求");
    }
    
    @PostMapping("/reject/{requesterId}")
    public Result<Void> rejectFriendRequest(@PathVariable Long requesterId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.rejectFriendRequest(userId, requesterId);
        return Result.Success("已拒绝好友请求");
    }
    
    @DeleteMapping("/delete/{friendId}")
    public Result<Void> deleteFriend(@PathVariable Long friendId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.deleteFriend(userId, friendId);
        return Result.Success("已删除好友");
    }
    
    @GetMapping("/list")
    public Result<List<FriendVo>> getFriendList() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.getFriendList(userId));
    }
    
    @GetMapping("/requests")
    public Result<List<FriendVo>> getPendingRequests() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.getPendingRequests(userId));
    }
    
    @GetMapping("/chat/{friendId}")
    public Result<List<PrivateMessageVo>> getChatHistory(
            @PathVariable Long friendId,
            @RequestParam(defaultValue = "1") int pageNum,
            @RequestParam(defaultValue = "50") int pageSize
    ) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.getChatHistory(userId, friendId, pageNum, pageSize));
    }
    
    @PostMapping("/message")
    public Result<PrivateMessageVo> sendMessage(@RequestBody Map<String, Object> body) {
        Long userId = UserContextHolder.getCurrentUserId();
        Long receiverId = Long.parseLong(body.get("receiverId").toString());
        String content = body.get("content").toString();
        return Result.Success(friendService.sendMessage(userId, receiverId, content));
    }
    
    @PostMapping("/read/{friendId}")
    public Result<Void> markMessagesAsRead(@PathVariable Long friendId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.markMessagesAsRead(userId, friendId);
        return Result.Success("已标记为已读");
    }
    
    @GetMapping("/unread")
    public Result<Long> getUnreadCount() {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.getUnreadCount(userId));
    }
    
    @GetMapping("/unread/{friendId}")
    public Result<Long> getUnreadCountWithFriend(@PathVariable Long friendId) {
        Long userId = UserContextHolder.getCurrentUserId();
        return Result.Success(friendService.getUnreadCountWithFriend(userId, friendId));
    }
    
    @DeleteMapping("/chat/clear/{friendId}")
    public Result<Void> clearChatHistory(@PathVariable Long friendId) {
        Long userId = UserContextHolder.getCurrentUserId();
        friendService.clearChatHistory(userId, friendId);
        return Result.Success("已清除聊天记录");
    }
}
