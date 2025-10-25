package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.exception.PermissionDeniedException;
import com.example.vnollxonlinejudge.model.dto.solve.CreateSolveDTO;
import com.example.vnollxonlinejudge.model.entity.Solve;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.solve.SolveVo;
import com.example.vnollxonlinejudge.service.SolveService;
import com.example.vnollxonlinejudge.utils.UserContextHolder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.ModelAndView;

import java.util.List;

@RestController
@RequestMapping("/admin/solve")
public class AdminSolveController {
    
    private final SolveService solveService;
    
    @Autowired
    public AdminSolveController(SolveService solveService) {
        this.solveService = solveService;
    }
    
    /**
     * 检查管理员权限
     */
    private void checkAdminPermission() {
        if (!UserContextHolder.isAdmin()) {
            throw new PermissionDeniedException("需要管理员权限");
        }
    }
    
    @GetMapping
    public ModelAndView adminSolvePage() {
        ModelAndView modelAndView = new ModelAndView();
        modelAndView.setViewName("admin-solve");
        return modelAndView;
    }
    
    @GetMapping("/list")
    public Result<List<SolveVo>> getAllSolvesForAdmin(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        checkAdminPermission();
        List<SolveVo> solves = solveService.getAllSolvesForAdmin(page, size, keyword, status);
        return Result.Success(solves, "获取题解列表成功");
    }
    
    @GetMapping("/{id}")
    public Result<SolveVo> getSolveById(@PathVariable Long id) {
        checkAdminPermission();
        SolveVo solve = solveService.getSolve(id);
        return Result.Success(solve, "获取题解详情成功");
    }
    
    @PostMapping
    public Result<Void> createSolve(@RequestBody CreateSolveDTO req) {
        checkAdminPermission();
        solveService.createSolveForAdmin(
                req.getContent(),
                req.getName(),
                Long.parseLong(req.getPid()),
                req.getTitle(),
                req.getProblemName()
        );
        return Result.Success("创建题解成功");
    }
    
    @PutMapping("/{id}")
    public Result<Void> updateSolve(@PathVariable Long id, @RequestBody CreateSolveDTO req) {
        checkAdminPermission();
        solveService.updateSolve(
                id,
                req.getContent(),
                req.getName(),
                Long.parseLong(req.getPid()),
                req.getTitle(),
                req.getProblemName()
        );
        return Result.Success("更新题解成功");
    }
    
    @PutMapping("/{id}/status")
    public Result<Void> updateSolveStatus(@PathVariable Long id, @RequestParam Integer status) {
        checkAdminPermission();
        solveService.updateSolveStatus(id, status);
        String message = status == 1 ? "题解审核通过" : status == 2 ? "题解审核不通过" : "题解状态更新";
        return Result.Success(message);
    }
    
    @DeleteMapping("/{id}")
    public Result<Void> deleteSolve(@PathVariable Long id) {
        checkAdminPermission();
        solveService.deleteSolve(id);
        return Result.Success("删除题解成功");
    }
    
    @GetMapping("/count")
    public Result<Long> getSolveCount(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Integer status) {
        checkAdminPermission();
        Long count = solveService.getSolveCount(keyword, status);
        return Result.Success(count, "获取题解数量成功");
    }
}
