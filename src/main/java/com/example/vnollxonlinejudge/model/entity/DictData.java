package com.example.vnollxonlinejudge.model.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@TableName("dict_data")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DictData {
    @TableId(type = IdType.AUTO)
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
    private String createBy;
    private LocalDateTime createTime;
    private String updateBy;
    private LocalDateTime updateTime;
}
