import { http } from "@/utils/http";
import { VxeGridPropTypes } from "vxe-table";

/** 获取列配置 */
export const getColumnsPreference = (key: string) => {
  return http.request<ApiResponse<VxeGridPropTypes.Column[]>>(
    "get",
    "/v1/common/user-column-preference/" + key
  );
};

/** 设置列配置 */
export const setColumnsPreference = (data: {
  key: string;
  columns: VxeGridPropTypes.Column[];
}) => {
  return http.request<ApiResponse<[]>>(
    "post",
    "/v1/common/user-column-preference",
    {
      data
    }
  );
};
