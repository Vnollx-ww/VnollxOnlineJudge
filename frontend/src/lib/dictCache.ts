import { dictApi } from './dict';
import type { ApiResponse } from '@/types';

export interface DictDataItem {
  dictLabel: string;
  dictValue: string;
}

const cacheKey = (type: string) => `oj:dict:${type}`;

/**
 * 同步读取上次拉取的字典缓存。用于首屏立即渲染，避免等待网络。
 */
export const readCachedDict = (type: string): DictDataItem[] | null => {
  try {
    const raw = localStorage.getItem(cacheKey(type));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DictDataItem[]) : null;
  } catch {
    return null;
  }
};

/**
 * 拉取字典并写入 localStorage 缓存。失败时返回 null，不抛异常。
 */
export const fetchDictWithCache = async (
  type: string,
): Promise<DictDataItem[] | null> => {
  try {
    const res = (await dictApi.listData<DictDataItem[]>(type)) as ApiResponse<DictDataItem[]>;
    if (res.code === 200 && Array.isArray(res.data)) {
      try {
        localStorage.setItem(cacheKey(type), JSON.stringify(res.data));
      } catch {
        // ignore quota errors
      }
      return res.data;
    }
    return null;
  } catch {
    return null;
  }
};
