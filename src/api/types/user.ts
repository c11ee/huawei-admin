import { Timestamped } from "./common";

export type TokenResult = {
  /** token */
  access_token: string;
  /** 刷新`token` */
  refresh_token: string;
  /** `token`的过期时间（时间戳） */
  expires_at: number;
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

export interface UserPermission {
  button_permissions: string[];
  menu_permissions: Menu[];
}
