import { http } from "@/utils/http";
import { Timestamped } from "./types/common";

/** 权限类型：1=菜单/目录  2=按钮/权限点 */
export type PermissionType = 1 | 2;

/** 权限项数据结构 */
export type Permission = {
  id: number;
  key: string;
  name: string;
  path: string;
  icon: string;
  /** 1=菜单/目录  2=按钮/权限点 */
  type: PermissionType;
  sort: number;
  remark: string;
  parent_id: number;
  children: Permission[];
} & Timestamped;

/** 获取权限列表 */
export const getPermissions = () => {
  return http.request<ApiResponse<Permission[]>>("get", "/v1/permissions");
};

/** 添加权限 */
export const createPermission = (data: object) => {
  return http.request<ApiResponse<Permission>>("post", "/v1/permissions", {
    data
  });
};

/** 更新权限 */
export const updatePermission = (id: number, data: object) => {
  return http.request<ApiResponse<Permission>>("put", `/v1/permissions/${id}`, {
    data
  });
};

/** 删除权限 */
export const deletePermission = (id: number) => {
  return http.request<ApiResponse<null>>("delete", `/v1/permissions/${id}`);
};
