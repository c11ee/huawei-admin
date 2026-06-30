<template>
  <div class="h-full w-full">
    <div
      class="relative h-full w-full"
      @click="handleCaptureClick"
      @mouseover="handleCaptureMouseOver"
      @mouseout="handleCaptureMouseOut"
    >
      <div class="absolute inset-0 overflow-hidden">
        <slot />
      </div>
    </div>
  </div>

  <el-popover
    :visible="popoverVisible"
    :virtual-ref="popoverTriggerRef"
    virtual-triggering
    trigger="click"
    placement="top"
    :width="180"
    popper-style="padding: 12px;"
  >
    <template #default>
      <div class="flex items-start gap-1.5 mb-3">
        <el-icon color="#e6a23c" style="font-size: 16px"
          ><WarningFilled
        /></el-icon>
        <span class="text-xs text-(--el-text-color-regular) select-none">{{
          popoverTitle
        }}</span>
      </div>
      <div class="flex justify-end">
        <el-button size="small" text @click="popoverVisible = false"
          >取消</el-button
        >
        <el-button size="small" type="danger" @click="handlePopoverConfirm"
          >确定</el-button
        >
      </div>
    </template>
  </el-popover>

  <el-tooltip
    :visible="tooltipVisible"
    :virtual-ref="tooltipTriggerRef"
    virtual-triggering
    :content="tooltipContent"
    placement="top"
    effect="dark"
  />

  <el-dropdown
    ref="dropdownRef"
    trigger="contextmenu"
    :virtual-ref="dropdownTriggerRef"
    virtual-triggering
    @command="handleDropdownCommand"
  >
    <span class="hidden"></span>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item
          v-for="item in dropdownActions"
          :key="item.command"
          :command="item.command"
          :disabled="item.disabled"
          :divided="item.divided"
          :style="{ color: item.color }"
        >
          <el-icon v-if="item.icon"><component :is="item.icon" /></el-icon>
          {{ item.label }}
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<!-- 
  <el-button
    link
    type="primary"
    data-proxy-tooltip
    data-tooltip-content="修改权限名称与标识"
    @click="handleEdit(row)"
  >
    编辑
  </el-button>
  <el-divider direction="vertical" />
  <el-button
    link
    type="primary"
    data-proxy-dropdown
    :data-dropdown-actions="JSON.stringify(getMoreActions(row))"
    :data-row-data="JSON.stringify(row)"
  >
    更多
  </el-button>
  <el-divider direction="vertical" />
  <el-button
    link
    type="danger"
    data-proxy-popover
    data-popover-title="确定删除此权限吗？"
    :data-row-data="JSON.stringify(row)"
  >
    删除
  </el-button>
-->
<script setup lang="ts">
import { ref, onBeforeUnmount, nextTick } from "vue";
import { WarningFilled } from "@element-plus/icons-vue";

defineOptions({ name: "XPopperProxy" });

// 定义支持的动作项结构
interface DropdownAction {
  label: string;
  command: string;
  icon?: any;
  color?: string;
  disabled?: boolean;
  divided?: boolean;
}

const emit = defineEmits<{
  (e: "confirm", rowData: any): void;
  (e: "action", data: { command: string; row: any }): void;
}>();

// --- 状态控制 ---
const popoverVisible = ref(false);
const popoverTriggerRef = ref<HTMLElement | null>(null);
const popoverTitle = ref("");
const currentPopoverRow = ref<any>(null);

const tooltipVisible = ref(false);
const tooltipTriggerRef = ref<HTMLElement | null>(null);
const tooltipContent = ref("");

const dropdownTriggerRef = ref<HTMLElement | null>(null);
const dropdownRef = ref();
const dropdownActions = ref<DropdownAction[]>([]);
const currentDropdownRow = ref<any>(null);

const parseRowData = (target: HTMLElement) => {
  if (!target.dataset.rowData) return null;
  try {
    return JSON.parse(target.dataset.rowData);
  } catch {
    return target.dataset.rowData;
  }
};

/** 1. 拦截全局点击（处理 Popover 和 Dropdown） */
const handleCaptureClick = (e: MouseEvent) => {
  const clickTarget = e.target as HTMLElement;

  // 优先处理 Dropdown 触发
  const dropdownTarget = clickTarget.closest(
    "[data-proxy-dropdown]"
  ) as HTMLElement;
  if (dropdownTarget) {
    e.stopPropagation();
    currentDropdownRow.value = parseRowData(dropdownTarget);

    // 从 dataset 中读取动态菜单项配置
    if (dropdownTarget.dataset.dropdownActions) {
      try {
        dropdownActions.value = JSON.parse(
          dropdownTarget.dataset.dropdownActions
        );
      } catch {
        dropdownActions.value = [];
      }
    }

    dropdownTriggerRef.value = dropdownTarget;
    tooltipVisible.value = false; // 触发菜单时关闭 tooltip

    // 利用 Element Plus 的内置方法手动唤醒 Dropdown 浮层
    nextTick(() => {
      dropdownRef.value?.handleOpen?.();
    });
    return;
  }

  // 其次处理 Popover 确认框触发
  const popoverTarget = clickTarget.closest(
    "[data-proxy-popover]"
  ) as HTMLElement;
  if (popoverTarget) {
    e.stopPropagation();
    popoverTitle.value =
      popoverTarget.dataset.popoverTitle || "确定执行此操作吗？";
    currentPopoverRow.value = parseRowData(popoverTarget);
    popoverTriggerRef.value = popoverTarget;
    popoverVisible.value = true;
    tooltipVisible.value = false;
  }
};

/** 2. 拦截鼠标移入（处理 Tooltip） */
const handleCaptureMouseOver = (e: MouseEvent) => {
  const target = (e.target as HTMLElement).closest(
    "[data-proxy-tooltip]"
  ) as HTMLElement;
  if (!target) return;
  if (popoverVisible.value && popoverTriggerRef.value === target) return;

  tooltipContent.value = target.dataset.tooltipContent || "";
  tooltipTriggerRef.value = target;
  tooltipVisible.value = true;
};

/** 3. 拦截鼠标移出（关闭 Tooltip） */
const handleCaptureMouseOut = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest("[data-proxy-tooltip]")) {
    tooltipVisible.value = false;
  }
};

/** Popover 确认回调 */
const handlePopoverConfirm = () => {
  popoverVisible.value = false;
  emit("confirm", currentPopoverRow.value);
};

/** Dropdown 菜单项点击回调 */
const handleDropdownCommand = (command: string) => {
  emit("action", { command, row: currentDropdownRow.value });
};

// 全局点击空白关闭 Popover
const handleWindowClick = (e: MouseEvent) => {
  if (
    popoverVisible.value &&
    popoverTriggerRef.value &&
    !popoverTriggerRef.value.contains(e.target as Node)
  ) {
    popoverVisible.value = false;
  }
};
window.addEventListener("click", handleWindowClick);
onBeforeUnmount(() => window.removeEventListener("click", handleWindowClick));
</script>
