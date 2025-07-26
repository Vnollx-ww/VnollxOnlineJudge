package com.example.vnollxonlinejudge.model.dto.response.competition;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.example.vnollxonlinejudge.model.entity.Competition;
import jakarta.persistence.Column;
import lombok.Data;

@Data
public class CompetitionResponse {
    private Long  id;
    private int number;
    private String title;
    private String description;
    private String beginTime;
    private String endTime;
    private Boolean needPassword;
    public CompetitionResponse(){}
    public CompetitionResponse(Competition competition){
        this.id=competition.getId();
        this.beginTime=competition.getBeginTime();
        this.endTime=competition.getEndTime();
        this.title=competition.getTitle();
        this.description=competition.getDescription();
        this.number=competition.getNumber();
        this.needPassword=competition.getNeedPassword();
    }
}
