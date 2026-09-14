import { ref } from "vue";
import { ElMessage, type UploadRequestOptions } from "element-plus";
import { uploadFile } from "@/api/attachment";
import { useUserStoreHook } from "@/store/modules/user";
import type { FileNode } from "@/api/types/attachment";

/**
 * 上传附件
 * @param getFolderId 上传目标目录
 * @param onSuccess 上传成功后的回调，参数为上传结果
 */
export const useAttachmentUpload = ({
  getFolderId,
  onSuccess
}: {
  getFolderId: () => number;
  onSuccess: (file: FileNode) => void;
}) => {
  const uploading = ref(false);

  /** el-upload 自定义上传 */
  const handleUpload = async (options: UploadRequestOptions) => {
    uploading.value = true;
    try {
      const res = await uploadFile({
        user_id: useUserStoreHook().userInfo.id,
        folder_id: getFolderId(),
        file: options.file
      });
      ElMessage.success("上传成功");
      onSuccess(res.data);
      return res;
    } catch {
      return Promise.reject();
    } finally {
      uploading.value = false;
    }
  };

  return { uploading, handleUpload };
};
