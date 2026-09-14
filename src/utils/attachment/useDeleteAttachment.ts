import { ElMessage, ElMessageBox } from "element-plus";
import { deleteAttachmentOrFolder } from "@/api/attachment";
import type { AttachmentNode } from "@/api/types/attachment";

/**
 * 删除附件 / 文件夹（含二次确认，删除进回收站）
 * @param onSuccess 删除成功后的回调，参数为被删除的节点
 */
export const useDeleteAttachment = ({
  onSuccess
}: {
  onSuccess: (item: AttachmentNode) => void;
}) => {
  const handleDelete = async (item: AttachmentNode) => {
    try {
      await ElMessageBox.confirm(
        `确定要删除此${item.type === "folder" ? "文件夹" : "附件"}吗？`,
        "提示",
        { confirmButtonText: "确定", cancelButtonText: "取消", type: "warning" }
      );
    } catch {
      return;
    }

    try {
      const res = await deleteAttachmentOrFolder({
        attachment_ids: item.type === "file" ? String(item.id) : "",
        folder_ids: item.type === "folder" ? String(item.id) : "",
        recycle: 1
      });
      ElMessage.success(res.msg || "删除成功");
      onSuccess(item);
    } catch (error) {
      console.error("删除失败:", error);
    }
  };

  return { handleDelete };
};
