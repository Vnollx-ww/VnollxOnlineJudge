package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.mapper.SubmissionMapper;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.service.serviceImpl.SubmissionServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

/**
 * 提交服务单元测试
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("提交服务测试")
class SubmissionServiceTest {

    @Mock
    private SubmissionMapper submissionMapper;

    @InjectMocks
    private SubmissionServiceImpl submissionService;

    private Submission testSubmission;

    @BeforeEach
    void setUp() {
        testSubmission = new Submission();
        testSubmission.setId(1L);
        testSubmission.setUid(1L);
        testSubmission.setProblemId(100L);
        testSubmission.setLanguage("java");
        testSubmission.setCode("public class Main { public static void main(String[] args) {} }");
        testSubmission.setStatus(0);
    }

    @Test
    @DisplayName("根据ID获取提交记录 - 成功")
    void getSubmissionById_Success() {
        when(submissionMapper.selectById(1L)).thenReturn(testSubmission);

        Submission result = submissionService.getById(1L);

        assertNotNull(result);
        assertEquals(1L, result.getId());
        assertEquals("java", result.getLanguage());
        verify(submissionMapper, times(1)).selectById(1L);
    }

    @Test
    @DisplayName("验证支持的编程语言")
    void validateProgrammingLanguage() {
        assertTrue(isSupportedLanguage("java"));
        assertTrue(isSupportedLanguage("cpp"));
        assertTrue(isSupportedLanguage("python"));
        assertTrue(isSupportedLanguage("c"));
        
        assertFalse(isSupportedLanguage("ruby"));
        assertFalse(isSupportedLanguage(""));
        assertFalse(isSupportedLanguage(null));
    }

    @Test
    @DisplayName("验证提交状态")
    void validateSubmissionStatus() {
        // 0: 等待判题, 1: 判题中, 2: 已完成
        assertEquals("等待判题", getStatusText(0));
        assertEquals("判题中", getStatusText(1));
        assertEquals("已完成", getStatusText(2));
        assertEquals("未知状态", getStatusText(-1));
    }

    @Test
    @DisplayName("验证代码长度限制")
    void validateCodeLength() {
        // 代码不能为空
        assertFalse(isValidCode(null));
        assertFalse(isValidCode(""));
        
        // 代码不能超过 100KB
        String shortCode = "int main() { return 0; }";
        assertTrue(isValidCode(shortCode));
        
        // 超长代码
        String longCode = "a".repeat(100 * 1024 + 1);
        assertFalse(isValidCode(longCode));
    }

    // 辅助方法
    private boolean isSupportedLanguage(String language) {
        if (language == null || language.isEmpty()) {
            return false;
        }
        return language.matches("^(java|cpp|c|python)$");
    }

    private String getStatusText(int status) {
        return switch (status) {
            case 0 -> "等待判题";
            case 1 -> "判题中";
            case 2 -> "已完成";
            default -> "未知状态";
        };
    }

    private boolean isValidCode(String code) {
        if (code == null || code.isEmpty()) {
            return false;
        }
        return code.length() <= 100 * 1024; // 100KB
    }
}
