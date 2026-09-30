import { nextTick, ref } from "vue";

export const useContextMenu = ({
  params,
  canOpen
}: {
  params: { folder_id: number };
  /** 判断该节点是否存在可见的菜单项（权限不足时菜单项会全部隐藏），返回 false 则不弹出菜单 */
  canOpen?: (type: "tree-folder" | "folder" | "file") => boolean;
}) => {
  const dropdownRef = ref();
  const dropdownTriggerRef = ref();
  const dropdownEditRow = ref<any>();

  const handleRightClick = (
    e: Event,
    type: "tree-folder" | "folder" | "file",
    item: any
  ) => {
    if (
      (["folder", "tree-folder"].includes(type) && [0, -1].includes(item.id)) ||
      (type === "folder" && params.folder_id === -1) ||
      !item.id
    )
      return;

    if (canOpen && !canOpen(type)) return;

    if (["folder", "tree-folder"].includes(type)) {
      dropdownEditRow.value = { id: item.id, type: "folder" };
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

  return {
    dropdownRef,
    dropdownTriggerRef,
    dropdownEditRow,
    handleRightClick,
    handleDropdownVisibleChange
  };
};
