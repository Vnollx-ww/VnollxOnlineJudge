package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSaveDictTypeDTO {
    private Long id;
    private String dictName;
    private String dictType;
    private Integer status;
    private String remark;
}
