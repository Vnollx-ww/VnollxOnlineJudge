package com.example.vnollxonlinejudge.model.vo.studentclass;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentClassStudentVo {
    private Long id;
    private String name;
    private String email;
    private String identity;
    private Long classId;
    private String className;
}
