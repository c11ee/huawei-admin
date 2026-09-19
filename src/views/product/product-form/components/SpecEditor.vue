<template>
  <div class="w-full">
    <div ref="itemListRef" class="spec-items">
      <div
        v-for="(item, index) in specList"
        :key="item.temp_id"
        class="spec-item"
        :data-uid="item.temp_id"
      >
        <div class="spec-item-head flex flex-wrap items-center gap-x-2 gap-y-2">
          <el-icon class="drag-handle item-drag-handle">
            <Rank />
          </el-icon>
          <el-input
            v-model="item.name"
            class="w-60!"
            placeholder="规格项名称，如：颜色"
            maxlength="50"
          />
          <span class="text-xs text-(--el-text-color-secondary)"
            >规格值需上传图片</span
          >
          <el-switch
            v-model="item.is_image_required"
            :active-value="1"
            :inactive-value="0"
          />
          <el-button
            link
            type="danger"
            :icon="Delete"
            @click="removeSpecItem(index)"
          />
        </div>

        <div class="spec-values mt-2 ml-6" :data-uid="item.temp_id">
          <div
            v-for="(specValue, valueIndex) in item.values"
            :key="specValue.temp_id"
            class="spec-value"
            :data-uid="specValue.temp_id"
          >
            <el-icon class="drag-handle value-drag-handle">
              <Rank />
            </el-icon>
            <div class="spec-value-main">
              <el-input
                v-model="specValue.value"
                class="w-60!"
                placeholder="规格值，如：雅川青"
                maxlength="50"
              />
              <XAttachmentPicker
                v-if="item.is_image_required === 1"
                v-model="specValue.image_url"
                title="选择规格值图片"
                :size="64"
              />
            </div>
            <el-button
              link
              type="danger"
              :icon="Delete"
              @click="removeSpecValue(item, valueIndex)"
            />
          </div>
        </div>

        <el-button
          class="mt-1 ml-6"
          link
          type="primary"
          :icon="Plus"
          @click="addSpecValue(item)"
        >
          添加规格值
        </el-button>
      </div>
    </div>

    <el-button
      class="mt-2"
      type="primary"
      plain
      :icon="Plus"
      @click="addSpecItem"
    >
      添加规格项
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Delete, Plus, Rank } from "@element-plus/icons-vue";
import Sortable from "sortablejs";
import XAttachmentPicker from "@/components/XAttachmentPicker/index.vue";
import { createSpecItem, createSpecValue } from "../composables/useSpecSku";
import type { SpecItemDraft } from "../types";

/** 规格项列表（含规格值），结构变更时触发 change 由父级重新生成 SKU */
const specList = defineModel<SpecItemDraft[]>({ required: true });

const emit = defineEmits<{ change: [] }>();

const itemListRef = ref<HTMLElement>();

/** 拖拽结束事件（仅取用排序所需字段） */
interface DragEndEvent {
  item: HTMLElement;
  oldIndex?: number;
  newIndex?: number;
}

let itemSortable: Sortable | null = null;
const valueSortableMap = new Map<string, Sortable>();

/** 撤销 sortablejs 对 DOM 的直接移动，交还给 Vue 按数据顺序渲染 */
const revertSortableDom = (evt: DragEndEvent) => {
  const parent = evt.item.parentNode as HTMLElement | null;
  if (!parent || evt.oldIndex === undefined) return;
  parent.removeChild(evt.item);
  parent.insertBefore(evt.item, parent.children[evt.oldIndex] ?? null);
};

/** 拖拽结束后按新旧下标重排数组 */
function moveItem<T>(list: T[], oldIndex?: number, newIndex?: number) {
  if (
    oldIndex === undefined ||
    newIndex === undefined ||
    oldIndex === newIndex
  ) {
    return;
  }
  const [moved] = list.splice(oldIndex, 1);
  list.splice(newIndex, 0, moved);
}

