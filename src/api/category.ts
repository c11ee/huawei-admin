import { http } from "@/utils/http";
import { Timestamped } from "./types/common";

/** 分类状态：0=禁用 1=启用 */
export type CategoryStatus = 0 | 1;

/** 分类数据结构 */
export type Category = {
  id: number;
  /** 分类名称 */
  category_name: string;
  /** 父分类ID，0 表示顶级分类 */
  parent_id: number;
  /** 分类图标 */
  icon: string;
  /** 状态：0=禁用 1=启用 */
  status: CategoryStatus;
  /** 排序值，越小越靠前 */
  sort: number;
  children?: Category[];
} & Timestamped;

/** 获取分类列表（树形，不分页） */
export const getCategories = () => {
  return http.request<ApiResponse<Category[]>>("get", "/v1/category");
};

/** 新增分类 */
export const createCategory = (data: object) => {
  return http.request<ApiResponse<[]>>("post", "/v1/category", { data });
};

/** 更新分类 */
export const updateCategory = (id: number, data: object) => {
  return http.request<ApiResponse<[]>>("put", `/v1/category/${id}`, { data });
};

/** 删除分类（连同其子孙分类一并删除） */
export const deleteCategory = (id: number) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/category/${id}`);
};
