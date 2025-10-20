package com.example.vnollxonlinejudge.service;

import reactor.core.publisher.Flux;

public interface AiService {
    Flux<String> chat(Long userId, String message);
    void clearMemory(Long userId);
}
