package com.example.vnollxonlinejudge.model.result;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Getter;

@Getter
public class RunResult {
    // getter 和 setter 方法
    private String status;
    private int exitStatus;
    private Long time=0L;
    private Long memory=0L;
    private Long runTime=0L;

    @JsonProperty("files")
    private Files files;

    @JsonProperty("fileIds")
    private FileIds fileIds;

    public void setStatus(String status) { this.status = status; }

    public void setExitStatus(int exitStatus) { this.exitStatus = exitStatus; }

    public void setTime(Long time) { this.time = time; }

    public void setMemory(Long memory) { this.memory = memory; }

    public void setRunTime(Long runTime) { this.runTime = runTime; }

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
