package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.config.EmailConfig;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.judge.JudgeStrategyFactory;
import com.example.vnollxonlinejudge.model.entity.User;
import com.example.vnollxonlinejudge.producer.SubmissionProducer;
import com.example.vnollxonlinejudge.service.EmailService;
import com.example.vnollxonlinejudge.service.RedisService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.CaptchaGenerator;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
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
        return "<!DOCTYPE html>" +
                "<html>" +
                "<head>" +
                "    <meta charset=\"UTF-8\">" +
                "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">" +
                "    <title>Vnollx - 验证码</title>" +
                "    <style>" +
                "        * { margin: 0; padding: 0; box-sizing: border-box; }" +
                "        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a202c; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; }" +
                "        .email-wrapper { max-width: 600px; margin: 0 auto; }" +
                "        .container { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15); }" +
                "        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center; position: relative; overflow: hidden; }" +
                "        .header::before { content: ''; position: absolute; top: -50%; right: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%); animation: pulse 15s ease-in-out infinite; }" +
                "        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } }" +
                "        .logo { font-size: 32px; font-weight: 700; color: white; margin-bottom: 8px; position: relative; z-index: 1; letter-spacing: 1px; text-shadow: 2px 2px 4px rgba(0,0,0,0.2); }" +
                "        .tagline { color: rgba(255,255,255,0.95); font-size: 14px; position: relative; z-index: 1; font-weight: 500; }" +
                "        .content { padding: 40px 30px; }" +
                "        .greeting { font-size: 24px; font-weight: 600; color: #2d3748; margin-bottom: 20px; }" +
                "        .greeting::after { content: ''; display: block; width: 60px; height: 3px; background: linear-gradient(90deg, #667eea, #764ba2); margin-top: 12px; border-radius: 2px; }" +
                "        .message { font-size: 15px; color: #4a5568; margin-bottom: 15px; line-height: 1.8; }" +
                "        .action-text { color: #667eea; font-weight: 600; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }" +
                "        .code-section { margin: 35px 0; text-align: center; }" +
                "        .code-label { font-size: 13px; color: #718096; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 1px; font-weight: 600; }" +
                "        .code-container { display: inline-block; position: relative; }" +
                "        .code { background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 12px; padding: 20px 40px; font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #2d3748; border: 2px solid #e2e8f0; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1); position: relative; z-index: 1; }" +
                "        .code::before { content: ''; position: absolute; top: -2px; left: -2px; right: -2px; bottom: -2px; background: linear-gradient(135deg, #667eea, #764ba2); border-radius: 12px; z-index: -1; opacity: 0; transition: opacity 0.3s; }" +
                "        .expiry { font-size: 13px; color: #718096; margin-top: 12px; font-weight: 500; }" +
                "        .expiry-time { color: #e53e3e; font-weight: 700; }" +
                "        .warning-box { background: linear-gradient(135deg, #fffaf0 0%, #fef5e7 100%); padding: 18px 20px; border-radius: 10px; border-left: 4px solid #f6ad55; margin: 30px 0; display: flex; align-items: start; gap: 12px; box-shadow: 0 2px 8px rgba(246, 173, 85, 0.1); }" +
                "        .warning-icon { font-size: 20px; flex-shrink: 0; margin-top: 2px; }" +
                "        .warning-content { flex: 1; }" +
                "        .warning-title { font-weight: 700; color: #c05621; margin-bottom: 6px; font-size: 14px; }" +
                "        .warning-text { font-size: 13px; color: #744210; line-height: 1.6; }" +
                "        .divider { height: 1px; background: linear-gradient(90deg, transparent, #e2e8f0, transparent); margin: 30px 0; }" +
                "        .info-box { background: #f7fafc; padding: 15px 20px; border-radius: 10px; font-size: 14px; color: #4a5568; border: 1px solid #e2e8f0; }" +
                "        .footer { background: linear-gradient(180deg, #f8fafc 0%, #edf2f7 100%); padding: 30px; text-align: center; }" +
                "        .footer-text { font-size: 13px; color: #718096; margin-bottom: 8px; line-height: 1.6; }" +
                "        .footer-links { margin-top: 15px; }" +
                "        .footer-link { color: #667eea; text-decoration: none; margin: 0 10px; font-weight: 500; font-size: 12px; }" +
                "        .social-icons { margin-top: 15px; }" +
                "        .social-icon { display: inline-block; width: 32px; height: 32px; margin: 0 6px; background: white; border-radius: 50%; line-height: 32px; color: #667eea; text-decoration: none; box-shadow: 0 2px 8px rgba(0,0,0,0.05); transition: transform 0.2s; }" +
                "    </style>" +
                "</head>" +
                "<body>" +
                "    <div class=\"email-wrapper\">" +
                "        <div class=\"container\">" +
                "            <div class=\"header\">" +
                "                <div class=\"logo\">✨ Vnollx OJ</div>" +
                "                <div class=\"tagline\">在线编程评测系统</div>" +
                "            </div>" +
                "            " +
                "            <div class=\"content\">" +
                "                <div class=\"greeting\">您的验证码</div>" +
                "                " +
                "                <p class=\"message\">尊敬的用户，您好！👋</p>" +
                "                <p class=\"message\">您正在进行 <span class=\"action-text\">" + action + "</span> 操作。</p>" +
                "                " +
                "                <div class=\"code-section\">" +
                "                    <div class=\"code-label\">验证码</div>" +
                "                    <div class=\"code-container\">" +
                "                        <div class=\"code\">" + verificationCode + "</div>" +
                "                    </div>" +
                "                    <div class=\"expiry\">有效期：<span class=\"expiry-time\">1分钟</span></div>" +
                "                </div>" +
                "                " +
                "                <div class=\"warning-box\">" +
                "                    <div class=\"warning-icon\">🔒</div>" +
                "                    <div class=\"warning-content\">" +
                "                        <div class=\"warning-title\">安全提示</div>" +
                "                        <div class=\"warning-text\">请不要将验证码透露给任何人，包括自称是 Vnollx 工作人员的人。我们不会主动向您索要验证码。</div>" +
                "                    </div>" +
                "                </div>" +
                "                " +
                "                <div class=\"divider\"></div>" +
                "                " +
                "                <div class=\"info-box\">" +
                "                    💡 如果您没有进行此操作，请忽略本邮件或立即联系我们的支持团队以确保账户安全。" +
                "                </div>" +
                "            </div>" +
                "            " +
                "            <div class=\"footer\">" +
                "                <p class=\"footer-text\">© 2025 Vnollx 在线评测系统 · 保留所有权利</p>" +
                "                <p class=\"footer-text\">此邮件由系统自动发送，请勿直接回复</p>" +
                "                <div class=\"footer-links\">" +
                "                    <a href=\"#\" class=\"footer-link\">帮助中心</a>" +
                "                    <span style=\"color: #cbd5e0;\">|</span>" +
                "                    <a href=\"#\" class=\"footer-link\">联系我们</a>" +
                "                    <span style=\"color: #cbd5e0;\">|</span>" +
                "                    <a href=\"#\" class=\"footer-link\">隐私政策</a>" +
                "                </div>" +
                "            </div>" +
                "        </div>" +
                "    </div>" +
                "</body>" +
                "</html>";
    }
}
