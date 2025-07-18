package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;
import lombok.Data;

@Table(name = "tag")
@Data
public class Tag {
    @Column(name = "name")
    private String name;

}
