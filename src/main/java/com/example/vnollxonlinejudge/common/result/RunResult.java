package com.example.vnollxonlinejudge.common.result;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;
import lombok.Setter;

@Getter
public class RunResult {
    // getter 和 setter 方法
    private String status;
    private int exitStatus;
    private long time;
    private long memory;
    private long runTime;

    @JsonProperty("files")
    private Files files;

    @JsonProperty("fileIds")
    private FileIds fileIds;

    public void setStatus(String status) { this.status = status; }

    public void setExitStatus(int exitStatus) { this.exitStatus = exitStatus; }

    public void setTime(long time) { this.time = time; }

    public void setMemory(long memory) { this.memory = memory; }

    public void setRunTime(long runTime) { this.runTime = runTime; }

    public void setFiles(Files files) { this.files = files; }

    public void setFileIds(FileIds fileIds) { this.fileIds = fileIds; }

    // 内部类：映射 files 字段
    @Getter
    public static class Files {
        private String stderr;
        private String stdout;

        public void setStderr(String stderr) { this.stderr = stderr; }

        public void setStdout(String stdout) { this.stdout = stdout; }
    }

    // 内部类：映射 fileIds 字段
    @Getter
    public static class FileIds {
        private String a;  // 编译后的二进制文件 id

        public void setA(String a) { this.a = a; }
    }
}
