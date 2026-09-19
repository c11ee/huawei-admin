import { TableV2SortOrder } from "element-plus";
import { Timestamped } from "./common";

export interface UploadFileRequest {
  user_id: number;
  /** 文件夹ID */
  folder_id: number;
  file: File;
}

export type FolderNode = {
  id: number;
  user_id: number;
  name: string;
  parent_id: number;
  sort: number;
  type: "folder";
  /** 为文件夹树时, 子文件夹列表 */
  children: FolderNode[];
} & Timestamped;

export type FileNode = {
  id: number;
  user_id: number;
  folder_id: number;
  /** 原始文件名 */
  original_name: string;
  /** 附件相对路径 */
  file_path: string;
  /** 附件URL */
  file_url: string;
  /** 附件后缀 */
  extension: string;
  /** 附件大小 */
  file_size: number;
  /** 附件MIME类型 */
  mime_type: string;
  type: "file";
} & Timestamped;

/** 附件列表 包含文件夹和文件节点 */
export type AttachmentNode = FolderNode | FileNode;

/** 添加文件夹表单 */
export type AddFolderRequest = {
  name: string;
  parent_id: number;
  sort: number;
};

/** 附件列表查询参数 */
export type AttachmentListRequest = {
  folder_id: number;
  /** 排序字段 (前端自己排序字段) */
  orderBy: TableV2SortOrder;
  keyword?: string;
  /** 只获取图片附件 */
  only_image?: 0 | 1;
};

export type DeleteAttachmentRequest = {
  attachment_ids: string;
  folder_ids: string;
  recycle?: 0 | 1;
};

/** 批量修改附件所属文件夹 */
export type UpdateAttachmentFolderRequest = {
  attachment_ids: string;
  folder_id: number;
};
