package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.domain.Solve;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SolveMapper;
import com.example.vnollxonlinejudge.service.SolveService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.vnollxonlinejudge.common.result.Result;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
public class SolveServiceImpl extends ServiceImpl<SolveMapper,Solve> implements SolveService {
    @Override
    public void createSolve(String content, String name,long pid, long uid,String title,String pname) {
        Solve solve = new Solve();
        solve.setContent(content);
        solve.setName(name);
        solve.setPid(pid);
        solve.setUid(uid);
        solve.setTitle(title);
        solve.setProblemName(pname);
        solve.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        this.save(solve);
    }

    @Override
    public Solve getSolve(long id) {
        Solve solve = getById(id);
        if (solve == null) {
            throw new BusinessException("题解不存在");
        }
        return solve;
    }
    @Override
    public List<Solve> getAllSolves(long pid){
        LambdaQueryWrapper<Solve> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Solve::getPid, pid);
        return list(queryWrapper);
    }
}
