import { nextTick, ref } from "vue";

export const useContextMenu = ({
  params
}: {
  params: { folder_id: number };
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