/** 初始化规格项容器的拖拽 */
const initItemSortable = () => {
  if (!itemListRef.value || itemSortable) return;
  itemSortable = Sortable.create(itemListRef.value, {
    animation: 160,
    handle: ".item-drag-handle",
    draggable: ".spec-item",
    ghostClass: "sortable-ghost",
    onEnd: evt => {
      const { oldIndex, newIndex } = evt;
      revertSortableDom(evt);
      moveItem(specList.value, oldIndex, newIndex);
      emit("change");
    }
  });
};

/** 为每个规格项的值容器初始化拖拽（新增的创建，已删除的销毁） */
const syncValueSortables = () => {
  const root = itemListRef.value;
  if (!root) return;

  const validUids = new Set(specList.value.map(item => item.temp_id));
  valueSortableMap.forEach((instance, uid) => {
    if (!validUids.has(uid)) {
      instance.destroy();
      valueSortableMap.delete(uid);
    }
  });

  root.querySelectorAll<HTMLElement>(".spec-values").forEach(container => {
    const uid = container.dataset.uid;
    if (!uid || valueSortableMap.has(uid)) return;
    const specItem = specList.value.find(item => item.temp_id === uid);
    if (!specItem) return;

    valueSortableMap.set(
      uid,
      Sortable.create(container, {
        animation: 160,
        handle: ".value-drag-handle",
        draggable: ".spec-value",
        ghostClass: "sortable-ghost",
        onEnd: evt => {
          const { oldIndex, newIndex } = evt;
          revertSortableDom(evt);
          moveItem(specItem.values, oldIndex, newIndex);
          emit("change");
        }
      })
    );
  });
};

/** 结构变更后重新同步规格值拖拽实例 */
const refreshValueSortables = () => nextTick(syncValueSortables);

const addSpecItem = () => {
  specList.value.push(createSpecItem());
  emit("change");
};

const removeSpecItem = (index: number) => {
  specList.value.splice(index, 1);
  emit("change");
};

const addSpecValue = (item: SpecItemDraft) => {
  item.values.push(createSpecValue());
  emit("change");
};

const removeSpecValue = (item: SpecItemDraft, index: number) => {
  item.values.splice(index, 1);
  emit("change");
};

// 规格项数量变化或整体替换（选择模板、编辑回填）后，重建规格值拖拽实例
watch(() => specList.value.length, refreshValueSortables);
watch(specList, refreshValueSortables);

onMounted(() => {
  initItemSortable();
  syncValueSortables();
});

onBeforeUnmount(() => {
  itemSortable?.destroy();
  itemSortable = null;
  valueSortableMap.forEach(instance => instance.destroy());
  valueSortableMap.clear();
});
</script>

<style scoped>
.spec-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.spec-item {
  padding: 8px;
  background: var(--el-fill-color-blank);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

/* 规格值横向换行排列，一行展示多个，避免逐行占用高度 */
.spec-values {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
}

.spec-value {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.spec-value-main {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.drag-handle {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--el-text-color-placeholder);
  cursor: move;
  outline: none;
}

.drag-handle:hover {
  color: var(--el-color-primary);
}

.sortable-ghost {
  background: var(--el-color-primary-light-9);
  opacity: 0.6;
}

/* 移动端：规格项/规格值整行铺满，避免固定宽度输入框把内容挤出屏幕 */
@media screen and (max-width: 760px) {
  .spec-item {
    padding: 8px 6px;
  }

  /* 规格项标题行：输入框改为可伸缩，避免 240px 固定宽度导致整行溢出 */
  .spec-item-head :deep(.el-input) {
    flex: 1 1 auto;
    width: auto !important;
    min-width: 0;
  }

  /* 每个规格值占一整行，输入框铺满，图片选择器保持竖排在输入框下方 */
  .spec-value {
    flex: 1 1 100%;
  }

  .spec-value-main {
    flex: 1 1 auto;
    min-width: 0;
  }

  .spec-value-main :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
