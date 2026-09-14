import { reactive } from "vue";
import type { AttachmentNode, FolderNode } from "@/api/types/attachment";

/** 附件数据缓存（模块级共享），避免弹窗反复打开时重复请求 */
export const cache = reactive({
  /** 是否已获取过数据 */
  loaded: false,
  /** 当前所在文件夹 ID */
  folderId: 0,
  /** 文件夹树 */
  folderTree: [] as FolderNode[],
  /** 当前文件夹下的附件列表 */
  fileList: [] as AttachmentNode[]
});
