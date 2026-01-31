package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.mapper.UserMapper;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.service.serviceImpl.UserServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.*;

/**
 * 用户服务单元测试
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("用户服务测试")
class UserServiceTest {

    @Mock
    private UserMapper userMapper;

    @InjectMocks
    private UserServiceImpl userService;

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = new User();
        testUser.setId(1L);
        testUser.setName("testUser");
        testUser.setEmail("test@example.com");
        testUser.setIdentity(0);
    }

    @Test
    @DisplayName("根据ID获取用户 - 成功")
    void getUserById_Success() {
        when(userMapper.selectById(1L)).thenReturn(testUser);

        User result = userService.getById(1L);

        assertNotNull(result);
        assertEquals("testUser", result.getName());
        assertEquals("test@example.com", result.getEmail());
        verify(userMapper, times(1)).selectById(1L);
    }

    @Test
    @DisplayName("根据ID获取用户 - 用户不存在")
    void getUserById_NotFound() {
        when(userMapper.selectById(anyLong())).thenReturn(null);

        User result = userService.getById(999L);

        assertNull(result);
        verify(userMapper, times(1)).selectById(999L);
    }

    @Test
    @DisplayName("验证用户名格式")
    void validateUsername() {
        // 有效用户名
        assertTrue(isValidUsername("user123"));
        assertTrue(isValidUsername("test_user"));
        
        // 无效用户名
        assertFalse(isValidUsername(""));
        assertFalse(isValidUsername("ab")); // 太短
        assertFalse(isValidUsername("user@name")); // 含特殊字符
    }

    @Test
    @DisplayName("验证邮箱格式")
    void validateEmail() {
        assertTrue(isValidEmail("test@example.com"));
        assertTrue(isValidEmail("user.name@domain.org"));
        
        assertFalse(isValidEmail("invalid-email"));
        assertFalse(isValidEmail("@example.com"));
        assertFalse(isValidEmail("test@"));
    }

    // 辅助方法
    private boolean isValidUsername(String username) {
        if (username == null || username.length() < 3 || username.length() > 20) {
            return false;
        }
        return username.matches("^[a-zA-Z0-9_]+$");
    }

    private boolean isValidEmail(String email) {
        if (email == null || email.isEmpty()) {
            return false;
        }
        return email.matches("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$");
    }
}
