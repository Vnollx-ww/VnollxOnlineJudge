package com.example.vnollxonlinejudge.judge;

/**
 * 根据评测状态生成面向用户的中文描述文案。
 * source = "submit" 为正式提交；"test" 为自测运行；两种场景主语略有差异。
 *
 * <p>把文案集中放在后端统一生成，避免前端针对 status 再做一层字符串匹配，
 * 前端只需要直接展示 description 字段即可。</p>
 */
public final class JudgeStatusDescriber {

    private JudgeStatusDescriber() {}

    public static String describe(String status) {
        return describe(status, "submit");
    }

    public static String describe(String status, String source) {
        if (status == null || status.isEmpty()) return "";
        boolean isTest = "test".equals(source);
        String subject = isTest ? "自测运行" : "本次提交";
        switch (status) {
            case "答案正确":
            case "Accepted":
                return isTest
                        ? "答案正确：自测样例全部通过。"
                        : "答案正确：恭喜你通过了本次提交。";
            case "答案错误":
            case "Wrong Answer":
                return isTest
                        ? "答案错误：自测运行的实际输出与期望输出不一致。"
                        : "答案错误：您提交程序的实际输出结果与期望输出不一致。";
            case "编译错误":
            case "Compile Error":
                return isTest
                        ? "编译错误：代码未能完成编译，请检查语法。"
                        : "编译错误：您提交的代码无法完成编译。";
            case "运行时错误":
            case "Runtime Error":
                return "运行时错误：" + subject + "在运行过程中发生异常。";
            case "时间超出限制":
            case "时间超限":
            case "Time Limit Exceeded":
                return "时间超出限制：" + subject + "运行时间超过了题目限制。";
            case "内存超出限制":
            case "内存超限":
            case "Memory Limit Exceeded":
                return "内存超出限制：" + subject + "占用内存超过了题目限制。";
            case "输出超出限制":
            case "输出超限":
            case "Output Limit Exceeded":
                return "输出超出限制：" + subject + "输出内容超过了限制。";
            case "非法系统调用":
                return "非法系统调用：" + subject + "触发了受限的系统调用。";
            case "判题错误":
                return "判题错误：评测服务内部异常，请稍后重试或联系管理员。";
            case "评测中":
            case "Judging":
                return "评测中：正在执行评测，请稍候…";
            case "等待评测":
            case "Pending":
                return "等待评测：已加入评测队列。";
            default:
                return status;
        }
    }
}
