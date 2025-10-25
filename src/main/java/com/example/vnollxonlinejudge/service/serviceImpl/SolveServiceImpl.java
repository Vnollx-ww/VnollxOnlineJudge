package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.example.vnollxonlinejudge.model.entity.Notification;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;
import com.example.vnollxonlinejudge.model.entity.Solve;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.SolveMapper;
import com.example.vnollxonlinejudge.producer.NotificationProducer;
import com.example.vnollxonlinejudge.service.NotificationService;
import com.example.vnollxonlinejudge.service.SolveService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SolveServiceImpl extends ServiceImpl<SolveMapper,Solve> implements SolveService {

    private final NotificationProducer notificationProducer;


    @Autowired
    public SolveServiceImpl(NotificationProducer notificationProducer){
        this.notificationProducer=notificationProducer;
    }

    @Override
    public void createSolve(String content, String name,Long pid, Long uid,String title,String problemName) {
        Solve solve=Solve.builder()
                .content(content)
                .name(name)
                .pid(pid)
                .uid(uid)
                .title(title)
                .problemName(problemName)
                .status(0) // 0-待审核
                .createTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();

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
        queryWrapper.eq(Solve::getPid, pid).eq(Solve::getStatus,true);
        return list(queryWrapper).stream()
                .map(SolveVo::new)
                .collect(Collectors.toList());
    }

    // 管理员功能实现
    @Override
    public List<SolveVo> getAllSolvesForAdmin(int page, int size, String keyword, Integer status) {
        LambdaQueryWrapper<Solve> queryWrapper = new LambdaQueryWrapper<>();
        
        // 关键词搜索
        if (StringUtils.hasText(keyword)) {
            queryWrapper.and(wrapper -> wrapper
                .like(Solve::getTitle, keyword)
                .or()
                .like(Solve::getProblemName, keyword)
                .or()
                .like(Solve::getName, keyword)
            );
        }
        
        // 状态筛选
        if (status != null) {
            queryWrapper.eq(Solve::getStatus, status);
        }
        
        // 按创建时间倒序
        queryWrapper.orderByDesc(Solve::getCreateTime);
        
        // 分页查询
        Page<Solve> solvePage = new Page<>(page + 1, size);
        Page<Solve> result = page(solvePage, queryWrapper);
        
        return result.getRecords().stream()
                .map(SolveVo::new)
                .collect(Collectors.toList());
    }

    @Override
    public void createSolveForAdmin(String content, String name, Long pid, String title, String problemName) {
        Solve solve = Solve.builder()
                .content(content)
                .name(name)
                .pid(pid)
                .uid(0L) // 管理员创建，uid设为0
                .title(title)
                .problemName(problemName)
                .status(1) // 管理员创建直接通过
                .createTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")))
                .build();

        this.save(solve);
    }

    @Override
    public void updateSolve(Long id, String content, String name, Long pid, String title, String problemName) {
        Solve solve = getById(id);
        if (solve == null) {
            throw new BusinessException("题解不存在");
        }
        
        solve.setContent(content);
        solve.setName(name);
        solve.setPid(pid);
        solve.setTitle(title);
        solve.setProblemName(problemName);
        
        this.updateById(solve);
    }

    @Override
    @Transactional
    public void updateSolveStatus(Long id, Integer status) {
        Solve solve = getById(id);
        if (solve == null) {
            throw new BusinessException("题解不存在");
        }
        solve.setStatus(status);
        this.updateById(solve);
        Instant now = Instant.now();
        DateTimeFormatter formatter = DateTimeFormatter.ISO_INSTANT;
        String formatted = formatter.format(now);
        String statusText = status == 1 ? "通过" : status == 2 ? "不通过" : "待审核";
        String description = String.format("你在题目 #%s《%s》中的题解【%s】审核%s",
                solve.getPid(),
                solve.getProblemName(),
                solve.getTitle(),
                statusText
        );
        Notification notification = Notification.builder()
                .title("审核结果通知")
                .description(description)
                .createTime(formatted)
                .uid(solve.getUid())
                .build();
        notificationProducer.sendNotification(notification);
    }

    @Override
    public void deleteSolve(Long id) {
        Solve solve = getById(id);
        if (solve == null) {
            throw new BusinessException("题解不存在");
        }
        this.removeById(id);
    }

    @Override
    public Long getSolveCount(String keyword, Integer status) {
        LambdaQueryWrapper<Solve> queryWrapper = new LambdaQueryWrapper<>();
        
        // 关键词搜索
        if (StringUtils.hasText(keyword)) {
            queryWrapper.and(wrapper -> wrapper
                .like(Solve::getTitle, keyword)
                .or()
                .like(Solve::getProblemName, keyword)
                .or()
                .like(Solve::getName, keyword)
            );
        }
        
        // 状态筛选
        if (status != null) {
            queryWrapper.eq(Solve::getStatus, status);
        }
        
        return this.count(queryWrapper);
    }

}
