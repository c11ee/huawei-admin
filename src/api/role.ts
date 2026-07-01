import { http } from "@/utils/http";

/** 角色状态：0=禁用 1=启用 */
export type RoleStatus = 0 | 1;

/** 角色数据结构 */
export interface Role {
  id: number;
  name: string;
  description: string;
  status: RoleStatus;
  permission_ids: number[];
  created_at: string;
  updated_at: string;
  created_at_ts: number;
  updated_at_ts: number;
}

/** 获取角色列表（keyword 可选，后端模糊搜索 name / description） */
export const getRoles = (params: ListParams<{ keyword: string }>) => {
  if (params.keyword?.trim()) {
    params.keyword = params.keyword.trim();
  }
  return http.request<ApiResponse<PageData<Role[]>>>("get", "/v1/role", {
    params
  });
};

/** 添加角色 */
export const createRole = (data: object) => {
  return http.request<ApiResponse<[]>>("post", "/v1/role", { data });
};

/** 更新角色 */
export const updateRole = (id: number, data: object) => {
  return http.request<ApiResponse<[]>>("put", `/v1/role/${id}`, { data });
};

/** 更新角色状态 */
export const updateRoleStatus = (id: number, status: RoleStatus) => {
  return http.request<ApiResponse<[]>>("put", `/v1/role/${id}/status`, {
    data: { status }
  });
};

/** 删除角色 */
export const deleteRole = (id: number) => {
  return http.request<ApiResponse<null>>("delete", `/v1/role/${id}`);
};
