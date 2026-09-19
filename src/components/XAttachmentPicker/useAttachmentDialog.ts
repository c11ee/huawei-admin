import { h, ref } from "vue";
import { ElButton } from "element-plus";
import { addDialog, closeDialog } from "@/components/ReDialog";
import AttachmentDialog from "./AttachmentDialog.vue";

export interface OpenAttachmentDialogOptions {
  /** 弹窗标题 */
  title?: string;
  /** 是否多选，默认单选 */
  multiple?: boolean;
  /** 最多可选数量，多选默认 9 张，单选固定 1 张 */
  limit?: number;
  /** 打开弹窗时已选中的附件 URL */
  initialUrls?: string[];
  /** 点击确定后的回调，单选取数组第一项 */
  onConfirm: (urls: string[]) => void;
}

/**
 * 打开附件选择弹窗（附件列表 + 上传文件 + 新建文件夹）
 * XAttachmentPicker 与富文本编辑器等场景共用
 */
export const openAttachmentDialog = (options: OpenAttachmentDialogOptions) => {
  const {
    title = "选择附件",
    multiple = false,
    initialUrls = [],
    onConfirm
  } = options;
  const limit = options.limit ?? (multiple ? 9 : 1);
  /** 弹窗中当前已选中的附件 URL */
  const selectedUrls = ref<string[]>([]);

  addDialog({
    title,
    width: "900px",
    alignCenter: true,
    contentRenderer: () =>
      h(AttachmentDialog, {
        initialUrls,
        multiple,
        limit,
        onSelect: (list: string[]) => {
          selectedUrls.value = list;
        }
      }),
    footerRenderer: ({ options: dialogOptions, index }) =>
      h("div", { class: "flex items-center justify-between" }, [
        h(
          "span",
          { class: "text-xs text-gray-400" },
          multiple ? `已选 ${selectedUrls.value.length} / ${limit} 张` : ""
        ),
        h("div", [
          h(
            ElButton,
            {
              onClick: () =>
                closeDialog(dialogOptions, index, { command: "cancel" })
            },
            () => "取消"
          ),
          h(
            ElButton,
            {
              type: "primary",
              disabled: !selectedUrls.value.length,
              onClick: () => {
                onConfirm([...selectedUrls.value]);
                closeDialog(dialogOptions, index, { command: "sure" });
              }
            },
            () => "确定"
          )
        ])
      ])
  });
};
