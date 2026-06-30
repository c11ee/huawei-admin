export type TokenResult = {
  /** token */
  access_token: string;
  /** 刷新`token` */
  refresh_token: string;
  /** `token`的过期时间（时间戳） */
  expires_at: number;
};

export interface User {
  id: number;
  username: string;
  nickname: string;
  phone: string;
  avatar: string;
  status: 0 | 1;
  role_ids: string;
  role_names: string;
  created_at: string;
  updated_at: string;
  created_at_ts: number;
  updated_at_ts: number;
}

export interface Menu {
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
  created_at: string;
  updated_at: string;
  created_at_ts: number;
  updated_at_ts: number;
  children: Menu[];
}

export type UserInfo = User;

export interface UserPermission {
  button_permissions: string[];
  menu_permissions: Menu[];
}
