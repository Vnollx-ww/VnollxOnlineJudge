package com.example.vnollxonlinejudge.model.vo.studentclass;

import com.example.vnollxonlinejudge.model.entity.StudentClass;
import lombok.Data;

import java.util.List;

@Data
public class StudentClassVo {
    private Long id;
    private String className;
    private Long teacherId;
    private String teacherName;
    private String createTime;
    private Integer studentCount;
    private List<Long> studentIds;

    public StudentClassVo() {
    }

    public StudentClassVo(StudentClass studentClass) {
        this.id = studentClass.getId();
        this.className = studentClass.getClassName();
        this.teacherId = studentClass.getTeacherId();
        this.createTime = studentClass.getCreateTime();
    }
}
