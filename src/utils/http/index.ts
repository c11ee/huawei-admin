import Axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type CustomParamsSerializer
} from "axios";
import type {
  PureHttpError,
  RequestMethods,
  PureHttpResponse,
  PureHttpRequestConfig
} from "./types.d";
import { stringify } from "qs";
import { getToken, formatToken } from "@/utils/auth";
import { useUserStoreHook } from "@/store/modules/user";
import { ElMessage } from "element-plus";

// 提前刷新`token`的安全余量（秒），避免临界时刻的请求携带即将过期的`token`
const REFRESH_MARGIN = 30;

// 相关配置请参考：www.axios-js.com/zh-cn/docs/#axios-request-config-1
const defaultConfig: AxiosRequestConfig = {
  // 请求超时时间
  timeout: 10000,
  headers: {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  },
  // 数组格式参数序列化（https://github.com/axios/axios/issues/5142）
  paramsSerializer: {
    serialize: stringify as unknown as CustomParamsSerializer
  }
};

class PureHttp {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  /** 初始化配置对象 */
  private static initConfig: PureHttpRequestConfig = {};

  /** 保存当前`Axios`实例对象 */
  private static axiosInstance: AxiosInstance = Axios.create(defaultConfig);

  /** 进行中的刷新`token`请求，并发`401`时复用同一次刷新 */
  private static refreshPromise: Promise<string> | null = null;

  /** 加锁刷新`token`（请求前主动刷新与 401 兜底重试共用），刷新失败则退出登录 */
  private static refreshToken(): Promise<string> {
    if (!PureHttp.refreshPromise) {
      PureHttp.refreshPromise = useUserStoreHook()
        .handRefreshToken()
        .then(res => res.access_token)
        .catch(error => {
          useUserStoreHook().logOut();
          throw error;
        })
        .finally(() => {
          PureHttp.refreshPromise = null;
        });
    }
    return PureHttp.refreshPromise;
  }

  /** 请求拦截 */
  private httpInterceptorsRequest(): void {
    PureHttp.axiosInstance.interceptors.request.use(
      async (config: PureHttpRequestConfig): Promise<any> => {
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof config.beforeRequestCallback === "function") {
          config.beforeRequestCallback(config);
          return config;
        }
        if (PureHttp.initConfig.beforeRequestCallback) {
          PureHttp.initConfig.beforeRequestCallback(config);
          return config;
        }
        // 增加前缀（`401`重试时`url`已带前缀，无需重复拼接）
        if (!config.isRetry) {
          config.url =
            import.meta.env.VITE_API_BASE_URL + "admin" + config.url;
        }

        // 刷新token接口，其 Authorization 已由 refreshTokenApi 传入 refresh_token
        if (config.url.endsWith("/refresh-token")) {
          return config;
        }
        /** 请求白名单，放置一些不需要`token`的接口 */
        const whiteList = ["/login"];
        if (whiteList.some(url => config.url.endsWith(url))) {
          return config;
        }
        // 主路径：携带`token`；距离绝对过期时间不足安全余量时提前刷新
        const data = getToken();
        if (!data) {
          return config;
        }

        const now = Math.floor(Date.now() / 1000);
        // 401 兜底重试前刚刷新过（`isRetry`），无需再次判断
        if (!config.isRetry && data.expires_at - now <= REFRESH_MARGIN) {
          try {
            // 与 401 兜底共用同一个加锁的刷新函数，并发请求只会刷新一次
            await PureHttp.refreshToken();
          } catch {
            // 刷新失败时刷新函数内已退出登录，该请求无需再发出
            return Promise.reject(new Error("刷新 token 失败"));
          }
        }

        // 刷新后重新读取，保证使用最新`token`
        const token = getToken();
        if (token) {
          config.headers["Authorization"] = formatToken(token.access_token);
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
  }

  /** 响应拦截 */
  private httpInterceptorsResponse(): void {
    const instance = PureHttp.axiosInstance;
    instance.interceptors.response.use(
      (response: PureHttpResponse) => {
        const $config = response.config;
        const data = response.data;
        // 优先判断post/get等方法是否传入回调，否则执行初始化设置等回调
        if (typeof $config.beforeResponseCallback === "function") {
          $config.beforeResponseCallback(response);
          return data;
        }
        if (PureHttp.initConfig.beforeResponseCallback) {
          PureHttp.initConfig.beforeResponseCallback(response);
          return data;
        }

        switch (data.code) {
          case 200:
            return data;
          case 401: {
            // 兜底路径：主动刷新未覆盖到（时钟偏差、服务端提前失效等）时，
            // 刷新`token`的接口本身返回`401`，或重试后仍为`401`，直接退出登录
            if ($config.url.endsWith("/refresh-token") || $config.isRetry) {
              useUserStoreHook().logOut();
              return Promise.reject(data);
            }
            // 刷新`token`后重试原始请求（新`token`由请求拦截器从`cookie`中读取）
            $config.isRetry = true;
            return PureHttp.refreshToken().then(() =>
              PureHttp.axiosInstance.request($config)
            );
          }
          default:
            // 其他错误码 (没权限, 接口提示错误)
            ElMessage.error(data.msg);
            return Promise.reject(data);
        }
      },
      (error: PureHttpError) => {
        const $error = error;
        $error.isCancelRequest = Axios.isCancel($error);
        // 所有的响应异常 区分来源为取消请求/非取消请求
        return Promise.reject($error);
      }
    );
  }

  /** 通用请求工具函数 */
  public request<T>(
    method: RequestMethods,
    url: string,
    param?: AxiosRequestConfig,
    axiosConfig?: PureHttpRequestConfig
  ): Promise<T> {
    const config = {
      method,
      url,
      ...param,
      ...axiosConfig
    } as PureHttpRequestConfig;

    // 单独处理自定义请求/响应回调
    return new Promise((resolve, reject) => {
      PureHttp.axiosInstance
        .request(config)
        .then((response: undefined) => {
          resolve(response);
        })
        .catch(error => {
          reject(error);
        });
    });
  }

  /** 单独抽离的`post`工具函数 */
  public post<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("post", url, params, config);
  }

  /** 单独抽离的`get`工具函数 */
  public get<T, P>(
    url: string,
    params?: AxiosRequestConfig<P>,
    config?: PureHttpRequestConfig
  ): Promise<T> {
    return this.request<T>("get", url, params, config);
  }
}

export const http = new PureHttp();
