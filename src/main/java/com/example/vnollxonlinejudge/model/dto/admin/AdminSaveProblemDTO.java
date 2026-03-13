package com.example.vnollxonlinejudge.model.dto.admin;

import com.alibaba.fastjson.JSON;
import jakarta.validation.constraints.*;
import lombok.Data;
import org.springframework.web.multipart.MultipartFile;

import java.util.Collections;
import java.util.List;

@Data
public class AdminSaveProblemDTO {
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

    /** 多组样例，表单传入时为 JSON 字符串，如 [{"input":"...","output":"...","sortOrder":0}] */
    private String examples;

    /** 兼容：单组输入样例（当 examples 为空时使用） */
    private String inputExample;

    /** 兼容：单组输出样例（当 examples 为空时使用） */
    private String outputExample;

    /** 解析 examples JSON 为列表，供业务层使用 */
    public List<ProblemExampleItemDTO> getExamplesList() {
        if (examples == null || examples.trim().isEmpty()) {
            return Collections.emptyList();
        }
        try {
            List<ProblemExampleItemDTO> list = JSON.parseArray(examples, ProblemExampleItemDTO.class);
            return list != null ? list : Collections.emptyList();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private String hint;

    @NotBlank(message = "开放状态不能为空")
    @Pattern(regexp = "^(true|false|0|1)$", message = "开放状态格式不正确")
    private String open;

    /** 新建时必传，更新时可选（不传则保留原测试数据） */
    private MultipartFile testCaseFile;
    private List<String> tags;
}
