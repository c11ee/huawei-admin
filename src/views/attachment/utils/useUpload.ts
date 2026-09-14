import { ref } from "vue";
import { useAttachmentUpload } from "@/utils/attachment/useAttachmentUpload";

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

  /** 拖拽上传 */
  const handleDragUpload = (files: File[]) => {
    uploadRef.value.handleStart(files[0]);
    uploadRef.value.submit();
  };

  return { uploading, uploadRef, handleUpload, handleDragUpload };
};
