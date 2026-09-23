import { http } from "@/utils/http";
import type { Timestamped } from "./types/common";
import type { Operator } from "./types/user";

/** 规格模板状态：0=禁用 1=启用 */
export type SpecTemplateStatus = 0 | 1;

/** 规格值 */
export type SpecValue = {
  /** 规格值名称，如：红色 */
  value: string;
};

/** 规格项 */
export type SpecItem = {
  /** 规格项名称，如：颜色 */
  name: string;
  /** 规格值列表 */
  values: SpecValue[];
};

/** 规格模板数据结构 */
export type SpecTemplate = {
  id: number;
  /** 规格模板名称 */
  name: string;
  /** 规格项与规格值 */
  spec_json: SpecItem[];
  /** 状态：0=禁用 1=启用 */
  status: SpecTemplateStatus;
  /** 排序值，越小越靠前 */
  sort: number;
  /** 创建人ID */
  created_by?: number;
  /** 更新人ID */
  updated_by?: number;
  /** 创建人信息 */
  creator?: Operator | null;
  /** 更新人信息 */
  updater?: Operator | null;
} & Timestamped;

/** 获取规格模板列表（分页） */
export const getSpecTemplates = (params: {
  page?: number;
  limit?: number;
  keyword?: string;
}) => {
  return http.request<PageData<SpecTemplate[]>>("get", "/v1/spec-template", {
    params
  });
};

/** 添加规格模板 */
export const createSpecTemplate = (data: object) => {
  return http.request<ApiResponse<[]>>("post", "/v1/spec-template", { data });
};

/** 更新规格模板 */
export const updateSpecTemplate = (id: number, data: object) => {
  return http.request<ApiResponse<[]>>("put", `/v1/spec-template/${id}`, {
    data
  });
};

/** 批量更新规格模板状态（启用/禁用） */
export const updateSpecTemplateStatus = (
  ids: string,
  status: SpecTemplateStatus
) => {
  return http.request<ApiResponse<[]>>("put", "/v1/spec-template/status", {
    data: { ids, status }
  });
};

/** 删除规格模板（传入数组时按逗号分隔批量删除） */
export const deleteSpecTemplate = (ids: number | string) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/spec-template/${ids}`);
};
