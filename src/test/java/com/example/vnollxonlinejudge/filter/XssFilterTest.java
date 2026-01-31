package com.example.vnollxonlinejudge.filter;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

/**
 * XSS 过滤器单元测试
 */
@DisplayName("XSS过滤器测试")
class XssFilterTest {

    @Test
    @DisplayName("清理 script 标签")
    void cleanScriptTag() {
        String input = "Hello<script>alert('xss')</script>World";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertFalse(result.contains("<script>"));
        assertFalse(result.contains("</script>"));
        assertFalse(result.contains("alert"));
    }

    @Test
    @DisplayName("清理 javascript 协议")
    void cleanJavascriptProtocol() {
        String input = "<a href=\"javascript:alert('xss')\">Click</a>";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertFalse(result.toLowerCase().contains("javascript:"));
    }

    @ParameterizedTest
    @ValueSource(strings = {
        "onclick=alert('xss')",
        "onerror=alert('xss')",
        "onload=alert('xss')",
        "onmouseover=alert('xss')"
    })
    @DisplayName("清理事件处理器")
    void cleanEventHandlers(String input) {
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertFalse(result.contains("onclick"));
        assertFalse(result.contains("onerror"));
        assertFalse(result.contains("onload"));
        assertFalse(result.contains("onmouseover"));
    }

    @Test
    @DisplayName("清理 iframe 标签")
    void cleanIframeTag() {
        String input = "<iframe src='http://evil.com'></iframe>";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertFalse(result.contains("<iframe"));
        assertFalse(result.contains("</iframe>"));
    }

    @Test
    @DisplayName("清理 eval 表达式")
    void cleanEvalExpression() {
        String input = "eval(document.cookie)";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertFalse(result.contains("eval("));
    }

    @Test
    @DisplayName("HTML实体编码")
    void htmlEntityEncode() {
        String input = "<div>test</div>";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertTrue(result.contains("&lt;"));
        assertTrue(result.contains("&gt;"));
    }

    @Test
    @DisplayName("正常文本不受影响")
    void normalTextUnchanged() {
        String input = "Hello World! This is a normal text.";
        String result = XssHttpServletRequestWrapper.cleanXss(input);
        
        assertEquals(input, result);
    }

    @Test
    @DisplayName("空值处理")
    void nullAndEmptyHandling() {
        assertNull(XssHttpServletRequestWrapper.cleanXss(null));
        assertEquals("", XssHttpServletRequestWrapper.cleanXss(""));
    }

    @Test
    @DisplayName("检测XSS攻击内容")
    void detectXssContent() {
        assertTrue(XssHttpServletRequestWrapper.containsXss("<script>alert(1)</script>"));
        assertTrue(XssHttpServletRequestWrapper.containsXss("javascript:void(0)"));
        assertTrue(XssHttpServletRequestWrapper.containsXss("onclick=hack()"));
        
        assertFalse(XssHttpServletRequestWrapper.containsXss("Normal text"));
        assertFalse(XssHttpServletRequestWrapper.containsXss(""));
        assertFalse(XssHttpServletRequestWrapper.containsXss(null));
    }
}
