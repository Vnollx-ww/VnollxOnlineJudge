package com.example.vnollxonlinejudge.common.result;

import com.fasterxml.jackson.annotation.JsonProperty;

public class RunResult {
    private String status;
    private int exitStatus;
    private long time;
    private long memory;
    private long runTime;

    @JsonProperty("files")
    private Files files;

    @JsonProperty("fileIds")
    private FileIds fileIds;

    // getter 和 setter 方法
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getExitStatus() { return exitStatus; }
    public void setExitStatus(int exitStatus) { this.exitStatus = exitStatus; }

    public long getTime() { return time; }
    public void setTime(long time) { this.time = time; }

    public long getMemory() { return memory; }
    public void setMemory(long memory) { this.memory = memory; }

    public long getRunTime() { return runTime; }
    public void setRunTime(long runTime) { this.runTime = runTime; }

    public Files getFiles() { return files; }
    public void setFiles(Files files) { this.files = files; }

    public FileIds getFileIds() { return fileIds; }
    public void setFileIds(FileIds fileIds) { this.fileIds = fileIds; }

    // 内部类：映射 files 字段
    public static class Files {
        private String stderr;
        private String stdout;

        public String getStderr() { return stderr; }
        public void setStderr(String stderr) { this.stderr = stderr; }

        public String getStdout() { return stdout; }
        public void setStdout(String stdout) { this.stdout = stdout; }
    }

    // 内部类：映射 fileIds 字段
    public static class FileIds {
        private String a;  // 编译后的二进制文件 id

        public String getA() { return a; }
        public void setA(String a) { this.a = a; }
    }
}
