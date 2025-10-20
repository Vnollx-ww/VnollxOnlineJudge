package com.example.vnollxonlinejudge.filter;

import com.example.vnollxonlinejudge.model.base.RedisKeyType;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.utils.JwtToken;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.Setter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Component
@Order(1)
public class TokenFilter implements Filter {
    private static final Logger logger = LoggerFactory.getLogger(TokenFilter.class);
    private static final String AUTH_HEADER = "Authorization";
    private static final String TOKEN_PREFIX = "Bearer ";
    private static final String[] EXCLUDED_PATHS = {
            "/user/login",
            "/user/register",
            "/user/forget",
            "/problem/\\d+",
            "/problem/count",
            "/user/count",
            "/competition/count",
            "/submission/count",
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
    private final RedisService redisService;
    @Autowired
    public TokenFilter(RedisService redisService){
        this.redisService=redisService;
    }

    @Override
    public void doFilter(ServletRequest servletRequest, ServletResponse servletResponse, FilterChain filterChain)
            throws IOException {
        HttpServletRequest request = (HttpServletRequest) servletRequest;
        HttpServletResponse response = (HttpServletResponse) servletResponse;
        String requestURI = request.getRequestURI();
        
        try {

            for (String path : EXCLUDED_PATHS) {
                if (path.contains("\\d+")) {
                    if (requestURI.matches("^" + path.replace("\\d+", "\\d+") + "$")) {
                        filterChain.doFilter(request, response);
                        return;
                    }
                } else if (requestURI.startsWith(path)) {
                    filterChain.doFilter(request, response);
                    return;
                }
            }
            String token = null;

            // 从URL参数获取token
            String queryString = request.getQueryString();
            if (queryString != null) {
                String[] params = queryString.split("&");
                for (String param : params) {
                    String[] keyValue = param.split("=");
                    if (keyValue.length == 2 && "token".equals(keyValue[0])) {
                        token = keyValue[1];
                        break;
                    }
                }
            }
            // 从请求头获取token
            if (token == null) {
                String authHeader = request.getHeader(AUTH_HEADER);
                if (authHeader != null && authHeader.startsWith(TOKEN_PREFIX)) {
                    token = authHeader.substring(TOKEN_PREFIX.length());
                }
            }
            // 检查token是否为空
            if (token == null || token.trim().isEmpty()) {
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().println("不是哥们，token呢？");
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

            String key= null;
            if (userId != null) {
                key = RedisKeyType.LOGOUT.generateKey(Long.parseLong(userId));
            }
            if (redisService.IsExists(key)){
                redisService.deleteKey(key);
                redisService.setKey(token,"",86400L);
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                response.getWriter().println("无效的Token");
                return;
            }
            
            request.setAttribute("uid", userId);
            request.setAttribute("identity", identity);
            
            // 设置ThreadLocal，方便Service层使用
            if (userId != null) {
                UserContextHolder.setCurrentUserId(Long.parseLong(userId));
            }
            if (identity != null) {
                UserContextHolder.setCurrentUserIdentity(identity);
            }
            
            // Allow the request to proceed
            filterChain.doFilter(request, response);
        } catch (Exception e) {
            // 记录异常日志
            logger.error("TokenFilter处理请求时发生异常: {}", requestURI, e);
            response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
            response.getWriter().println("服务器内部错误");
        } finally {
            // 确保ThreadLocal被清理，避免内存泄漏
            try {
                UserContextHolder.clear();
            } catch (Exception e) {
                logger.error("清理UserContextHolder时发生异常", e);
            }
        }
    }
}