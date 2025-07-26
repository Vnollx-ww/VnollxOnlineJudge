package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.common.result.Result;
import com.example.vnollxonlinejudge.model.dto.request.email.SendEmailRequest;
import com.example.vnollxonlinejudge.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/email")
public class EmailController {
    @Autowired
    private EmailService emailService;
    @PostMapping("/send")
    public Result<Void> sendEmail(@RequestBody SendEmailRequest req){
        emailService.sendEmail(req.getEmail(),req.getOption());
        return Result.Success("邮件验证码发送成功");
    }

}
