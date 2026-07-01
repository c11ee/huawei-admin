<script setup lang="ts">
import { computed, ref, useSlots, toRef, onMounted } from "vue";
import type { VxeGridProps, VxeGridInstance } from "vxe-table";
import { useSelection } from "./hooks/useSelection";
import { useColumns } from "./hooks/useColumns";
import { useSort } from "./hooks/useSort";
import { useFilter } from "./hooks/useFilter";
import { TableColumnSetting } from "../TableColumnSetting";
import { isUnDef } from "@pureadmin/utils";
import { Filter } from "@element-plus/icons-vue";
import { usePagination } from "./hooks/usePagination";

// ─── 1. 类型定义 ───────────────────────────────────────────────────────
interface Props {
  columns: Column[];
  data: any[];
  loading?: boolean;
  rowKey?: string;
  height?: number | string;
  diyKey?: string;
  showSettingHeader?: boolean;
  /** 额外的表格配置 */
  extraGridOptions?: VxeGridProps | null;
  /** 分页配置 */
  pagination?: {
    total: number;
    page: number;
    limit: number;
  };
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  rowKey: "id",
  height: 580,
  showSettingHeader: true,
  extraGridOptions: null
});

const emit = defineEmits(["update:selectedRows", "sort-change"]);

/**
 * 静态高性能 Grid 骨架配置
 */
const gridOptions = computed<VxeGridProps>(() => ({
  id: props.rowKey,
  align: "center",
  border: true,
  height: "auto",
  loading: props.loading,
  autoResize: true,
  rowConfig: { keyField: props.rowKey, isHover: true },
  tooltipConfig: {},
  cellConfig: { height: 48 },
  scrollY: { enabled: true },
  columnConfig: { resizable: true, drag: true, useKey: true },
  columnDragConfig: {
    visibleMethod: ({ column }) => !column.params?.noSetColumn
  },
  virtualYConfig: { enabled: true, gt: 30 },
  virtualXConfig: { enabled: true, gt: 12 },
  checkboxConfig: { reserve: true, trigger: "cell" },
  sortConfig: { remote: true, trigger: "cell" },
  ...(props.extraGridOptions || {})
}));

// ─── 2. 状态与 Hooks 注入 ────────────────────────────────────────────────
const gridRef = ref<VxeGridInstance | null>(null);
const isAllExpanded = ref(false);

// Element Plus 单例气泡状态
const tooltipVisible = ref(false);
const tooltipContent = ref("");
const tooltipTriggerRef = ref<HTMLElement | null>(null);
let tooltipTimer: NodeJS.Timeout | null = null;

// 四层解耦逻辑 Hooks
const {
  handleCheckboxChange,
  setCheckboxRow,
  clearCheckboxRow,
  selectedRows,
  selectedCount
} = useSelection(gridRef, emit);
const {
  renderColumns,
  getColumns,
  handleColumnsChange,
  handleColumnDragEnd,
  handleColumnResizableChange
} = useColumns(props.columns, props.diyKey, gridRef);
const { handleSortChange } = useSort(emit);
const {
  renderData,
  filterPopoverVisible,
  filterPopoverRef,
  filterPopoverTriggerRef,
  currentFilterField,
  filterSelectedValues,
  localFilterColumns,
  filterMap,
  isConfigured,
  handleFilterIconClick,
  applyLocalFilter,
  resetLocalFilter
} = useFilter(toRef(props, "data"), renderColumns, gridOptions);
const { wrapRef, paginationBind } = usePagination(props.pagination);

// ─── 3. 计算属性 ───────────────────────────────────────────────────────

/**
 * 编排并加工最终的渲染列配置
 */
