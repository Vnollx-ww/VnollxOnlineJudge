package com.example.vnollxonlinejudge.utils;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.Map;

@Component
public class ApiCallUtil {
    private static final Logger logger = LoggerFactory.getLogger(ApiCallUtil.class);
    private static final String AI_TOKEN = "Vnollx-Ai-Agent";
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Autowired
    private ObjectMapper objectMapper;
    
    /**
     * GET请求调用API
     */
    public String get(String endpoint, Map<String, String> params) {
        try {
            HttpHeaders headers = new HttpHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);
            
            UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(endpoint);
            if (params != null) {
                params.forEach(builder::queryParam);
            }
            
            String url = builder.toUriString();
            logger.debug("调用API GET: {}", url);
            
            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, String.class);
            
            return response.getBody();
        } catch (Exception e) {
            logger.error("API调用失败 GET {}: {}", endpoint, e.getMessage());
            return "{\"code\":500,\"msg\":\"API调用失败: " + e.getMessage() + "\",\"data\":null}";
        }
    }
    
    /**
     * POST请求调用API
     */
    public String post(String endpoint, Object requestBody) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            
            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);
            
            logger.debug("调用API POST: {} 请求体: {}", endpoint, jsonBody);
            
            ResponseEntity<String> response = restTemplate.exchange(
                endpoint, HttpMethod.POST, entity, String.class);
            
            return response.getBody();
        } catch (Exception e) {
            logger.error("API调用失败 POST {}: {}", endpoint, e.getMessage());
            return "{\"code\":500,\"msg\":\"API调用失败: " + e.getMessage() + "\",\"data\":null}";
        }
    }
    
    /**
     * 解析API响应，提取data字段
     */
    public String extractData(String response) {
        try {
            JsonNode jsonNode = objectMapper.readTree(response);
            JsonNode dataNode = jsonNode.get("data");
            if (dataNode != null) {
                return dataNode.toString();
            }
            return response;
        } catch (Exception e) {
            logger.error("解析API响应失败: {}", e.getMessage());
            return response;
        }
    }
    
    /**
     * 检查API响应是否成功
     */
    public boolean isSuccess(String response) {
        try {
            JsonNode jsonNode = objectMapper.readTree(response);
            JsonNode codeNode = jsonNode.get("code");
            return codeNode != null && codeNode.asInt() == 200;
        } catch (Exception e) {
            return false;
        }
    }
}
