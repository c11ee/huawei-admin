import { http } from "@/utils/http";

/** 权限类型：1=菜单/目录  2=按钮/权限点 */
export type PermissionType = 1 | 2;

/** 权限项数据结构 */
export interface Permission {
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
  created_at: string;
  updated_at: string;
  created_at_ts: number;
  updated_at_ts: number;
  children: Permission[];
}

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
