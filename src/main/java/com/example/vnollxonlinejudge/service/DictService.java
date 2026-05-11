package com.example.vnollxonlinejudge.service;

import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictDataDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictTypeDTO;
import com.example.vnollxonlinejudge.model.vo.dict.DictDataVo;
import com.example.vnollxonlinejudge.model.vo.dict.DictTypeVo;

import java.util.List;

public interface DictService {
    List<DictTypeVo> listTypes(String keyword, Integer status);

    DictTypeVo getTypeById(Long id);

    DictTypeVo getTypeByDictType(String dictType);

    Long saveType(AdminSaveDictTypeDTO dto);

    void deleteType(Long id);

    List<DictTypeVo> listTypeLabels();

    List<DictDataVo> listDataByType(String dictType, Integer status);

    DictDataVo getDataById(Long id);

    Long saveData(AdminSaveDictDataDTO dto);

    void deleteData(Long id);
}
