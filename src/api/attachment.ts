import { http } from "@/utils/http";
import {
  AddFolderRequest,
  AttachmentListRequest,
  AttachmentNode,
  DeleteAttachmentRequest,
  FileNode,
  FolderNode,
  UploadFileRequest
} from "./types/attachment";

/** 上传 */
export const uploadFile = (params: UploadFileRequest) => {
  const formData = new FormData();
  formData.append("user_id", String(params.user_id));
  formData.append("folder_id", String(params.folder_id));
  formData.append("file", params.file);
  return http.request<ApiResponse<FileNode>>("post", "/v1/common/upload", {
    data: formData,
    headers: { "Content-Type": "multipart/form-data" }
  });
};

/** 附件列表 */
export const getAttachmentList = (params: AttachmentListRequest) => {
  return http.request<ApiResponse<AttachmentNode[]>>("get", "/v1/attachment", {
    params
  });
};

/** 删除/移到回收站 附件, 文件夹 */
export const deleteAttachmentOrFolder = (data: DeleteAttachmentRequest) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/attachment`, {
    data
  });
};

/** 文件夹树 */
export const getFolderTree = () => {
  return http.request<ApiResponse<FolderNode[]>>("get", "/v1/folder/tree");
};

/** 添加文件夹 */
export const addFolder = (data: AddFolderRequest) => {
  return http.request<ApiResponse<FolderNode>>("post", "/v1/folder", {
    data
  });
};

/** 删除文件夹 */
export const deleteFolder = (ids: string) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/folder/${ids}`);
};

/** 还原 */
export const restoreFolder = (data: DeleteAttachmentRequest) => {
  return http.request<ApiResponse<[]>>("put", `/v1/attachment/restore`, {
    data
  });
};
