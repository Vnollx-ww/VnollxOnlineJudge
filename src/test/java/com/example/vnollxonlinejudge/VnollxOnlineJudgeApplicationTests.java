package com.example.vnollxonlinejudge;

import org.apache.commons.mail.HtmlEmail;
import org.springframework.boot.test.context.SpringBootTest;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import javax.mail.*;
import javax.mail.internet.MimeMessage;

import java.util.*;

@SpringBootTest
class VnollxOnlineJudgeApplicationTests {

    public static void main(String[] args) {
        try {
            // 1. 读取EML文件
            String emlPath = "C:\\Users\\吴恩宇\\Downloads\\钓鱼演练.eml";
            File emlFile = new File(emlPath);

            String originalHtml = extractHtmlFromEml(emlFile);

            // 2. 获取收件人邮箱（这里假设已知）
            String recipientEmail = "2720741614@qq.com";

            // 3. 修改HTML中的链接
            String modifiedHtml = modifyLinks(originalHtml, recipientEmail);
            String link="http://192.168.9.119:8989/api/v1/phishing-drill/test";
            String html=getEmailHtml(link);
            // 4. 输出修改后的HTML
            HtmlEmail mail = new HtmlEmail(); // 使用HtmlEmail支持富文本
            mail.setHostName("smtp.qq.com");
            mail.setSmtpPort(465);
            if (System.getenv("EMAIL_PASSWORD") != null) {
                mail.setAuthentication("2720741614@qq.com", System.getenv("EMAIL_PASSWORD"));
            } else {
                mail.setAuthentication("2720741614@qq.com", "jfccwlsdynqfdchg");
            }
            mail.setCharset("UTF-8");
            // 2. 配置SSL/TLS安全连接
            mail.setSSLOnConnect(true);
            mail.setSSLCheckServerIdentity(true);
            System.setProperty("mail.smtp.ssl.protocols", "TLSv1.2");
            System.setProperty("mail.smtp.ssl.ciphersuites", "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256");
            // 4. 设置邮件基本信息
            mail.setFrom("2720741614@qq.com", "钓鱼演练");
            String email="2720741614@qq.com";
            mail.addTo(email);
            mail.setSubject("钓鱼演练");
            mail.setHtmlMsg(html);

            // 6. 发送邮件
            mail.send();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    // 从EML文件中提取HTML内容
    public static String extractHtmlFromEml(File emlFile) throws Exception {
        Properties props = new Properties();
        Session session = Session.getDefaultInstance(props, null);

        try (InputStream is = new FileInputStream(emlFile)) {
            Message message = new MimeMessage(session, is);

            // 获取邮件内容
            Object content = message.getContent();
            if (content instanceof Multipart multipart) {
                for (int i = 0; i < multipart.getCount(); i++) {
                    BodyPart bodyPart = multipart.getBodyPart(i);
                    if (bodyPart.getContentType().contains("text/html")) {
                        return (String) bodyPart.getContent();
                    }
                }
            } else if (content instanceof String) {
                return (String) content;
            }
        }
        throw new Exception("No HTML content found in EML file");
    }

    // 修改HTML中的所有HTTPS链接
    public static String modifyLinks(String html, String recipientEmail) {
        // 对email进行URL编码
        String encodedEmail = java.net.URLEncoder.encode(recipientEmail, StandardCharsets.UTF_8);

        // 匹配所有https链接
        Pattern pattern = Pattern.compile("(https://[^\"'\\s]+)");
        Matcher matcher = pattern.matcher(html);

        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            String url = matcher.group(1);
            // 判断是否已经有查询参数
            String separator = url.contains("?") ? "&" : "?";
            String replacement = url + separator + "email=" + encodedEmail;
            matcher.appendReplacement(result, replacement);
        }
        matcher.appendTail(result);

        // 添加1x1像素追踪图片（指向你的接口）
        String trackingPixel = "<img src=\"https://192.168.9.119/track?email=" + encodedEmail +
                "\" width=\"1\" height=\"1\" style=\"display:none;\" alt=\"\" />";

        // 尝试插入到 </body> 前，否则追加到末尾
        String finalHtml = result.toString();
        if (finalHtml.contains("</body>")) {
            finalHtml = finalHtml.replace("</body>", trackingPixel + "</body>");
        } else {
            finalHtml += trackingPixel;
        }

        return finalHtml;
    }
    public static String getEmailHtml(String link) {
        return String.format("""
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
                <meta charset="UTF-8">
                <title>账户安全通知</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
                    .button {
                        display: inline-block; padding: 10px 20px;
                        background-color: #dc3545; color: white !important;
                        text-decoration: none; border-radius: 4px; font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <h2>紧急：您的账户需要验证</h2>
                <p>我们检测到您的账户存在异常活动，请立即验证：</p>
                <p style="text-align: center; margin: 25px 0;">
                    <a href="%s" class="button">立即验证账户</a>
                </p>
                <p><small>如果您未请求此操作，请忽略此邮件。</small></p>
                <div style="margin-top: 30px; font-size: 12px; color: #777; text-align: center;">
                    <p>© 2023 公司名称</p>
                </div>
                <!-- 追踪像素 -->
                <img src="http://192.168.9.119:8989/api/v1/phishing-drill/track/email" width="1" height="1" style="display:none;">
            </body>
            </html>
            """,
                link
        );
    }
}
