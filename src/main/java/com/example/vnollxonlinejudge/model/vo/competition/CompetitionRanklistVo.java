package com.example.vnollxonlinejudge.model.vo.competition;

import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class CompetitionRanklistVo {
    private List<ProblemRankVo> problems = new ArrayList<>();
    private List<UserRankVo> users = new ArrayList<>();

    @Data
    public static class ProblemRankVo {
        private Long id;
        private String title;
        private String label;
        private Integer passCount;
        private Integer submitCount;
    }

    @Data
    public static class UserRankVo {
        private Long id;
        private String name;
        private String type;
        private List<CompetitionTeamVo.MemberVo> members = new ArrayList<>();
        private Integer passCount;
        private Integer penaltyTime;
        private List<ProblemResultVo> problems = new ArrayList<>();
        private List<SubmissionRankVo> submissions = new ArrayList<>();
    }

    @Data
    public static class ProblemResultVo {
        private Long problemId;
        private Boolean solved = false;
        private Boolean firstSolve = false;
        private Integer wrongCount = 0;
        private Integer solveMinutes;
        private String solveTime;
    }

    @Data
    public static class SubmissionRankVo {
        private Long id;
        private Long problemId;
        private String problemLabel;
        private String status;
        private String result;
        private String submitTime;
        private Integer submitMinutes;
        private String displayTime;
    }
}
