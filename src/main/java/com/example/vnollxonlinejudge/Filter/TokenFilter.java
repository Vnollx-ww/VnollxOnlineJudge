package com.example.vnollxonlinejudge.Filter;

import com.example.vnollxonlinejudge.utils.Jwt;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter(filterName = "TokenFilter", urlPatterns = {"/user/*", "/problem/*","/submission/*","/solve/*","/competition/*"})
public class TokenFilter implements Filter {
    private static final String TOKEN_PARAM = "token";
    private static final String[] EXCLUDED_PATHS = {
            "/user/login",
            "/user/register",
            "/problem/\\d+",
            "/user/\\d+",
            "/submission/\\d+",
            "/solve/\\d+",
            "/solve/list/\\d+",
            "/competition/\\d+",
            "/competition/problem/\\d+/\\d+", // 新增路径
            "/competition/ranklist/\\d+",
            "/competition/submission/\\d+",
            "/solve/publish/\\d+"
    };

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        String requestURI = request.getRequestURI();
        for (String path : EXCLUDED_PATHS) {
            if (path.contains("\\d+")) {
                // 处理动态路由匹配
                if (requestURI.matches("^" + path.replace("\\d+", "\\d+") + "$")) {
                    filterChain.doFilter(request, response);
                    return;
                }
            } else if (requestURI.startsWith(path)) {
                // 如果是排除路径，直接放行
                filterChain.doFilter(request, response);
                return;
            }
        }

        // 从 form-data 中获取 Token
        String token = request.getParameter(TOKEN_PARAM);

        // 检查 Token 是否存在或为空
        if (token == null || token.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("未找到token");
            return;
        }

        // 验证 Token 有效性
        if (!Jwt.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("无效token");
            return;
        }

        // 解析用户 ID
        String userId = Jwt.getUserIdFromToken(token);
        request.setAttribute("uid", userId);

        // 允许请求继续处理
        filterChain.doFilter(request, response);
    }
}