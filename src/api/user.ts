import { http } from "@/utils/http";
import { UserPermission, type TokenResult, type UserInfo } from "./types/user";

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
