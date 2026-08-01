import { ref } from "vue";
import { ElMessage, type UploadRequestOptions } from "element-plus";
import { uploadFile } from "@/api/attachment";
import { useUserStoreHook } from "@/store/modules/user";

export const useUpload = ({
  params,
  onSuccess
}: {
  params: { folder_id: number };
  onSuccess: () => void;
}) => {
  const uploading = ref(false);
  const uploadRef = ref<any>();

  /** el-upload 自定义上传 */
  const handleUpload = async (options: UploadRequestOptions) => {
    uploading.value = true;
    try {
      const res = await uploadFile({
        user_id: useUserStoreHook().userInfo.id,
        folder_id: params.folder_id,
        file: options.file
      });
      ElMessage.success("上传成功");
      onSuccess();
      return res;
    } catch {
      return Promise.reject();
    } finally {
      uploading.value = false;
    }
  };

  /** 拖拽上传 */
  const handleDragUpload = (files: File[]) => {
    uploadRef.value.handleStart(files[0]);
    uploadRef.value.submit();
  };

  return { uploading, uploadRef, handleUpload, handleDragUpload };
};
