package com.example.vnollxonlinejudge.model.dto.request.solve;

import lombok.Data;
import org.springframework.web.bind.annotation.RequestParam;
@Data
public class CreateSolveRequest {

    String content;
    String name;
    String pid;
    String title;
    String problemName;
}