const finalColumns = computed(() => {
  return renderColumns.value.map((col, index) => {
    const item = { ...col };
    item.visible = isUnDef(item.visible) ? true : item.visible;

    // A. 注入本地过滤插槽
    if (item.params?.localFilter && item.field) {
      item.slots = { ...item.slots, header: `filter-header-${item.field}` };
      item.filterMethod = ({ value, row, column }: any) => {
        return String(row[column.field]) === String(value);
      };
    }
    // B. 末尾列追加操作齿轮
    if (props.showSettingHeader && index === renderColumns.value.length - 1) {
      item.fixed = "right";
      item.slots = { ...item.slots, header: "setting-header" };
    }
    // C. 展开行插槽
    if (item.type === "expand") {
      item.slots = { ...item.slots, header: "expand-header" };
    }

    return item;
  });
});

/**
 * 透传外部业务插槽（排除内置的 expand-content）
 */
const vueSlots = useSlots();
const forwardSlots = computed(() =>
  Object.keys(vueSlots).filter(name => name !== "expand-content")
);

// ─── 4. 交互方法 ───────────────────────────────────────────────────────

/**
 * 精确计算并激活 Element Plus 的全局单例 Tooltip (性能优化版)
 */
const handleCellMouseEnter = ({ cell, column }: any) => {
  if (["checkbox", "expand"].includes(column.type) || !column.field) return;

  if (tooltipTimer) clearTimeout(tooltipTimer);

  tooltipTimer = setTimeout(() => {
    const cellEl = cell.querySelector(".vxe-cell--wrapper") as HTMLElement;
    const labelEl = cellEl.querySelector(".vxe-cell--label") as HTMLElement;

    if (labelEl && labelEl.offsetWidth > cellEl.offsetWidth) {
      tooltipTriggerRef.value = cellEl;
      tooltipContent.value = labelEl.innerText;
      tooltipVisible.value = true;
    }
  }, 50);
};

const handleCellMouseLeave = () => {
  if (tooltipTimer) clearTimeout(tooltipTimer);
  tooltipVisible.value = false;
};

const toggleAllExpand = () => {
  isAllExpanded.value = !isAllExpanded.value;
  gridRef.value?.setAllRowExpand(isAllExpanded.value);
};

const handleSizeChange = (val: number) => {
  // props.pagination.limit = val;
};

const handleCurrentChange = (val: number) => {
  // props.pagination.page = val;
};

// ─── 5. 生命周期 & 暴露 API ───────────────────────────────────────────
onMounted(getColumns);

defineExpose({
  setCheckboxRow,
  clearCheckboxRow,
  selectedRows,
  selectedCount,
  getGridRef: () => {
    return gridRef.value;
  }
});
</script>

