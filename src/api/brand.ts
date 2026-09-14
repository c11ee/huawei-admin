import { http } from "@/utils/http";
import type { Timestamped } from "./types/common";

/** 品牌状态：0=禁用 1=启用 */
export type BrandStatus = 0 | 1;

/** 品牌数据结构 */
export type Brand = {
  id: number;
  /** 品牌名称 */
  name: string;
  /** 品牌 logo */
  logo: string;
  /** 状态：0=禁用 1=启用 */
  status: BrandStatus;
  /** 排序值，越小越靠前 */
  sort: number;
} & Timestamped;

/** 获取品牌列表（分页） */
export const getBrands = (params: { page?: number; limit?: number }) => {
  return http.request<PageData<Brand[]>>("get", "/v1/brand", {
    params
  });
};

/** 添加品牌 */
export const createBrand = (data: object) => {
  return http.request<ApiResponse<[]>>("post", "/v1/brand", { data });
};

/** 更新品牌 */
export const updateBrand = (id: number, data: object) => {
  return http.request<ApiResponse<[]>>("put", `/v1/brand/${id}`, { data });
};

/** 批量更新品牌状态（上下架） */
export const updateBrandStatus = (ids: string, status: BrandStatus) => {
  return http.request<ApiResponse<[]>>("put", "/v1/brand/status", {
    data: { ids, status }
  });
};

/** 删除品牌（传入数组时按逗号分隔批量删除） */
export const deleteBrand = (ids: number | string) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/brand/${ids}`);
};
