import { ref, type Ref } from "vue";
import { ElMessage } from "element-plus";
import { useRoute, useRouter } from "vue-router";
import type {
  AttachmentNode,
  DeleteAttachmentRequest,
  FolderNode
} from "@/api/types/attachment";
import { deleteAttachmentOrFolder, restoreFolder } from "@/api/attachment";
import { useNewFolderDialog } from "@/utils/attachment/useNewFolderDialog";
import { useMoveAttachmentDialog } from "@/utils/attachment/useMoveAttachmentDialog";
import { useDeleteAttachment } from "@/utils/attachment/useDeleteAttachment";

export const useAction = ({
  params,
  treeFileList,
  fetchData,
  fetchFolderList,
  getGroupedSelectedIds
}: {
  params: Record<string, any>;
  treeFileList: Ref<FolderNode[]>;
  fetchData: () => void;
  fetchFolderList: (force?: boolean) => void;
  getGroupedSelectedIds: () => { folder: number[]; file: number[] };
}) => {
  const router = useRouter();
  const route = useRoute();

  /** 预览图片 */
  const showPreview = ref(false);
  const previewInfo = ref<{ url: string; name: string }>({ url: "", name: "" });

  /** 删除附件 / 文件夹 */
  const { handleDelete } = useDeleteAttachment({
    onSuccess: item => {
      fetchData();
      if (item.type === "folder") fetchFolderList(true);
    }
  });

  /** 下载文件 */
  const handleDownload = async (url: string, fileName: string) => {
    const downloadUrl = url.replace("/storage/", "/file/download/");
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error("下载失败");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("下载失败:", error);
    }
  };

  /** 新建文件夹 */
  const { handleNewFolder } = useNewFolderDialog({
    getParentId: () => (params.folder_id == -1 ? 0 : params.folder_id),
    getTreeData: () => treeFileList.value.filter(i => i.id !== -1),
    onSuccess: () => {
      fetchFolderList(true);
      fetchData();
    }
  });

  /** 批量移动附件到指定文件夹 */
  const { handleMoveAttachment } = useMoveAttachmentDialog({
    getAttachmentIds: () => getGroupedSelectedIds().file,
    getTreeData: () => treeFileList.value.filter(i => i.id !== -1),
    onSuccess: () => fetchData()
  });

  /** 批量删除 */
  const handleDeleteBatch = () => {
    const { folder, file } = getGroupedSelectedIds();
    const data: DeleteAttachmentRequest = {
      attachment_ids: file.join(","),
      folder_ids: folder.join(","),
      recycle: params.folder_id == -1 ? 0 : 1
    };
    deleteAttachmentOrFolder(data)
      .then((res: any) => {
        ElMessage.success(res.msg);
        fetchFolderList(true);
        fetchData();
      })
      .catch(() => {});
  };

  /** 点击文件/文件夹 */
  const handleClick = (item: AttachmentNode) => {
    if (item.type == "folder") {
      if (params.folder_id === -1) return;
      router.push({
        path: route.path,
        query: { folder_id: item.id }
      });
    } else if (item.mime_type.includes("image")) {
      showPreview.value = true;
      previewInfo.value = {
        url: item.file_url,
        name: item.original_name
      };
    } else {
      const isPdf = item.extension.includes("pdf");
      let path = import.meta.env.VITE_API_DOMAIN + item.file_path;
      if (!isPdf) {
        path = `https://view.officeapps.live.com/op/view.aspx?src=${path}`;
      }
      window.open(path, "_blank");
    }
  };

  /** 批量恢复 */
  const handleRestoreBatch = () => {
    const { folder, file } = getGroupedSelectedIds();
    const data: DeleteAttachmentRequest = {
      attachment_ids: file.join(","),
      folder_ids: folder.join(",")
    };
    restoreFolder(data)
      .then((res: any) => {
        ElMessage.success(res.msg);
        fetchFolderList(true);
        fetchData();
      })
      .catch(() => {});
  };

  /** ESC 关闭预览 */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && showPreview.value) {
      showPreview.value = false;
      previewInfo.value = { url: "", name: "" };
    }
  };

  return {
    showPreview,
    previewInfo,
    handleDelete,
    handleDownload,
    handleNewFolder,
    handleDeleteBatch,
    handleMoveAttachment,
    handleClick,
    handleRestoreBatch,
    handleKeyDown
  };
};