<template>
  <div class="x-virtual-table-container">
    <vxe-grid
      ref="gridRef"
      v-bind="gridOptions"
      :data="renderData"
      :loading="loading"
      :columns="finalColumns"
      @column-dragend="handleColumnDragEnd"
      @checkbox-change="handleCheckboxChange"
      @checkbox-all="handleCheckboxChange"
      @sort-change="handleSortChange"
      @cell-mouseenter="handleCellMouseEnter"
      @cell-mouseleave="handleCellMouseLeave"
      @column-resizable-change="handleColumnResizableChange"
    >
      <template
        v-for="slotName in forwardSlots"
        :key="slotName"
        #[slotName]="scope"
      >
        <slot :name="slotName" v-bind="scope" />
      </template>

      <template #expand-header>
        <div class="vxe-table--expanded select-none" @click="toggleAllExpand">
          <span class="vxe-table--expand-btn">
            <i
              class="vxe-table-icon-arrow-right"
              :class="{ rotate90: isAllExpanded }"
            ></i>
          </span>
        </div>
      </template>

      <template #expand-content="{ row }">
        <div class="expand-wrapper">
          <slot name="expand-content" :row="row" />
        </div>
      </template>

      <template
        v-for="col in localFilterColumns"
        :key="col.field"
        #[`filter-header-${col.field}`]="{ column }"
      >
        <div class="custom-filter-header">
          <span class="vxe-cell--title">{{ column.title }}</span>
          <el-icon
            class="filter-trigger-icon"
            :class="{ 'is-active': filterSelectedValues[col.field]?.length }"
            @click="handleFilterIconClick($event, col.field)"
          >
            <Filter />
          </el-icon>
        </div>
      </template>

      <template #setting-header="{ column }">
        <div class="setting-header-wrapper">
          <span class="vxe-cell--title">{{ column.title }}</span>
          <TableColumnSetting
            :columns="finalColumns"
            :defaultColumns="props.columns"
            @columns-change="handleColumnsChange"
          />
        </div>
      </template>

      <template #pager v-if="props.pagination">
        <div class="flex justify-between mt-2" ref="wrapRef">
          <slot name="pager-left">
            <div></div>
          </slot>
          <el-pagination
            v-bind="paginationBind"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </template>
    </vxe-grid>

    <!-- 全局 Tooltip -->
    <el-tooltip
      v-model:visible="tooltipVisible"
      :content="tooltipContent"
      :virtual-ref="tooltipTriggerRef"
      virtual-triggering
      placement="top"
      effect="dark"
      :enterable="false"
    />

    <!-- 本地筛选弹窗 -->
    <el-popover
      ref="filterPopoverRef"
      v-model:visible="filterPopoverVisible"
      :virtual-ref="filterPopoverTriggerRef"
      virtual-triggering
      trigger="click"
      width="auto"
      popper-class="table-local-filter-popper"
      popper-style="padding: 12px 0 0;--el-text-color-regular: #000000;"
    >
      <div class="filter-popover-body">
        <el-scrollbar max-height="300px" class="scrollbar-container">
          <el-checkbox-group
            size="small"
            v-model="filterSelectedValues[currentFilterField]"
          >
            <div
              v-for="item in filterMap[currentFilterField]"
              :key="item"
              class="filter-checkbox-item"
            >
              <el-checkbox :value="item">{{
                isConfigured(item, 0)
              }}</el-checkbox>
            </div>
          </el-checkbox-group>
        </el-scrollbar>

        <div class="filter-footer-actions">
          <el-button
            size="small"
            text
            @click="resetLocalFilter(currentFilterField)"
            >重置</el-button
          >
          <el-button size="small" type="primary" @click="applyLocalFilter()"
            >筛选</el-button
          >
        </div>
      </div>
    </el-popover>
  </div>
</template>

<style scoped>
/* 容器 */
.x-virtual-table-container {
  height: 100%;
  width: 100%;
  background: #fff;
  border-radius: 4px;
}

/* 核心文本单行截断（保证 scrollWidth 判定生效的绝对先决条件） */
:deep(.vxe-body--column .vxe-cell .vxe-cell--wrapper) {
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  word-break: break-all;
}

/* 头部自定义布局 */
.custom-filter-header,
.setting-header-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.setting-header-wrapper {
  justify-content: center;
}

/* 过滤图标 */
.filter-trigger-icon {
  color: #333;
  transition: color 0.3s;
  cursor: pointer;
  outline: none;
}
.dark .filter-trigger-icon {
  color: #fff;
}
.filter-trigger-icon:hover,
.filter-trigger-icon.is-active {
  color: var(--el-color-primary);
}

/* 弹窗内容 */
.scrollbar-container {
  padding: 0 8px;
  overflow-x: hidden;
}
.filter-checkbox-item {
  height: 24px;
  line-height: 24px;
}
.filter-footer-actions {
  margin-top: 8px;
  padding: 8px 4px;
  border-top: 1px solid #f2f6fc;
  display: flex;
  justify-content: space-between;
}

/* 展开行包装 */
.expand-wrapper {
  padding: 16px 24px;
  background: #fafafa;
}

/* 样式穿透优化 - Popover 统一变量注入 */
:deep(.table-local-filter-popper) {
  padding: 12px 0 0 !important;
  --el-text-color-regular: #000000;
}
</style>
