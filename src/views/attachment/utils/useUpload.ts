import { ref } from "vue";
import { uploadFile } from "@/api/attachment";
import { useUserStoreHook } from "@/store/modules/user";
import { useAttachmentUpload } from "@/utils/attachment/useAttachmentUpload";

/** 单个文件的上传任务 */
export interface UploadTask {
  uid: string;
  name: string;
  /** 上传进度 0 ~ 100 */
  percent: number;
  status: "uploading" | "success" | "error";
}

export const useUpload = ({
  params,
  onSuccess
}: {
  params: { folder_id: number };
  onSuccess: () => void;
}) => {
  const uploadRef = ref<any>();

  const { uploading, handleUpload } = useAttachmentUpload({
    getFolderId: () => params.folder_id,
    onSuccess
  });

  /** 上传进度弹窗 */
  const uploadDialogVisible = ref(false);
  const uploadTasks = ref<UploadTask[]>([]);

  /**
   * 拖拽上传（支持多个文件）
   * 后端仅支持单个文件，故逐个调用上传接口并记录各自进度
   */
  const handleDragUpload = async (files: File[]) => {
    if (!files.length) return;

    const startTime = Date.now();
    uploadTasks.value = files.map((file, index) => ({
      uid: `${startTime}_${index}`,
      name: file.name,
      percent: 0,
      status: "uploading"
    }));
    uploadDialogVisible.value = true;

    let hasSuccess = false;
    for (let i = 0; i < files.length; i++) {
      const task = uploadTasks.value[i];
      try {
        await uploadFile(
          {
            user_id: useUserStoreHook().userInfo.id,
            folder_id: params.folder_id,
            file: files[i]
          },
          percent => {
            task.percent = percent;
          }
        );
        task.percent = 100;
        task.status = "success";
        hasSuccess = true;
      } catch {
        task.status = "error";
      }
    }

    if (hasSuccess) onSuccess();
  };

  return {
    uploading,
    uploadRef,
    handleUpload,
    handleDragUpload,
    uploadDialogVisible,
    uploadTasks
  };
};
