import { computed, h, nextTick, reactive, Ref, ref } from "vue";
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
import Selecto from "selecto";
import {
  AddFolderRequest,
  AttachmentNode,
  DeleteAttachmentRequest,
  FolderNode
} from "@/api/types/attachment";
import { addFolder, deleteAttachmentOrFolder, restoreFolder } from "@/api/attachment";

export const useAction = ({
  allFileList,
  treeFileList,
  params,
  fetchData,
  fetchFolderList
}: {
  allFileList: Ref<AttachmentNode[]>;
  treeFileList: Ref<FolderNode[]>;
  params: Record<string, any>;
  fetchData: (isFetchTree?: boolean) => void;
  fetchFolderList: (force?: boolean) => void;
}) => {
  const router = useRouter();
  const route = useRoute();
  const selecto = ref<Selecto>();

  const selectedMaps = ref<Record<string, boolean>>({});
  const selectedCount = computed(() => {
    return Object.values(selectedMaps.value).filter(Boolean).length;
  });
  const isAllSelected = computed(() => {
    return (
      selectedCount.value === allFileList.value.length &&
      selectedCount.value !== 0
    );
  });
  /** 预览图片 */
  const showPreview = ref(false);
  /** 预览图片列表 */
  const previewInfo = ref<{ url: string; name: string }>({
    url: "",
    name: ""
  });
  /** dropdown ref */
  const dropdownRef = ref();
  /** dropdown 触发元素引用 */
  const dropdownTriggerRef = ref();
  const dropdownEditRow = ref<any>();
  const container = ref<HTMLDivElement>();
  const uploadRef = ref<any>();

  const handleDelete = (item: AttachmentNode) => {
    ElMessageBox.confirm("确定要删除此文件吗？")
      .then(() => {
        const data: DeleteAttachmentRequest = {
          attachment_ids: item.type === "file" ? String(item.id) : "",
          folder_ids: item.type === "folder" ? String(item.id) : "",
          recycle: params.folder_id == -1 ? 0 : 1
        };
        deleteAttachmentOrFolder(data)
          .then((res: any) => {
            fetchData();
            if (item.type === "folder") {
              fetchFolderList(true);
            }
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
      link.download = fileName; // 自定义文件名生效
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("下载失败:", error);
    }
  };

  const handleSelectAll = () => {
    isAllSelected.value
      ? (selectedMaps.value = {})
      : (selectedMaps.value = allFileList.value.reduce(
          (prev, cur) => ({
            ...prev,
            [cur.type + cur.id]: true
          }),
          {}
        ));
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
        h(
          ElForm,
          {
            model: formData,
            labelPosition: "top"
          },
          () => [
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
                  props: {
                    label: "name",
                    children: "children"
                  },
                  nodeKey: "id",
                  placeholder: "请选择文件夹",
                  size: "large",
                  // 过滤回收站文件夹
                  data: treeFileList.value.filter(i => i.id !== -1) || [],
                  defaultExpandAll: true,
                  checkStrictly: true
                })
            ),
            h(
              ElFormItem,
              {
                prop: "name",
                label: "新建文件夹名称",
                class: "mb-0"
              },
              () =>
                h(ElInput, {
                  modelValue: formData.name,
                  "onUpdate:modelValue": (val: string) => {
                    formData.name = val;
                  },
                  placeholder: "请输入文件夹名称",
                  size: "large",
                  maxlength: 20,
                  showWordLimit: true,
                  style:
                    "--el-fill-color-blank: transparent;--el-color-info: #848a97;"
                })
            )
          ]
        ),
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

  const clearSelectedMaps = () => {
    selectedMaps.value = {};
  };

  /** 将选中的 ID 按类型分组（folder / file） */
  const getGroupedSelectedIds = () => {
    const folder: number[] = [];
    const file: number[] = [];
    Object.entries(selectedMaps.value).forEach(([key, selected]) => {
      if (!selected) return;
      if (key.startsWith("folder")) {
        folder.push(Number(key.slice(6)));
      } else if (key.startsWith("file")) {
        file.push(Number(key.slice(4)));
      }
    });
    return { folder, file };
  };

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

  const handleClick = (item: AttachmentNode) => {
    if (item.type == "folder") {
      if (params.folder_id === -1) {
        return;
      }

      // 修改路由参数
      router.push({
        path: route.path,
        query: {
          folder_id: item.id
        }
      });
    } else if (item.mime_type.includes("image")) {
      // 预览图片
      showPreview.value = true;
      previewInfo.value = {
        url: import.meta.env.VITE_API_DOMAIN + item.file_path,
        name: item.original_name
      };
    } else {
      const isPdf = item.extension.includes("pdf");
      let path = import.meta.env.VITE_API_DOMAIN + item.file_path;
      // 不为 PDF 使用 Officeapps.live.com 预览
      if (!isPdf) {
        path = `https://view.officeapps.live.com/op/view.aspx?src=${path}`;
      }
      // 文件
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

  const handleRightClick = (
    e: Event,
    type: "tree-folder" | "folder" | "file",
    item: any
  ) => {
    if (
      (["folder", "tree-folder"].includes(type) &&
        [0, -1].includes(item.att_id)) ||
      (type == "folder" && params.folder_id === -1) ||
      !item.att_id
    )
      return;

    if (["folder", "tree-folder"].includes(type)) {
      dropdownEditRow.value = {
        att_id: item.att_id,
        type,
        att_type: 1
      };
    } else {
      dropdownEditRow.value = { ...item, type };
    }

    dropdownTriggerRef.value = e.target;

    nextTick(() => {
      dropdownRef.value.handleOpen();
    });
  };

  const handleDropdownVisibleChange = (visible: boolean) => {
    if (!visible) {
      dropdownEditRow.value = null;
      dropdownTriggerRef.value = undefined;
    }
  };

  const handleSelect = (e: any) => {
    e.added.forEach((el: HTMLElement) => {
      const type = el.dataset.type;
      const id = el.dataset.id;
      selectedMaps.value[type + Number(id)] = true;
    });
    e.removed.forEach((el: HTMLElement) => {
      const type = el.dataset.type;
      const id = el.dataset.id;
      selectedMaps.value[type + Number(id)] = false;
    });
  };

  const initSelecto = () => {
    selecto.value = new Selecto({
      container: container.value,
      dragContainer: container.value,
      selectableTargets: [".file-item"],
      selectByClick: false,
      selectFromInside: true,
      toggleContinueSelect: "shift",
      boundContainer: true,
      checkOverflow: false,
      hitRate: 0,
      continueSelect: true
    });

    selecto.value.on("select", handleSelect);
  };

  /** 键盘按下 */
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      if (showPreview) {
        showPreview.value = false;
        previewInfo.value = { url: "", name: "" };
      }
    }
  };

  /** 拖拽上传 */
  const handleDragUpload = (files: File[]) => {
    console.log("uploadRef.value", uploadRef.value);
    uploadRef.value.handleStart(files[0]);
    uploadRef.value.submit();
  };

  return {
    selecto,
    selectedMaps,
    selectedCount,
    isAllSelected,
    showPreview,
    previewInfo,
    dropdownRef,
    dropdownTriggerRef,
    dropdownEditRow,
    container,
    uploadRef,
    handleDelete,
    handleDownload,
    handleSelectAll,
    handleNewFolder,
    clearSelectedMaps,
    handleDeleteBatch,
    handleClick,
    handleRestoreBatch,
    handleRightClick,
    handleDropdownVisibleChange,
    handleSelect,
    initSelecto,
    handleKeyDown,
    handleDragUpload
  };
};
