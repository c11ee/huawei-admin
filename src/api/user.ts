import { http } from "@/utils/http";
import type { UserPermission, TokenResult, UserInfo, User } from "./types/user";
export * from "./types/user";

/** 登录 */
export const getLogin = (data?: object) => {
  return http.request<ApiResponse<TokenResult>>("post", "/v1/login", { data });
};

/** 刷新`token` */
export const refreshTokenApi = () => {
  return http.request<ApiResponse<TokenResult>>("post", "/v1/refresh-token");
};

/** 用户信息 */
export const getUserInfo = () => {
  return http.request<ApiResponse<UserInfo>>("get", "/v1/user/info");
};

/** 用户权限 */
export const getUserPermissions = () => {
  return http.request<ApiResponse<UserPermission>>(
    "get",
    "/v1/user/permissions"
  );
};

// ─── 用户管理 CRUD ─────────────────────────────────────────────────────

/** 获取用户列表 */
export const getUsers = (params: ListParams<{ keyword: string }>) => {
  if (params.keyword?.trim()) {
    params.keyword = params.keyword.trim();
  }
  return http.request<PageData<User[]>>("get", "/v1/user", {
    params
  });
};

/** 添加用户 */
export const createUser = (data: object) => {
  return http.request<ApiResponse<[]>>("post", "/v1/user", { data });
};

/** 更新用户 */
export const updateUser = (id: number, data: object) => {
  return http.request<ApiResponse<[]>>("put", `/v1/user/${id}`, { data });
};

/** 更新用户状态 */
export const updateUserStatus = (id: number, status: 0 | 1) => {
  return http.request<ApiResponse<[]>>("put", `/v1/user/${id}/status`, {
    data: { status }
  });
};

/** 删除用户 */
export const deleteUser = (id: number) => {
  return http.request<ApiResponse<null>>("delete", `/v1/user/${id}`);
};
