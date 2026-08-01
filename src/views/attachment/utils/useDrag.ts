import { ref } from "vue";

export const useDrag = (options: { onDrop: (files: File[]) => void }) => {
  const dropContainer = ref(null);
  const isDragOver = ref(false);

  // 拖拽进入
  const handleDragEnter = (e: DragEvent) => {
    isDragOver.value = true;
  };

  // 拖拽离开
  const handleDragLeave = (e: DragEvent) => {
    isDragOver.value = false;
  };

  // 拖拽悬停（必须阻止默认行为）
  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  // 拖拽释放 → 上传
  const handleDrop = (e: DragEvent) => {
    isDragOver.value = false;
    const files = Array.from(e.dataTransfer!.files);
    handleFiles(files);
  };

  // 处理文件
  const handleFiles = (files: File[]) => {
    if (!files.length) return;
    options.onDrop(files);
  };

  return {
    dropContainer,
    isDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    handleFiles,
  };
};
