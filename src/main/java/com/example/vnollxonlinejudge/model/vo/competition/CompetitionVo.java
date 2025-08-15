package com.example.vnollxonlinejudge.model.vo.competition;

import com.example.vnollxonlinejudge.model.entity.Competition;
import lombok.Data;

@Data
public class CompetitionVo {
    private Long  id;
    private Integer number;
    private String title;
    private String description;
    private String beginTime;
    private String endTime;
    private Boolean needPassword;
    private String password;
    public CompetitionVo(){}
    public CompetitionVo(Competition competition){
        this.id=competition.getId();
        this.beginTime=competition.getBeginTime();
        this.endTime=competition.getEndTime();
        this.title=competition.getTitle();
        this.description=competition.getDescription();
        this.number=competition.getNumber();
        this.needPassword=competition.getNeedPassword();
        this.password=competition.getPassword();
    }
}
