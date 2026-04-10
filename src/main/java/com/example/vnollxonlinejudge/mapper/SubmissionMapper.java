package com.example.vnollxonlinejudge.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.example.vnollxonlinejudge.model.entity.Submission;
import com.example.vnollxonlinejudge.model.vo.statistics.DailySubmissionVO;
import com.example.vnollxonlinejudge.model.vo.statistics.ErrorPatternStatVO;
import com.example.vnollxonlinejudge.model.vo.statistics.LanguageStatVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

@Mapper
public interface SubmissionMapper extends BaseMapper<Submission> {

    /** 按状态统计提交数（常见错误模式） */
    @Select("SELECT status AS status, COUNT(*) AS count FROM submission WHERE status IS NOT NULL AND status != '' GROUP BY status ORDER BY count DESC")
    List<ErrorPatternStatVO> countByStatus();

    /** 按语言统计提交数 */
    @Select("SELECT language AS language, COUNT(*) AS count FROM submission WHERE language IS NOT NULL AND language != '' GROUP BY language ORDER BY count DESC")
    List<LanguageStatVO> countByLanguage();

    /** 按日期统计提交数（近 N 天，create_time 格式 yyyy-MM-dd HH:mm:ss） */
    @Select("SELECT LEFT(create_time, 10) AS date, COUNT(*) AS count FROM submission WHERE create_time >= #{startDate} GROUP BY LEFT(create_time, 10) ORDER BY date ASC")
    List<DailySubmissionVO> countByDate(@Param("startDate") String startDate);

    /** 按用户+日期统计提交数（学习分析：某用户近 N 天每日提交量） */
    @Select("SELECT LEFT(create_time, 10) AS date, COUNT(*) AS count FROM submission WHERE create_time >= #{startDate} AND uid = #{uid} GROUP BY LEFT(create_time, 10) ORDER BY date ASC")
    List<DailySubmissionVO> countByDateAndUser(@Param("startDate") String startDate, @Param("uid") Long uid);

    /** 按用户+状态统计错误次数（非 Accepted 的提交按状态分组） */
    @Select("SELECT status AS status, COUNT(*) AS count FROM submission WHERE uid = #{uid} AND status IS NOT NULL AND status != '' AND status != 'Accepted' GROUP BY status ORDER BY count DESC")
    List<ErrorPatternStatVO> countErrorsByUser(@Param("uid") Long uid);

    /** 获取用户最近的错误提交（最近 N 条非 Accepted 提交，含题目信息） */
    @Select("SELECT id, pid, problem_name, status, language, error_info, create_time FROM submission WHERE uid = #{uid} AND status IS NOT NULL AND status != 'Accepted' ORDER BY id DESC LIMIT #{limit}")
    List<Submission> recentErrorSubmissions(@Param("uid") Long uid, @Param("limit") int limit);
}

