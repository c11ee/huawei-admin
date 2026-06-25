import { PopoverInstance } from "element-plus";
import { computed, ref, watch, Ref } from "vue";
import type { VxeGridPropTypes } from "vxe-table";

export function useFilter(
  rawData: Ref<any[]>,
  columns: Ref<VxeGridPropTypes.Column[]>
) {
  // --- 状态定义 ---
  const renderData = ref<any[]>([]);
  /** 筛选菜单项映射表 */
  const filterMap = ref<Record<string, any[]>>({});
  /** 已选筛选条件映射表 */
  const filterSelectedValues = ref<Record<string, any[]>>({});

  // UI 交互状态
  const filterPopoverVisible = ref(false);
  const filterPopoverRef = ref<PopoverInstance | null>(null);
  const filterPopoverTriggerRef = ref<HTMLElement | null>(null);
  const currentFilterField = ref<string>("");

  // 提取开启了本地筛选的列
  const localFilterColumns = computed(() => {
    return (columns.value || []).filter(
      col => col.params?.localFilter && col.field
    );
  });

  // --- 核心逻辑 ---

  /**
   * 根据当前页面“可见数据 (renderData)”生成菜单项
   */
  const updateFilterMapByVisibleData = () => {
    const currentVisibleData = renderData.value || [];
    const newMap: Record<string, Set<any>> = {};

    // 初始化当前所有筛选列的 Set
    localFilterColumns.value.forEach(col => {
      newMap[col.field!] = new Set();
    });

    // 从当前可见数据中提取可选项
    currentVisibleData.forEach(row => {
      localFilterColumns.value.forEach(col => {
        const field = col.field!;
        if (row[field] !== undefined && row[field] !== null) {
          newMap[field].add(row[field]);
        }
      });
    });

    // 转换成标准数组供前端渲染
    filterMap.value = Object.fromEntries(
      Object.entries(newMap).map(([key, set]) => [key, Array.from(set)])
    );
  };

  /**
   * 执行本地数据过滤 (多列 AND 逻辑)
   */
  const doFilter = () => {
    const data = rawData.value || [];

    // 检查是否有任何筛选处于激活状态
    const hasActiveFilter = Object.values(filterSelectedValues.value).some(
      v => v && v.length > 0
    );

    // 如果没有勾选任何条件，恢复完整的原始数据
    if (!hasActiveFilter) {
      renderData.value = [...data];
      return;
    }

    // 正常的过滤逻辑
    renderData.value = data.filter(row => {
      return localFilterColumns.value.every(col => {
        const field = col.field!;
        const selected = filterSelectedValues.value[field];
        if (!selected || selected.length === 0) return true;
        return selected.includes(row[field]);
      });
    });
  };

  /**
   * 统一初始化或刷新入口
   * 确保过滤数据和筛选菜单的步调完全一致
   */
  const refreshFilterWorkflow = () => {
    doFilter();
    updateFilterMapByVisibleData();
  };

  // --- UI 事件处理 ---

  const handleFilterIconClick = (event: MouseEvent, field: string) => {
    currentFilterField.value = field;
    filterPopoverTriggerRef.value = event.target as HTMLElement;
    filterPopoverVisible.value = true;
  };

  const handleCloseFilterPopover = () => {
    filterPopoverTriggerRef.value = null;
    currentFilterField.value = "";
    filterPopoverVisible.value = false;
  };

  // 用户点击确定的常规触发
  const applyLocalFilter = () => {
    refreshFilterWorkflow();
    handleCloseFilterPopover();
  };

  // 用户点击重置的常规触发
  const resetLocalFilter = (field: string) => {
    if (filterSelectedValues.value[field]) {
      filterSelectedValues.value[field] = [];
    }
    refreshFilterWorkflow();
    handleCloseFilterPopover();
  };

  // --- 显式监听 ---

  // 仅当原始数据源被重置、重新赋值（如异步请求返回）时，才重新计算
  // 加上 immediate: true 确保组件挂载时能有初始数据
  watch(
    () => rawData.value,
    () => {
      refreshFilterWorkflow();
    },
    { immediate: true, deep: true }
  );

  return {
    renderData,
    filterMap,
    filterSelectedValues,
    filterPopoverVisible,
    filterPopoverRef,
    filterPopoverTriggerRef,
    currentFilterField,
    localFilterColumns,
    handleFilterIconClick,
    applyLocalFilter,
    resetLocalFilter,
    handleCloseFilterPopover
  };
}
