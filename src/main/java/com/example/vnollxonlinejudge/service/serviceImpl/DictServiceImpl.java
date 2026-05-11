package com.example.vnollxonlinejudge.service.serviceImpl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.example.vnollxonlinejudge.exception.BusinessException;
import com.example.vnollxonlinejudge.mapper.DictDataMapper;
import com.example.vnollxonlinejudge.mapper.DictTypeMapper;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictDataDTO;
import com.example.vnollxonlinejudge.model.dto.admin.AdminSaveDictTypeDTO;
import com.example.vnollxonlinejudge.model.entity.DictData;
import com.example.vnollxonlinejudge.model.entity.DictType;
import com.example.vnollxonlinejudge.model.vo.dict.DictDataVo;
import com.example.vnollxonlinejudge.model.vo.dict.DictTypeVo;
import com.example.vnollxonlinejudge.service.DictService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class DictServiceImpl implements DictService {
    private final DictTypeMapper dictTypeMapper;
    private final DictDataMapper dictDataMapper;

    public DictServiceImpl(DictTypeMapper dictTypeMapper, DictDataMapper dictDataMapper) {
        this.dictTypeMapper = dictTypeMapper;
        this.dictDataMapper = dictDataMapper;
    }

    @Override
    public List<DictTypeVo> listTypes(String keyword, Integer status) {
        LambdaQueryWrapper<DictType> wrapper = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.trim().isEmpty()) {
            String value = keyword.trim();
            wrapper.and(w -> w.like(DictType::getDictName, value).or().like(DictType::getDictType, value));
        }
        if (status != null) {
            wrapper.eq(DictType::getStatus, status);
        }
        wrapper.orderByDesc(DictType::getCreateTime).orderByAsc(DictType::getId);
        return dictTypeMapper.selectList(wrapper).stream().map(this::toTypeVo).collect(Collectors.toList());
    }

    @Override
    public DictTypeVo getTypeById(Long id) {
        DictType entity = getTypeEntity(id);
        return toTypeVo(entity);
    }

    @Override
    public DictTypeVo getTypeByDictType(String dictType) {
        if (dictType == null || dictType.trim().isEmpty()) {
            throw new BusinessException("字典类型编码不能为空");
        }
        LambdaQueryWrapper<DictType> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictType::getDictType, dictType.trim());
        DictType entity = dictTypeMapper.selectOne(wrapper);
        if (entity == null) {
            throw new BusinessException("字典类型不存在");
        }
        return toTypeVo(entity);
    }

    @Override
    @Transactional
    public Long saveType(AdminSaveDictTypeDTO dto) {
        String dictName = normalizeRequired(dto.getDictName(), "字典名称不能为空");
        String dictType = normalizeRequired(dto.getDictType(), "字典类型不能为空");
        ensureTypeUnique(dto.getId(), dictType);
        DictType entity = DictType.builder()
                .id(dto.getId())
                .dictName(dictName)
                .dictType(dictType)
                .status(dto.getStatus() != null ? dto.getStatus() : 1)
                .remark(trimToNull(dto.getRemark()))
                .build();
        if (dto.getId() != null && dto.getId() > 0) {
            DictType existing = getTypeEntity(dto.getId());
            if (!existing.getDictType().equals(dictType)) {
                updateDataType(existing.getDictType(), dictType);
            }
            dictTypeMapper.updateById(entity);
            return dto.getId();
        }
        dictTypeMapper.insert(entity);
        return entity.getId();
    }

    @Override
    @Transactional
    public void deleteType(Long id) {
        DictType entity = getTypeEntity(id);
        LambdaQueryWrapper<DictData> dataWrapper = new LambdaQueryWrapper<>();
        dataWrapper.eq(DictData::getDictType, entity.getDictType());
        dictDataMapper.delete(dataWrapper);
        dictTypeMapper.deleteById(id);
    }

    @Override
    public List<DictTypeVo> listTypeLabels() {
        LambdaQueryWrapper<DictType> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictType::getStatus, 1).orderByAsc(DictType::getDictName).orderByAsc(DictType::getId);
        return dictTypeMapper.selectList(wrapper).stream().map(this::toTypeVo).collect(Collectors.toList());
    }

    @Override
    public List<DictDataVo> listDataByType(String dictType, Integer status) {
        String normalizedType = normalizeRequired(dictType, "字典类型不能为空");
        ensureTypeExists(normalizedType);
        LambdaQueryWrapper<DictData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictData::getDictType, normalizedType);
        if (status != null) {
            wrapper.eq(DictData::getStatus, status);
        }
        wrapper.orderByAsc(DictData::getSort).orderByAsc(DictData::getId);
        return dictDataMapper.selectList(wrapper).stream().map(this::toDataVo).collect(Collectors.toList());
    }

    @Override
    public DictDataVo getDataById(Long id) {
        DictData entity = getDataEntity(id);
        return toDataVo(entity);
    }

    @Override
    public Long saveData(AdminSaveDictDataDTO dto) {
        String dictType = normalizeRequired(dto.getDictType(), "字典类型不能为空");
        String dictLabel = normalizeRequired(dto.getDictLabel(), "字典标签不能为空");
        String dictValue = normalizeRequired(dto.getDictValue(), "字典键值不能为空");
        ensureTypeExists(dictType);
        ensureDataUnique(dto.getId(), dictType, dictValue);
        DictData entity = DictData.builder()
                .id(dto.getId())
                .dictType(dictType)
                .dictLabel(dictLabel)
                .dictValue(dictValue)
                .sort(dto.getSort() != null ? dto.getSort() : 0)
                .cssClass(trimToNull(dto.getCssClass()))
                .listClass(trimToNull(dto.getListClass()))
                .isDefault(dto.getIsDefault() != null ? dto.getIsDefault() : 0)
                .status(dto.getStatus() != null ? dto.getStatus() : 1)
                .remark(trimToNull(dto.getRemark()))
                .build();
        if (dto.getId() != null && dto.getId() > 0) {
            getDataEntity(dto.getId());
            dictDataMapper.updateById(entity);
            return dto.getId();
        }
        dictDataMapper.insert(entity);
        return entity.getId();
    }

    @Override
    public void deleteData(Long id) {
        getDataEntity(id);
        dictDataMapper.deleteById(id);
    }

    private void updateDataType(String oldType, String newType) {
        LambdaQueryWrapper<DictData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictData::getDictType, oldType);
        List<DictData> list = dictDataMapper.selectList(wrapper);
        for (DictData data : list) {
            data.setDictType(newType);
            dictDataMapper.updateById(data);
        }
    }

    private DictType getTypeEntity(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException("字典类型 ID 不合法");
        }
        DictType entity = dictTypeMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("字典类型不存在");
        }
        return entity;
    }

    private DictData getDataEntity(Long id) {
        if (id == null || id <= 0) {
            throw new BusinessException("字典数据 ID 不合法");
        }
        DictData entity = dictDataMapper.selectById(id);
        if (entity == null) {
            throw new BusinessException("字典数据不存在");
        }
        return entity;
    }

    private void ensureTypeExists(String dictType) {
        LambdaQueryWrapper<DictType> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictType::getDictType, dictType);
        if (dictTypeMapper.selectCount(wrapper) == 0) {
            throw new BusinessException("字典类型不存在");
        }
    }

    private void ensureTypeUnique(Long id, String dictType) {
        LambdaQueryWrapper<DictType> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictType::getDictType, dictType);
        if (id != null && id > 0) {
            wrapper.ne(DictType::getId, id);
        }
        if (dictTypeMapper.selectCount(wrapper) > 0) {
            throw new BusinessException("字典类型已存在");
        }
    }

    private void ensureDataUnique(Long id, String dictType, String dictValue) {
        LambdaQueryWrapper<DictData> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(DictData::getDictType, dictType).eq(DictData::getDictValue, dictValue);
        if (id != null && id > 0) {
            wrapper.ne(DictData::getId, id);
        }
        if (dictDataMapper.selectCount(wrapper) > 0) {
            throw new BusinessException("该字典类型下字典键值已存在");
        }
    }

    private DictTypeVo toTypeVo(DictType entity) {
        return DictTypeVo.builder()
                .id(entity.getId())
                .dictName(entity.getDictName())
                .dictType(entity.getDictType())
                .status(entity.getStatus())
                .remark(entity.getRemark())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }

    private DictDataVo toDataVo(DictData entity) {
        return DictDataVo.builder()
                .id(entity.getId())
                .dictType(entity.getDictType())
                .dictLabel(entity.getDictLabel())
                .dictValue(entity.getDictValue())
                .sort(entity.getSort())
                .cssClass(entity.getCssClass())
                .listClass(entity.getListClass())
                .isDefault(entity.getIsDefault())
                .status(entity.getStatus())
                .remark(entity.getRemark())
                .createTime(entity.getCreateTime())
                .updateTime(entity.getUpdateTime())
                .build();
    }

    private String normalizeRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessException(message);
        }
        return value.trim();
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
