import { defineStore } from "pinia";
import {
  type userType,
  store,
  router,
  resetRouter,
  routerArrays,
  storageLocal
} from "../utils";
import {
  getLogin,
  getUserInfo,
  getUserPermissions,
  refreshTokenApi
} from "@/api/user";
import { useMultiTagsStoreHook } from "./multiTags";
import { setToken, removeToken, userKey, permissionKey } from "@/utils/auth";
import { UserInfo, UserPermission, type TokenResult } from "@/api/types/user";

export const useUserStore = defineStore("pure-user", {
  state: (): userType => ({
    // 头像
    avatar: storageLocal().getItem<any>(userKey)?.avatar ?? "",
    // 用户名
    username: storageLocal().getItem<any>(userKey)?.username ?? "",
    // 昵称
    nickname: storageLocal().getItem<any>(userKey)?.nickname ?? "",
    // 按钮级别权限
    permissions: storageLocal().getItem<any>(userKey)?.permissions ?? [],
    // 用户信息 完整
    userInfo: storageLocal().getItem<any>(userKey) ?? ({} as UserInfo),
    // 是否勾选了登录页的免登录
    isRemembered: false,
    // 登录页的免登录存储几天，默认7天
    loginDay: 7
  }),
  actions: {
    /** 存储头像 */
    SET_AVATAR(avatar: string) {
      this.avatar = avatar;
    },
    /** 存储用户名 */
    SET_USERNAME(username: string) {
      this.username = username;
    },
    /** 存储昵称 */
    SET_NICKNAME(nickname: string) {
      this.nickname = nickname;
    },
    /** 存储按钮级别权限 */
    SET_PERMS(permissions: Array<string>) {
      this.permissions = permissions;
    },
    /** 存储是否勾选了登录页的免登录 */
    SET_ISREMEMBERED(bool: boolean) {
      this.isRemembered = bool;
    },
    /** 存储用户信息所有字段 */
    SET_USERINFO(userInfo: UserInfo) {
      this.userInfo = userInfo;
    },
    /** 设置登录页的免登录存储几天 */
    SET_LOGINDAY(value: number) {
      this.loginDay = Number(value);
    },
    /** 登入 */
    async loginByUsername(data) {
      return new Promise<TokenResult>((resolve, reject) => {
        getLogin(data)
          .then(data => {
            // if (data?.success) setToken(data.data);
            setToken(data.data);
            resolve(data.data);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 前端登出（不调用接口） */
    logOut() {
      this.avatar = "";
      this.username = "";
      this.nickname = "";
      this.permissions = [];
      removeToken();
      useMultiTagsStoreHook().handleTags("equal", [...routerArrays]);
      resetRouter();
      router.push("/login");
    },
    /** 获取用户信息 */
    async getUserInfo() {
      return new Promise<UserInfo>((resolve, reject) => {
        getUserInfo()
          .then(data => {
            this.SET_AVATAR(data.data.avatar);
            this.SET_USERNAME(data.data.username);
            this.SET_NICKNAME(data.data.nickname);
            storageLocal().setItem(userKey, data.data);
            resolve(data.data);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 获取用户权限 */
    async getUserPermissions() {
      return new Promise<UserPermission>((resolve, reject) => {
        getUserPermissions()
          .then(data => {
            this.SET_PERMS(data.data.button_permissions);
            storageLocal().setItem<UserPermission>(permissionKey, data.data);
            resolve(data.data);
          })
          .catch(error => {
            reject(error);
          });
      });
    },
    /** 刷新`token` */
    async handRefreshToken() {
      return new Promise<TokenResult>((resolve, reject) => {
        refreshTokenApi()
          .then(data => {
            if (data) {
              setToken(data.data);
              resolve(data.data);
            }
          })
          .catch(error => {
            reject(error);
          });
      });
    }
  }
});

export function useUserStoreHook() {
  return useUserStore(store);
}
