import { Timestamped } from "./common";

export type TokenResult = {
  /** 短期 token */
  access_token: string;
  /** 长期 token */
  refresh_token: string;
  /** 短期 token的过期时间（时间戳），用于判断是否需要刷新 */
  expires_at: number;
  /** 长期 token的过期时间（时间戳），用于设置 cookie 的存活时间 */
  refresh_expires_at: number;
};

export type User = {
  id: number;
  name: string;
  username: string;
  nickname: string;
  phone: string;
  email: string;
  avatar: string;
  status: 0 | 1;
  role_ids: string;
  role_names: string;
  password?: string;
} & Timestamped;

export type Menu = {
  id: number;
  key: string;
  name: string;
  path: string;
  icon: string;
  /** 1菜单 2按钮 */
  type: 1 | 2;
  sort: number;
  remark: string;
  parent_id: number;
  children: Menu[];
} & Timestamped;

export type UserInfo = User;

/** 关联的用户信息（创建人 / 更新人） */
export type Operator = Pick<User, "id" | "username" | "nickname" | "avatar">;

export interface UserPermission {
  button_permissions: string[];
  menu_permissions: Menu[];
}
