import { h, reactive } from "vue";
import { ElForm, ElFormItem, ElMessage, ElTreeSelect } from "element-plus";
import { addDialog } from "@/components/ReDialog";
import { updateAttachmentFolderId } from "@/api/attachment";
import type {
  FolderNode,
  UpdateAttachmentFolderRequest
} from "@/api/types/attachment";

/**
 * 「移动到」弹窗（批量修改附件所属文件夹）
 * @param getAttachmentIds 需要移动的附件 ID
 * @param getTreeData 目标文件夹下拉数据
 * @param onSuccess 移动成功后的回调
 */
export const useMoveAttachmentDialog = ({
  getAttachmentIds,
  getTreeData,
  onSuccess
}: {
  getAttachmentIds: () => number[];
  getTreeData: () => FolderNode[];
  onSuccess: () => void;
}) => {
  /** 打开「移动到」弹窗 */
  const handleMoveAttachment = () => {
    const attachmentIds = getAttachmentIds();
    if (!attachmentIds.length) {
      ElMessage.warning("请选择需要移动的附件");
      return;
    }

    const formData = reactive<UpdateAttachmentFolderRequest>({
      attachment_ids: attachmentIds.join(","),
      folder_id: 0
    });

    addDialog({
      title: "移动到",
      width: "560px",
      class: "tw",
      alignCenter: true,
      sureBtnLoading: true,
      contentRenderer: () =>
        h(ElForm, { model: formData, labelPosition: "top" }, () => [
          h(
            ElFormItem,
            { prop: "folder_id", label: "目标文件夹", class: "mb-0" },
            () =>
              h(ElTreeSelect, {
                modelValue: formData.folder_id,
                "onUpdate:modelValue": (val: number) => {
                  formData.folder_id = val;
                },
                props: { label: "name", children: "children" },
                nodeKey: "id",
                placeholder: "请选择文件夹",
                size: "large",
                data: getTreeData() || [],
                defaultExpandAll: true,
                checkStrictly: true
              })
          )
        ]),
      beforeSure(done, { closeLoading }) {
        updateAttachmentFolderId(formData)
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

  return { handleMoveAttachment };
};
