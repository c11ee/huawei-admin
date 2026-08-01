import { h, reactive, ref, type Ref } from "vue";
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElTreeSelect
} from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { useRoute, useRouter } from "vue-router";
import {
  type AddFolderRequest,
  type AttachmentNode,
  type DeleteAttachmentRequest,
  type FolderNode
} from "@/api/types/attachment";
import {
  addFolder,
  deleteAttachmentOrFolder,
  restoreFolder
} from "@/api/attachment";

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

  const handleDelete = (item: AttachmentNode) => {
    ElMessageBox.confirm("确定要删除此文件吗？")
      .then(() => {
        const data: DeleteAttachmentRequest = {
          attachment_ids: item.type === "file" ? String(item.id) : "",
          folder_ids: item.type === "folder" ? String(item.id) : "",
          recycle: 1
        };
        deleteAttachmentOrFolder(data)
          .then((res: any) => {
            fetchData();
            if (item.type === "folder") fetchFolderList(true);
            ElMessage.success(res.msg);
          })
          .catch(() => {});
      })
      .catch(() => {});
  };

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
  const handleNewFolder = (pid?: number) => {
    const formData = reactive<AddFolderRequest>({
      parent_id: params.folder_id == -1 ? 0 : pid || params.folder_id || 0,
      name: "",
      sort: 0
    });
    addDialog({
      title: "新建文件夹",
      width: "560px",
      class: "tw",
      alignCenter: true,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(ElForm, { model: formData, labelPosition: "top" }, () => [
          h(
            ElFormItem,
            {
              prop: "att_parent_id",
              label: "所属上级文件夹",
              class: "mb-4"
            },
            () =>
              h(ElTreeSelect, {
                modelValue: formData.parent_id,
                "onUpdate:modelValue": (val: number) => {
                  formData.parent_id = val;
                },
                props: { label: "name", children: "children" },
                nodeKey: "id",
                placeholder: "请选择文件夹",
                size: "large",
                data:
                  treeFileList.value.filter((i: FolderNode) => i.id !== -1) ||
                  [],
                defaultExpandAll: true,
                checkStrictly: true
              })
          ),
          h(
            ElFormItem,
            { prop: "name", label: "新建文件夹名称", class: "mb-0" },
            () =>
              h(ElInput, {
                modelValue: formData.name,
                "onUpdate:modelValue": (val: string) => {
                  formData.name = val;
                },
                onKeyup: (e: KeyboardEvent) => {
                  if (e.key === "Enter") {
                    const dialog = (e.target as HTMLElement).closest(
                      ".el-dialog"
                    );
                    const btn = dialog?.querySelector(
                      ".el-dialog__footer .el-button--primary"
                    ) as HTMLElement | null;
                    btn?.click();
                  }
                },
                placeholder: "请输入文件夹名称",
                size: "large",
                maxlength: 20,
                showWordLimit: true,
                style:
                  "--el-fill-color-blank: transparent;--el-color-info: #848a97;"
              })
          )
        ]),
      beforeSure(done, { closeLoading }) {
        if (!formData.name) {
          ElMessage.error("请输入文件夹名称");
          closeLoading();
          return false;
        }
        addFolder(formData)
          .then((res: any) => {
            ElMessage.success(res.msg);
            closeLoading();
            fetchFolderList(true);
            fetchData();
            done();
          })
          .catch(() => {
            closeLoading();
          });
      }
    });
  };

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
    handleClick,
    handleRestoreBatch,
    handleKeyDown
  };
};
