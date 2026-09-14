import { h, reactive } from "vue";
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElTreeSelect
} from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { addFolder } from "@/api/attachment";
import type { AddFolderRequest, FolderNode } from "@/api/types/attachment";

/**
 * 「新建文件夹」弹窗
 * @param getParentId 默认所属上级文件夹
 * @param getTreeData 上级文件夹下拉数据
 * @param onSuccess 新建成功后的回调
 */
export const useNewFolderDialog = ({
  getParentId,
  getTreeData,
  onSuccess
}: {
  getParentId: () => number;
  getTreeData: () => FolderNode[];
  onSuccess: () => void;
}) => {
  /**
   * 打开「新建文件夹」弹窗
   * @param pid 指定所属上级文件夹，优先级高于 `getParentId`
   */
  const handleNewFolder = (pid?: number) => {
    const formData = reactive<AddFolderRequest>({
      parent_id: pid || getParentId() || 0,
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
            { prop: "parent_id", label: "所属上级文件夹", class: "mb-4" },
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
                data: getTreeData() || [],
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
          .then(res => {
            ElMessage.success(res.msg);
            closeLoading();
            onSuccess();
            done();
          })
          .catch(() => {
            closeLoading();
          });
      }
    });
  };

  return { handleNewFolder };
};
