package com.example.vnollxonlinejudge.model.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminSaveDictDataDTO {
    private Long id;
    private String dictType;
    private String dictLabel;
    private String dictValue;
    private Integer sort;
    private String cssClass;
    private String listClass;
    private Integer isDefault;
    private Integer status;
    private String remark;
}
