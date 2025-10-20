package com.example.vnollxonlinejudge.service;

import reactor.core.publisher.Flux;

import java.util.List;

public interface AiService {
    Flux<String> chat(Long userId, String message);
    void clearMemory(Long userId);

    List<String> getMessageHistoryList(Long userId);
}
