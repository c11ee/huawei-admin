import { isNumber } from "@pureadmin/utils";
import { PopoverInstance } from "element-plus";
import { computed, ref, watch, Ref, ComputedRef } from "vue";
import { VxeGridProps } from "vxe-table";

// 补全类型定义（根据你的上下文推断）
interface Column {
  field?: string;
  params?: {
    localFilter?: boolean;
    filterConfig?: Record<string, string>;
  };
}

export function useFilter(
  rawData: Ref<any[]>,
  columns: Ref<Column[]>,
  gridOptions: ComputedRef<VxeGridProps>
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

  // 获取子节点字段名
  const childrenFieldComputed = computed(
    () => gridOptions.value?.treeConfig?.childrenField || "children"
  );

  // 提取开启了本地筛选的列
  const localFilterColumns = computed(() => {
    return (columns.value || []).filter(
      col => col.params?.localFilter && col.field
    );
  });

  // --- 核心逻辑 ---

  /**
   * 检测字符串是否配置筛选配置
   * @return string | number
   */
  const isConfigured = (value: string, index: number = 1) => {
    if (typeof value !== "string") return value;
    const config = value.split("|");
    const configuredValue = config.length > 1 ? config[index] : value;
    const v = Number(configuredValue);

    return !isNaN(v) ? v : configuredValue;
  };

  /**
   * 根据当前页面 "可见数据 (renderData)" 生成菜单项（支持树形数据）
   */
  const updateFilterMapByVisibleData = () => {
    const currentVisibleData = renderData.value || [];
    /** 新的筛选菜单项映射表 */
    const newMap: Record<string, Set<any>> = {};
    /** 筛选配置映射表 */
    const filterConfigMap: Record<string, Record<string, string>> = {};

    // 初始化当前所有筛选列的 Set
    localFilterColumns.value.forEach(col => {
      const field = col.field!;
      newMap[field] = new Set();
      if (col.params?.filterConfig) {
        filterConfigMap[field] = col.params.filterConfig;
      }
    });

    const childrenField = childrenFieldComputed.value;

    // 定义一个深度优先遍历函数来处理树形节点
    const extractRowData = (row: any) => {
      if (!row) return;

      // 1. 提取当前行的数据
      localFilterColumns.value.forEach(col => {
        const field = col.field!;
        let value = row[field];
        if (value !== undefined && value !== null) {
          // 应用筛选配置
          if (filterConfigMap[field]?.[value] !== undefined) {
            value = `${filterConfigMap[field][value]}|${value}`;
          }
          newMap[field].add(value);
        }
      });

      // 2. 递归处理子节点
      const children = row[childrenField];
      if (Array.isArray(children) && children.length > 0) {
        children.forEach(extractRowData);
      }
    };

    // 从当前可见数据中提取可选项
    currentVisibleData.forEach(extractRowData);

    // 转换成标准数组供前端渲染
    filterMap.value = Object.fromEntries(
      Object.entries(newMap).map(([key, set]) => [key, Array.from(set)])
    );
  };

  /**
   * 执行本地数据过滤 (多列 AND 逻辑，支持树形数据结构)
   */
  const doFilter = () => {
    const data = rawData.value || [];

    // 1. 提取真正激活了筛选的配置（过滤掉空数组），并提前解析好 isConfigured 的值
    const activeFilters: Record<string, any[]> = {};
    localFilterColumns.value.forEach(col => {
      const field = col.field!;
      const selected = filterSelectedValues.value[field] || []; // 兜底防止 undefined
      if (selected.length > 0) {
        // 性能优化点：在这里提前解析，避免在行遍历中重复调用 isConfigured
        activeFilters[field] = selected.map(i => isConfigured(i));
      }
    });

    // 如果没有任何筛选处于激活状态，直接引用或浅拷贝，拒绝大对象的 JSON 序列化深拷贝
    if (Object.keys(activeFilters).length === 0) {
      renderData.value = [...data];
      return;
    }

    const childrenField = childrenFieldComputed.value;

    // 判断单行数据是否命中筛选（仅针对已激活筛选的列）
    const isRowMatch = (row: any): boolean => {
      return Object.entries(activeFilters).every(([field, selectedValues]) => {
        return selectedValues.includes(row[field]);
      });
    };

    // 递归过滤树形节点的函数
    const filterTree = (nodes: any[]): any[] => {
      return nodes
        .map(node => {
          if (!node) return null;

          const children = node[childrenField];
          let filteredChildren: any[] = [];

          // 1. 先递归过滤子节点
          if (Array.isArray(children) && children.length > 0) {
            filteredChildren = filterTree(children);
          }

          const isMatch = isRowMatch(node);
          const hasValidChildren = filteredChildren.length > 0;

          // 2. 核心判断：符合条件则组装新节点返回
          if (isMatch || hasValidChildren) {
            return {
              ...node,
              // 如果有经过过滤的子节点，覆盖原有的子节点
              ...(Array.isArray(children)
                ? { [childrenField]: filteredChildren }
                : {})
            };
          }

          return null;
        })
        .filter((node): node is any => node !== null);
    };

    // 执行过滤
    renderData.value = filterTree(data);
  };

  /**
   * 统一初始化或刷新入口
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

  const applyLocalFilter = () => {
    refreshFilterWorkflow();
    handleCloseFilterPopover();
  };

  const resetLocalFilter = (field: string) => {
    if (filterSelectedValues.value[field]) {
      filterSelectedValues.value[field] = [];
    }
    refreshFilterWorkflow();
    handleCloseFilterPopover();
  };

  // --- 显式监听 ---
  // 去掉了 deep: true，提升大数据下的响应式性能。
  watch(
    () => rawData.value,
    () => {
      refreshFilterWorkflow();
    },
    { immediate: true }
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
    isConfigured,
    handleFilterIconClick,
    applyLocalFilter,
    resetLocalFilter,
    handleCloseFilterPopover
  };
}
