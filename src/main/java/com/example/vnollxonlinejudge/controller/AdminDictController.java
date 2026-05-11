package com.example.vnollxonlinejudge.controller;

import com.example.vnollxonlinejudge.annotation.RequirePermission;
import com.example.vnollxonlinejudge.model.base.PermissionCode;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictDataDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictTypeDTO;
import com.example.vnollxonlinejudge.model.result.Result;
import com.example.vnollxonlinejudge.model.vo.dict.DictDataVo;
import com.example.vnollxonlinejudge.model.vo.dict.DictTypeVo;
import com.example.vnollxonlinejudge.service.DictService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/dict")
public class AdminDictController {
    private final DictService dictService;

    public AdminDictController(DictService dictService) {
        this.dictService = dictService;
    }

    @GetMapping("/type/list")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<List<DictTypeVo>> listTypes(@RequestParam(required = false) String keyword,
                                              @RequestParam(required = false) Integer status) {
        return Result.Success(dictService.listTypes(keyword, status), "获取字典类型列表成功");
    }

    @GetMapping("/type/labels")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<List<DictTypeVo>> listTypeLabels() {
        return Result.Success(dictService.listTypeLabels(), "获取字典标签列表成功");
    }

    @GetMapping("/type/{id}")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<DictTypeVo> getTypeById(@PathVariable Long id) {
        return Result.Success(dictService.getTypeById(id), "获取字典类型成功");
    }

    @GetMapping("/type/by-type/{dictType}")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<DictTypeVo> getTypeByDictType(@PathVariable String dictType) {
        return Result.Success(dictService.getTypeByDictType(dictType), "获取字典类型成功");
    }

    @PostMapping("/type/save")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<Long> saveType(@RequestBody AdminSaveDictTypeDTO dto) {
        Long id = dictService.saveType(dto);
        return Result.Success(id, "保存字典类型成功");
    }

    @DeleteMapping("/type/{id}")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<Void> deleteType(@PathVariable Long id) {
        dictService.deleteType(id);
        return Result.Success("删除字典类型成功");
    }

    @GetMapping("/data/list")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<List<DictDataVo>> listDataByType(@RequestParam String dictType,
                                                   @RequestParam(required = false) Integer status) {
        return Result.Success(dictService.listDataByType(dictType, status), "获取字典数据成功");
    }

    @GetMapping("/data/{id}")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<DictDataVo> getDataById(@PathVariable Long id) {
        return Result.Success(dictService.getDataById(id), "获取字典数据成功");
    }

    @PostMapping("/data/save")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<Long> saveData(@RequestBody AdminSaveDictDataDTO dto) {
        Long id = dictService.saveData(dto);
        return Result.Success(id, "保存字典数据成功");
    }

    @DeleteMapping("/data/{id}")
    @RequirePermission(PermissionCode.SYSTEM_SETTINGS)
    public Result<Void> deleteData(@PathVariable Long id) {
        dictService.deleteData(id);
        return Result.Success("删除字典数据成功");
    }
}
