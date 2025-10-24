package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.service.AiService;
import com.example.vnollxonlinejudge.utils.ApiCallUtil;
import dev.langchain4j.data.message.AiMessage;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.SystemMessage;
import dev.langchain4j.data.message.UserMessage;
import dev.langchain4j.memory.ChatMemory;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.StreamingResponseHandler;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.langchain4j.model.output.Response;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Flux;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger logger = LoggerFactory.getLogger(AiServiceImpl.class);
    private final OpenAiStreamingChatModel streamingModel;
    private final Map<Long, ChatMemory> userChatMemories;
    private final ApiCallUtil apiCallUtil;
    
    @Value("${server.port:8080}")
    private String serverPort;

    public AiServiceImpl(OpenAiStreamingChatModel streamingModel, ApiCallUtil apiCallUtil) {
        this.streamingModel = streamingModel;
        this.apiCallUtil = apiCallUtil;
        this.userChatMemories = new ConcurrentHashMap<>();
    }
    @Override
    public Flux<String> chat(Long userId, String message) {
        return Flux.create(sink -> {
            ChatMemory userMemory = userChatMemories.computeIfAbsent(
                    userId, k -> MessageWindowChatMemory.withMaxMessages(15)
            );

            // 如果是第一次对话，添加系统提示词
            if (userMemory.messages().isEmpty()) {
                String systemPrompt = buildSystemPrompt(userId);
                userMemory.add(SystemMessage.from(systemPrompt));
            }

            userMemory.add(UserMessage.from(message));
            List<ChatMessage> messages = userMemory.messages();
            StringBuilder fullResponse = new StringBuilder();
            final boolean[] hasApiCall = {false}; // 标志位，跟踪是否包含API调用

            streamingModel.generate(messages, new StreamingResponseHandler<>() {
                @Override
                public void onNext(String token) {
                    fullResponse.append(token);
                    
                    // 检查是否开始API调用（检测API调用相关关键词）
                    String currentResponse = fullResponse.toString();
                    if (currentResponse.contains("\"\"\"\"\"\"\"\"\"\"") || 
                        currentResponse.contains("我将调用") || 
                        currentResponse.contains("调用") ||
                        currentResponse.contains("API") ||
                        currentResponse.contains("查询您的") ||
                        currentResponse.contains("获取您的") ||
                        currentResponse.contains("系统API") ||
                        currentResponse.contains("[API_CALL]")) {
                        hasApiCall[0] = true;
                        return; // 不发送任何内容给用户
                    }
                    
                    // 只有在没有API调用时才发送token
                    if (!hasApiCall[0]) {
                        sink.next(token);
                    }
                }

                @Override
                public void onComplete(Response<AiMessage> response) {
                    String aiResponse = fullResponse.toString();
                    
                    // 检查AI是否请求调用API（检测API调用相关关键词）
                    if (aiResponse.contains("\"\"\"\"\"\"\"\"\"\"") || 
                        aiResponse.contains("我将调用") || 
                        aiResponse.contains("调用") ||
                        aiResponse.contains("API") ||
                        aiResponse.contains("查询您的") ||
                        aiResponse.contains("获取您的") ||
                        aiResponse.contains("系统API") ||
                        aiResponse.contains("[API_CALL]")) {
                        logger.info("检测到API调用请求: {}", aiResponse);
                        String apiResult = handleApiCall(aiResponse, userId);
                        logger.info("API调用结果: {}", apiResult);
                        
                        // 再次调用AI来处理API结果和用户问题
                        String finalResponse = processApiResultWithAi(userMemory, message, apiResult);
                        logger.info("AI处理后的最终回复: {}", finalResponse);
                        
                        // 发送最终回复（不发送AI的原始回复）
                        sink.next(finalResponse);
                        userMemory.add(AiMessage.from(finalResponse));
                    } else {
                        // 没有API调用，直接使用AI回复（已经在onNext中发送了）
                        userMemory.add(AiMessage.from(aiResponse));
                    }
                    
                    sink.next("[DONE]"); // 发送结束信号
                    sink.complete();
                }

                @Override
                public void onError(Throwable error) {
                    logger.error("流式对话错误 - 用户: {}", userId, error);
                    userChatMemories.remove(userId);
                    sink.next("[ERROR] " + error.getMessage()); // 发送错误信号
                    sink.complete();
                }
            });
        });
    }

    @Override
    public void clearMemory(Long userId) {
        userChatMemories.remove(userId);
    }

    @Override
    public List<String> getMessageHistoryList(Long userId) {
        ChatMemory userMemory = userChatMemories.get(userId);
        if (userMemory == null || userMemory.messages().isEmpty()) {
            return Collections.emptyList();
        }

        List<ChatMessage> messages = userMemory.messages();

        return messages.stream()
                .map(chatMessage -> {
                    String role = chatMessage instanceof UserMessage ? "用户" : "AI";
                    String content = getMessageContent(chatMessage);
                    return String.format("[%s] %s", role, content);
                })
                .collect(Collectors.toList());
    }
    private String getMessageContent(ChatMessage chatMessage) {
        if (chatMessage instanceof UserMessage) {
            return ((UserMessage) chatMessage).singleText();
        } else if (chatMessage instanceof AiMessage) {
            return ((AiMessage) chatMessage).text();
        } else if (chatMessage instanceof SystemMessage) {
            return "[系统]" + ((SystemMessage) chatMessage).text();
        }
        return chatMessage.toString();
    }

    private String buildSystemPrompt(Long userId) {
        return String.format("""
            你是一个智能助手，专门为在线判题系统VnollxOnlineJudge提供帮助。
            
            当前用户ID: %d
            
            你可以帮助用户：
            1. 正常聊天对话
            2. 查询用户信息、题目信息、提交记录等
            3. 查询比赛信息、排行榜等
            4. 解答编程问题
            
            当用户需要查询数据时，你可以调用以下API接口：
            
            ## 用户相关
            - GET /user/profile?uid={用户ID} - 查询当前用户信息（使用当前用户ID）
            - GET /user/list - 查询用户列表
            - GET /user/my-progress?uid={用户ID} - 查询用户在各个标签的提交代码次数和通过次数(可以用于生成算法水平报告和做题倾向)
            - GET /user/count?uid={用户ID} - 查询用户总数
            - GET /user/solved-problems?uid={用户ID} - 查询用户通过哪些题目
            
            ## 题目相关
            - GET /problem/get?name={题目名称} - 查询题目详情
            - GET /problem/tags?pid={题目ID} - 查询题目标签
            - GET /problem/list?keyword={关键字}&offset=0&size=10000 - 查询题目列表
            - GET /problem/count?keyword={关键字} - 查询题目数量
            
            ## 提交记录相关
            - GET /submission/get?id={提交ID} - 查询提交详情
            - GET /submission/list?uid={用户ID}&pageNum=1&pageSize=10000 - 查询用户提交记录
            - GET /submission/count?uid={用户ID} - 查询用户提交数量
            
            ## 比赛相关
            - GET /competition/list - 查询比赛列表
            - POST /competition/judgeIsOpen -(now字符串类型代表当前时间(格式 yyyy-mm-dd 00:00:00)，cid字符串类型代表比赛ID)
            - GET /competition/list-problem?id={比赛ID} - 查询比赛题目(重点:在查询题目之前先判断比赛是否进行中，如果进行中则不返回，防止用户作弊)
            - GET /competition/list-user?id={比赛ID} - 查询比赛用户
            - GET /competition/count - 查询比赛数量
            
            ## 其他
            - GET /tag/list - 查询标签列表
            - GET /solve/list?pid={题目ID} - 查询题解列表
            - GET /notification/count?uid={用户ID} - 查询通知数量
            - GET /notification/list?uid={用户ID}&pageNum=1&pageSize=10000&keyword={关键字}&status={"true"or"false"字符串类型} - 查询通知列表
            
            调用API时，请使用以下格式：
            先输出10个空字符（连续10个双引号），然后使用
            [API_CALL]GET:http://localhost:%s/接口路径?参数1=值1&参数2=值2[API_CALL]
            或
            [API_CALL]POST:http://localhost:%s/接口路径:{"请求体JSON"}[API_CALL]

            注意事项：
            1. 系统会自动为所有API调用添加token参数，你不需要手动添加
            2. 【重要】给所有API调用添加uid参数使用当前用户ID: %d
            3. 如果不需要调用API，直接回复用户问题即可
            4. 如果需要调用API，使用上述格式，系统会自动处理API结果并生成最终回复
            5. 对于编程问题，请提供具体的代码示例和解释
            6. API调用格式必须严格按照上述格式，不要包含额外的token参数

            ## API调用格式示例（必须严格遵循）：
            查询用户信息：GET:http://localhost:%s/user/profile?uid=%d
            查询题目详情：GET:http://localhost:%s/problem/get?name={题目名称}
            查询提交记录：GET:http://localhost:%s/submission/list?uid=%d&pageNum=1&pageSize=10

            ## 特别提醒：
            - 当前用户ID是: %d
            - 所有需要用户ID的API调用都必须包含 uid=%d 参数
            - 不要忘记添加uid参数，否则API调用会失败
            - 系统会自动处理API调用结果，你只需要决定是否需要调用API
                """, userId, serverPort, serverPort, userId, serverPort,userId, serverPort, serverPort,userId,userId, userId);
    }

    /**
     * 使用AI处理API调用结果，结合用户问题生成最终回复
     */
    private String processApiResultWithAi(ChatMemory userMemory, String userQuestion, String apiResult) {
        try {
            // 构建处理API结果的提示词
            String apiProcessingPrompt = String.format("""
            用户问题：%s
            API调用结果：%s
    
            请根据用户的问题和API调用结果，生成简洁、准确且可爱的回复。
    
            **重要规则：**
            1. 不要调用任何API，只处理已有的API结果
            2. 不要使用[API_CALL]格式
            3. 只回答用户问题的直接答案
            4. 回复要简洁友好，使用可爱活泼的语气
            5. 不要显示JSON格式或API调用信息
    
            **可爱的语气要求：**
            - 使用表情符号 😊✨🌟📚💻
            - 语气亲切自然，像朋友聊天一样
            - 可以适当使用"呀"、"呢"、"啦"、"哦"等语气词
            - 对好的结果要给予鼓励和赞美
            - 保持积极向上的态度
    
            **示例：**
            - 用户问"我叫什么名字"，API返回{"name":"Vnollx"}，你应该回复：你的名字是Vnollx呀～真是个酷酷的名字呢！😊
            - 用户问"我的邮箱是什么"，API返回{"email":"test@qq.com"}，你应该回复：你的邮箱是test@qq.com哦～记得常检查邮件啦！💌
            - 用户问"我提交了多少题"，API返回{"submitCount":34}，你应该回复：哇！你已经提交了34题啦！继续加油，编程小能手！🌟
            - 用户问"我有多少未读通知"，API返回{"count":0}，你应该回复：太棒啦！你的通知箱空空如也，继续保持哦！✨
            - 用户问"这道题难吗"，API返回{"difficulty":"中等"}，你应该回复：这道题难度是中等呢～相信你一定能搞定！加油！💪
    
            现在请根据用户问题和API结果生成一个可爱友好的回复：
            """, userQuestion, apiResult);
            
            // 创建临时消息列表用于AI处理
            List<ChatMessage> processingMessages = List.of(
                SystemMessage.from("你是一个智能助手，专门处理API调用结果并生成用户友好的回复。你只能处理已有的API结果，不能调用新的API。"),
                UserMessage.from(apiProcessingPrompt)
            );
            
            // 使用CompletableFuture来处理异步调用
            final StringBuilder responseBuilder = new StringBuilder();
            final CompletableFuture<String> future = new CompletableFuture<>();
            
            streamingModel.generate(processingMessages, new StreamingResponseHandler<>() {
                @Override
                public void onNext(String token) {
                    responseBuilder.append(token);
                }

                @Override
                public void onComplete(Response<AiMessage> response) {
                    future.complete(responseBuilder.toString());
                }

                @Override
                public void onError(Throwable error) {
                    future.completeExceptionally(error);
                }
            });
            
            // 等待异步调用完成
            String finalResponse = future.get();
            
            logger.info("AI处理API结果完成，用户问题: {}, API结果: {}, 最终回复: {}", 
                       userQuestion, apiResult, finalResponse);
            
            return finalResponse;
        } catch (Exception e) {
            logger.error("AI处理API结果失败: {}", e.getMessage());
            return "抱歉，处理您的问题时出现了错误，请稍后重试。";
        }
    }

    private String handleApiCall(String aiResponse, Long userId) {
        try {
            logger.info("开始处理API调用，用户ID: {}, 响应内容: {}", userId, aiResponse);
            
            // 提取API调用信息
            String apiCallPattern = "\\[API_CALL\\](.*?)\\[API_CALL\\]";
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile(apiCallPattern);
            java.util.regex.Matcher matcher = pattern.matcher(aiResponse);
            
            if (matcher.find()) {
                String apiCall = matcher.group(1);
                logger.info("提取到API调用: {}", apiCall);
                String[] parts = apiCall.split(":", 2);
                
                if (parts.length >= 2) {
                    String method = parts[0].trim();
                    String urlAndBody = parts[1].trim();
                    
                    // 检查URL是否已经包含token参数
                    String url = urlAndBody;
                    if (!urlAndBody.contains("token=")) {
                        if (urlAndBody.contains("?")) {
                            url += "&token=Vnollx-Ai-Agent";
                        } else {
                            url += "?token=Vnollx-Ai-Agent";
                        }
                    }
                    
                    logger.info("最终请求URL: {}", url);
                    String result;
                    if ("GET".equals(method)) {
                        result = apiCallUtil.get(url, null);
                    } else if ("POST".equals(method)) {
                        // 解析POST请求体
                        String[] urlBodyParts = urlAndBody.split(":", 2);
                        if (urlBodyParts.length == 2) {
                            String requestUrl = urlBodyParts[0];
                            String requestBody = urlBodyParts[1];
                            
                            // 检查URL是否已经包含token参数
                            if (!requestUrl.contains("token=")) {
                                if (requestUrl.contains("?")) {
                                    requestUrl += "&token=Vnollx-Ai-Agent";
                                } else {
                                    requestUrl += "?token=Vnollx-Ai-Agent";
                                }
                            }
                            
                            result = apiCallUtil.post(requestUrl, requestBody);
                        } else {
                            // 如果没有请求体，只有URL，则使用GET方法
                            result = apiCallUtil.get(url, null);
                        }
                    } else {
                        result = "{\"code\":400,\"msg\":\"不支持的HTTP方法: " + method + "\",\"data\":null}";
                    }
                    
                    // 提取data字段
                    if (apiCallUtil.isSuccess(result)) {
                        return apiCallUtil.extractData(result);
                    } else {
                        return result;
                    }
                }
            }
            
            return "API调用格式错误";
        } catch (Exception e) {
            logger.error("处理API调用失败: {}", e.getMessage());
            return "{\"code\":500,\"msg\":\"API调用处理失败: " + e.getMessage() + "\",\"data\":null}";
        }
    }
}
