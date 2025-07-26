package com.example.vnollxonlinejudge.model.dto.request.admin;

import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data
public class AdminSaveProblemRequest {
    private Long id;
    @NotBlank(message = "题目标题不能为空")
    @Size(max = 255, message = "题目标题长度不能超过255个字符")
    private String title;

    @NotBlank(message = "题目描述不能为空")
    private String description;

    @NotNull(message = "时间限制不能为空")
    @Min(value = 1, message = "时间限制必须大于0")
    @Max(value = 10000, message = "时间限制不能超过10000ms")
    private String timeLimit;

    @NotNull(message = "内存限制不能为空")
    @Min(value = 1, message = "内存限制必须大于0")
    @Max(value = 512, message = "内存限制不能超过512MB")
    private String memoryLimit;

    @NotBlank(message = "难度等级不能为空")
    @Pattern(regexp = "^(简单|中等|困难|Easy|Medium|Hard)$", message = "难度等级格式不正确")
    private String difficulty;

    @NotBlank(message = "输入格式不能为空")
    private String inputFormat;

    @NotBlank(message = "输出格式不能为空")
    private String outputFormat;

    @NotBlank(message = "输入样例不能为空")
    private String inputExample;

    @NotBlank(message = "输出样例不能为空")
    private String outputExample;

    private String hint;

    @NotBlank(message = "开放状态不能为空")
    @Pattern(regexp = "^(true|false|0|1)$", message = "开放状态格式不正确")
    private String open;

    @NotNull(message = "测试用例文件不能为空")
    private MultipartFile testCaseFile;
    private List<String> tags;
}
