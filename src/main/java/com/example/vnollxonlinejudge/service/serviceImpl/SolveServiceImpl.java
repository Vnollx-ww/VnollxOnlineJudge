package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;
import com.example.vnollxonlinejudge.model.entity.Solve;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SolveMapper;
import com.example.vnollxonlinejudge.service.SolveService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SolveServiceImpl extends ServiceImpl<SolveMapper,Solve> implements SolveService {
    @Override
    public void createSolve(String content, String name,Long pid, Long uid,String title,String problemName) {
        Solve solve = new Solve();
        solve.setContent(content);
        solve.setName(name);
        solve.setPid(pid);
        solve.setUid(uid);
        solve.setTitle(title);
        solve.setProblemName(problemName);
        solve.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        this.save(solve);
    }

    @Override
    public SolveVo getSolve(Long id) {
        Solve solve = getById(id);
        if (solve == null) {
            throw new BusinessException("题解不存在");
        }
        return new SolveVo(solve);
    }
    @Override
    public List<SolveVo> getAllSolves(Long pid){
        LambdaQueryWrapper<Solve> queryWrapper = new LambdaQueryWrapper<>();
        queryWrapper.eq(Solve::getPid, pid);
        return list(queryWrapper).stream()
                .map(SolveVo::new)
                .collect(Collectors.toList());
    }
}
