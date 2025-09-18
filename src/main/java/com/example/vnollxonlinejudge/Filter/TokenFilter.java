package com.example.vnollxonlinejudge.Filter;

import com.example.vnollxonlinejudge.utils.JwtToken;
import jakarta.servlet.*;
import jakarta.servlet.annotation.WebFilter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;

@WebFilter(filterName = "TokenFilter", urlPatterns = {
        "/user/*", "/problem/*","/submission/*","/solve/*",
        "/competition/*","/judge/*","/admin/*","/tag/*",
        "/notification/*","/comment/*"
})
public class TokenFilter implements Filter {
    private static final String AUTH_HEADER = "Authorization";
    private static final String TOKEN_PREFIX = "Bearer ";
    private static final String[] EXCLUDED_PATHS = {
            "/user/login",
            "/user/register",
            "/user/forget",
            "/problem/\\d+",
            "/user/\\d+",
            "/submission/\\d+",
            "/solve/\\d+",
            "/solve/list/\\d+",
            "/competition/\\d+",
            "/competition/problem/\\d+/\\d+",
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
        // System.out.println("TokenFilter 处理请求: " + requestURI);
        // Check for excluded paths
        for (String path : EXCLUDED_PATHS) {
            if (path.contains("\\d+")) {
                // Handle dynamic route matching
                if (requestURI.matches("^" + path.replace("\\d+", "\\d+") + "$")) {
                    filterChain.doFilter(request, response);
                    return;
                }
            } else if (requestURI.startsWith(path)) {
                // If it's an excluded path, let it pass
                filterChain.doFilter(request, response);
                return;
            }
        }

        // Get token from Authorization header
        String authHeader = request.getHeader(AUTH_HEADER);
        if (authHeader == null || !authHeader.startsWith(TOKEN_PREFIX)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("不是哥们都不传token，你还想访问？");
            return;
        }

        // Extract the token
        String token = authHeader.substring(TOKEN_PREFIX.length());

        // Check if token is empty
        if (token.trim().isEmpty()) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("Token是空的，哥们");
            return;
        }

        // Validate Token
        if (!JwtToken.validateToken(token)) {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.getWriter().println("无效的Token");
            return;
        }

        // Parse user ID
        String userId = JwtToken.getUserIdFromToken(token);
        String identity= JwtToken.getUserIdentityFromToken(token);
        request.setAttribute("uid", userId);
        request.setAttribute("identity",identity);
        // Allow the request to proceed
        filterChain.doFilter(request, response);
    }
}