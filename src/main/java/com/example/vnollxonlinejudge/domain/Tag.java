package com.example.vnollxonlinejudge.domain;

import jakarta.persistence.*;

@Table(name = "tags")
public class Tag {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;
    @Column(name = "name")
    private String name;

}
