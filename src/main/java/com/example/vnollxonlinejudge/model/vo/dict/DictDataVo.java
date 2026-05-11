package com.example.vnollxonlinejudge.model.vo.dict;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DictDataVo {
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
    private LocalDateTime createTime;
    private LocalDateTime updateTime;
}
