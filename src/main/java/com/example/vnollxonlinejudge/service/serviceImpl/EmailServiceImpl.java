package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.config.EmailConfig;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.service.EmailService;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.CaptchaGenerator;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Objects;

@Service
public class EmailServiceImpl implements EmailService {
    private final RedisService redisService;
    private final UserService userService;
    private final EmailConfig emailConfig;

    @Autowired
    public EmailServiceImpl(
            RedisService redisService,
            UserService userService,
            EmailConfig emailConfig
    ) {
        this.redisService=redisService;
        this.userService=userService;
        this.emailConfig=emailConfig;
    }
    @Override
    public void sendEmail(String email, String option) {
        try {
            if (Objects.equals(option, "forget")){
                User user=userService.getUserByEmail(email);
                if (user==null){
                    throw new BusinessException("该邮箱不存在");
                }
            }else if (Objects.equals(option,"update")){
                User user=userService.getUserByEmail(email);
                if (user!=null){
                    throw new BusinessException("该邮箱已存在");
                }
            }
            String key=email+":"+option;
            if (redisService.IsExists(key)){
                throw new BusinessException("请勿频繁点击发送验证码");
            }
            HtmlEmail mail = new HtmlEmail(); // 使用HtmlEmail支持富文本

            // 1. 配置邮件服务器连接
            mail.setHostName(emailConfig.getHostName());
            mail.setSmtpPort(emailConfig.getSmtpPost());
            if (System.getenv("EMAIL_PASSWORD") != null) {
                mail.setAuthentication(emailConfig.getUserName(), System.getenv("EMAIL_PASSWORD"));
            } else {
                mail.setAuthentication(emailConfig.getUserName(), emailConfig.getPassword());
            }
            mail.setCharset("UTF-8");
            // 2. 配置SSL/TLS安全连接
            mail.setSSLOnConnect(true);
            mail.setSSLCheckServerIdentity(true);
            System.setProperty("mail.smtp.ssl.protocols", "TLSv1.2");
            System.setProperty("mail.smtp.ssl.ciphersuites", "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256");

            // 3. 生成验证码并存储
            String verificationCode = CaptchaGenerator.generateCode();
            redisService.setKey(key,verificationCode,60L);

            // 4. 设置邮件基本信息
            mail.setFrom(emailConfig.getUserName(), "Vnollx在线评测系统");
            mail.addTo(email);

            // 根据操作类型设置主题和内容
            String subject ;
            String action = switch (option) {
                case "register" -> {
                    subject = "【Vnollx】注册账号验证码";
                    yield "注册账号";
                }
                case "forget" -> {
                    subject = "【Vnollx】重置密码验证码";
                    yield "重置密码";
                }
                case "update" -> {
                    subject = "【Vnollx】修改邮箱验证码";
                    yield "修改邮箱";
                }
                default -> throw new BusinessException("未知的邮件类型");
            };

            mail.setSubject(subject);

            // 5. 构建HTML格式的邮件内容
            String htmlContent = buildHtmlContent(verificationCode, action);
            mail.setHtmlMsg(htmlContent);

            // 6. 发送邮件
            mail.send();
        } catch (EmailException e) {
            System.err.println("邮件发送失败: " + e.getMessage());
            throw new BusinessException("邮件发送失败");
        }
    }

    private String buildHtmlContent(String verificationCode, String action) {
        StringBuilder html = new StringBuilder();
        html.append("<!DOCTYPE html><html><head><meta charset=\"UTF-8\">");
        html.append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">");
        html.append("<style>");
        // 1. 全局样式：高明度、空气感
        html.append("* { margin: 0; padding: 0; box-sizing: border-box; }");
        html.append("body { font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; background-color: #F4F7FA; padding: 40px 20px; }");
        
        // 2. 邮件容器：极致圆角 + 微弱弥散阴影
        html.append(".email-card { max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.04); border: 1px solid #E6F0F7; }");
        
        // 3. 头部：清爽的淡蓝灰
        html.append(".header { background-color: #E6F0F7; padding: 35px 30px; text-align: center; }");
        html.append(".logo { font-size: 24px; font-weight: 900; color: #5A6B7C; letter-spacing: -0.5px; }");
        html.append(".tagline { font-size: 12px; color: #8A9BA8; margin-top: 4px; text-transform: uppercase; letter-spacing: 2px; }");
        
        // 4. 主体内容
        html.append(".content { padding: 40px 35px; }");
        html.append(".greeting { font-size: 18px; font-weight: 600; color: #5A6B7C; margin-bottom: 12px; }");
        html.append(".text { font-size: 14px; color: #718096; line-height: 1.8; margin-bottom: 25px; }");
        html.append(".highlight { color: #5A6B7C; font-weight: bold; border-bottom: 2px solid #E6F0F7; }");
        
        // 5. 验证码区域：扁平化、哑光感
        html.append(".code-box { background-color: #F9FBFF; border: 1px dashed #D1DDEB; border-radius: 16px; padding: 25px; text-align: center; margin: 30px 0; }");
        html.append(".code-label { font-size: 11px; color: #A0AEC0; margin-bottom: 10px; font-weight: bold; letter-spacing: 1px; }");
        html.append(".code-value { font-size: 32px; font-weight: 800; color: #5A6B7C; letter-spacing: 6px; }");
        html.append(".expiry { font-size: 12px; color: #A0AEC0; margin-top: 10px; }");
        
        // 6. 安全提示：软边框
        html.append(".safety-tip { background-color: #FFFBF0; border-radius: 12px; padding: 15px; font-size: 12px; color: #9B8D6F; border: 1px solid #F3EBD3; line-height: 1.6; }");
        
        // 7. 页脚
        html.append(".footer { padding: 30px; text-align: center; border-top: 1px solid #F4F7FA; background-color: #FAFCFF; }");
        html.append(".footer-text { font-size: 11px; color: #B2BDC9; line-height: 2; }");
        html.append("</style></head><body>");
        
        html.append("<div class=\"email-card\">");
        html.append("  <div class=\"header\">");
        html.append("    <div class=\"logo\">Vnollx OnlineJudge</div>");
        html.append("    <div class=\"tagline\">System Verification</div>");
        html.append("  </div>");
        
        html.append("  <div class=\"content\">");
        html.append("    <div class=\"greeting\">你好, 用户 👋</div>");
        html.append("    <p class=\"text\">你正在请求进行 <span class=\"highlight\">").append(action).append("</span> 操作。为了保护你的账户安全，请使用下方的验证码：</p>");
        
        html.append("    <div class=\"code-box\">");
        html.append("      <div class=\"code-label\">VERIFICATION CODE</div>");
        html.append("      <div class=\"code-value\">").append(verificationCode).append("</div>");
        html.append("      <div class=\"expiry\">该验证码将在 <span style=\"color:#E53E3E\">1分钟</span> 后失效</div>");
        html.append("    </div>");
        
        html.append("    <div class=\"safety-tip\">");
        html.append("      💡 <b>安全提醒：</b>工作人员不会向你索要验证码。如果这不是你本人操作，请忽略此邮件或修改密码。");
        html.append("    </div>");
        html.append("  </div>");
        
        html.append("  <div class=\"footer\">");
        html.append("    <p class=\"footer-text\">© 2026 Vnollx OJ · 极简编程评测平台</p>");
        html.append("    <p class=\"footer-text\">此为系统自动发送邮件，请勿直接回复</p>");
        html.append("  </div>");
        html.append("</div>");
        
        html.append("</body></html>");
        return html.toString();
    }
}
