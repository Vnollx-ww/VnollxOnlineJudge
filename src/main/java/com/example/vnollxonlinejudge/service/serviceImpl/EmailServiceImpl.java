package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.config.EmailConfig;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.model.entity.User;
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
@Setter
public class EmailServiceImpl implements EmailService {
    @Autowired private RedisService redisService;
    @Autowired private UserService userService;
    @Autowired private EmailConfig emailConfig;
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
                "    <title>Vnollx - 验证码</title>" +
                "    <style>" +
                "        body { font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #444; margin: 0; padding: 0; background-color: #f5f7fa; }" +
                "        .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }" +
                "        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }" +
                "        .logo { font-size: 24px; font-weight: 600; margin-bottom: 10px; }" +
                "        .content { padding: 30px; }" +
                "        h1 { color: #2d3748; font-size: 20px; margin-top: 0; }" +
                "        p { margin-bottom: 15px; font-size: 15px; }" +
                "        .code-container { margin: 25px 0; text-align: center; }" +
                "        .code { display: inline-block; background: linear-gradient(135deg, #f6f9fc 0%, #eef2f5 100%); border-radius: 6px; padding: 15px 25px; font-size: 28px; font-weight: 700; letter-spacing: 3px; color: #4a5568; border: 1px dashed #cbd5e0; }" +
                "        .action-text { color: #667eea; font-weight: 600; }" +
                "        .footer { padding: 20px; text-align: center; font-size: 12px; color: #718096; background-color: #f8fafc; }" +
                "        .divider { height: 1px; background-color: #edf2f7; margin: 20px 0; }" +
                "        .warning { background-color: #fffaf0; padding: 12px; border-left: 4px solid #f6ad55; margin: 20px 0; font-size: 14px; }" +
                "    </style>" +
                "</head>" +
                "<body>" +
                "    <div class=\"container\">" +
                "        <div class=\"header\">" +
                "            <div class=\"logo\">Vnollx OJ</div>" +
                "            <div>在线评测系统</div>" +
                "        </div>" +
                "        <div class=\"content\">" +
                "            <h1>您的验证码</h1>" +
                "            <p>尊敬的用户，您好！</p>" +
                "            <p>您正在进行 <span class=\"action-text\">" + action + "</span> 操作，请在 <strong>1分钟</strong> 内使用以下验证码完成验证：</p>" +
                "            " +
                "            <div class=\"code-container\">" +
                "                <div class=\"code\">" + verificationCode + "</div>" +
                "            </div>" +
                "            " +
                "            <div class=\"warning\">" +
                "                <strong>安全提示：</strong>请不要将验证码透露给他人，包括自称是Vnollx工作人员的人。" +
                "            </div>" +
                "            " +
                "            <div class=\"divider\"></div>" +
                "            " +
                "            <p>如果您没有进行此操作，请忽略本邮件或联系我们的支持团队。</p>" +
                "        </div>" +
                "        <div class=\"footer\">" +
                "            <p>© 2025 Vnollx在线评测系统 | 版权所有</p>" +
                "            <p>此邮件为系统自动发送，请勿直接回复</p>" +
                "        </div>" +
                "    </div>" +
                "</body>" +
                "</html>";
    }
}
