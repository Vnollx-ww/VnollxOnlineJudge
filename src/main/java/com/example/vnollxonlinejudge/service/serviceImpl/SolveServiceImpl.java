package com.example.vnollxonlinejudge.service.serviceImpl;

import com.example.vnollxonlinejudge.domain.Solve;
import com.example.vnollxonlinejudge.mapper.SolveMapper;
import com.example.vnollxonlinejudge.service.SolveService;
import com.example.vnollxonlinejudge.service.UserService;
import com.example.vnollxonlinejudge.utils.Result;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SolveServiceImpl implements SolveService {
    private static final Logger logger = LoggerFactory.getLogger(UserService.class);
    @Autowired
    private SolveMapper solveMapper;
    @Override
    public Result createSolve(String content, String name,long pid, long uid,String title,String pname) {
        try {
            LocalDateTime currentTime = LocalDateTime.now();
            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
            String formattedTime = currentTime.format(formatter);
            solveMapper.insertSolve(content,name,formattedTime,uid,pid,title,pname);
            return Result.Success("创建题解成功");
        } catch (Exception e) {
            logger.error("创建题解失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }

    @Override
    public Result getSolve(long id) {
        try {
            Solve solve=solveMapper.getSolve(id);
            if (solve == null) {
                return Result.LogicError("题解不存在");
            }
            return Result.Success(solve,"获取题解信息成功");
        } catch (Exception e) {
            logger.error("查询题解失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
    @Override
    public Result getAllSolves(long pid){
        try {
            List<Solve> solve=solveMapper.getAllSolves(pid);
            return Result.Success(solve,"获取题解列表信息成功");
        } catch (Exception e) {
            logger.error("查询题解失败: ", e);
            return Result.SystemError("服务器错误，请联系管理员");
        }
    }
}
