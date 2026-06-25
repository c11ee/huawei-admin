import { Ref, ref } from "vue";
import type { VxeGridInstance } from "vxe-table";

export function useSelection(gridRef: Ref<VxeGridInstance | null>, emit: any) {
  const selectedRows = ref<any[]>([]);
  const selectedCount = ref(0);

  // 统一更新选中的数据状态
  const handleCheckboxChange = () => {
    const $grid = gridRef.value;
    if ($grid) {
      // 获取复选框选中的行记录（传入 true 表示获取跨多页记忆的完整保留记录）
      const records = $grid.getCheckboxRecords(true);
      selectedRows.value = records;
      selectedCount.value = records.length;
      emit("update:selectedRows", records);
    }
  };

  // 外部控制反转：设置指定行勾选状态
  const setCheckboxRow = (rows: any[], checked: boolean) => {
    gridRef.value?.setCheckboxRow(rows, checked);
    handleCheckboxChange();
  };

  // 外部控制反转：清除所有页面的勾选状态
  const clearCheckboxRow = () => {
    gridRef.value?.clearCheckboxRow();
    handleCheckboxChange();
  };

  return {
    selectedRows,
    selectedCount,
    handleCheckboxChange,
    setCheckboxRow,
    clearCheckboxRow
  };
}
