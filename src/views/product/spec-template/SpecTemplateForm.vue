<template>
  <el-scrollbar max-height="calc(100vh - 240px)">
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="100px"
      label-position="right"
    >
      <el-form-item label="模板名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入规格模板名称"
          maxlength="100"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="规格项">
        <div class="w-full">
          <div ref="itemListRef" class="spec-items">
            <div
              v-for="(item, index) in specList"
              :key="item._uid"
              class="spec-item"
              :data-uid="item._uid"
            >
              <div class="flex items-center gap-x-2">
                <el-icon class="drag-handle item-drag-handle">
                  <Rank />
                </el-icon>
                <el-input
                  v-model="item.name"
                  class="flex-1"
                  placeholder="规格项名称，如：颜色"
                  maxlength="50"
                  show-word-limit
                />
                <el-button
                  link
                  type="danger"
                  :icon="Delete"
                  @click="removeSpecItem(index)"
                />
              </div>

              <div class="spec-values mt-2 ml-6" :data-uid="item._uid">
                <div
                  v-for="(specValue, valueIndex) in item.values"
                  :key="specValue._uid"
                  class="spec-value"
                  :data-uid="specValue._uid"
                >
                  <el-icon class="drag-handle value-drag-handle">
                    <Rank />
                  </el-icon>
                  <el-input
                    v-model="specValue.value"
                    class="flex-1"
                    placeholder="规格值，如：红色"
                    maxlength="50"
                    show-word-limit
                  />
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
      </el-form-item>

      <el-form-item label="状态" prop="status">
        <el-switch
          v-model="formData.status"
          inline-prompt
          :active-value="1"
          :inactive-value="0"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-form-item label="排序" prop="sort">
        <el-input-number
          v-model="formData.sort"
          :min="0"
          :max="9999"
          controls-position="right"
        />
      </el-form-item>
    </el-form>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, nextTick } from "vue";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { Plus, Delete, Rank } from "@element-plus/icons-vue";
import Sortable from "sortablejs";
import type {
  SpecItem,
  SpecTemplate,
  SpecTemplateStatus
} from "@/api/specTemplate";

interface Props {
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: SpecTemplate | null;
}

interface SpecValueDraft {
  /** 本地唯一标识，用于拖拽排序与列表渲染 */
  _uid: string;
  value: string;
}

interface SpecItemDraft {
  _uid: string;
  name: string;
  values: SpecValueDraft[];
}

/** 拖拽结束事件（仅取用排序所需字段） */
interface DragEndEvent {
  item: HTMLElement;
  oldIndex?: number;
  newIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  row: null
});

const formRef = ref<FormInstance>();
const itemListRef = ref<HTMLElement>();

/** 本地唯一标识生成器 */
let uidSeed = 0;
const nextUid = () => `spec_${++uidSeed}`;

const createSpecValue = (value = ""): SpecValueDraft => ({
  _uid: nextUid(),
  value
});

const createSpecItem = (item?: SpecItem): SpecItemDraft => ({
  _uid: nextUid(),
  name: item?.name ?? "",
  values: item?.values?.length
    ? item.values.map(value => createSpecValue(value.value))
    : [createSpecValue()]
});

const formData = reactive({
  id: props.row?.id ?? undefined,
  name: props.row?.name ?? "",
  status: (props.row?.status ?? 1) as SpecTemplateStatus,
  sort: props.row?.sort ?? 0
});

const specList = ref<SpecItemDraft[]>(
  props.row?.spec_json?.length
    ? props.row.spec_json.map(item => createSpecItem(item))
    : [createSpecItem()]
);

const rules: FormRules = {
  name: [
    { required: true, message: "请输入规格模板名称", trigger: "blur" },
    { max: 100, message: "规格模板名称不能超过100个字符", trigger: "blur" }
  ]
};

// ─── 拖拽排序 ───────────────────────────────────────────────────────

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

let itemSortable: Sortable | null = null;
const valueSortableMap = new Map<string, Sortable>();

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
    }
  });
};

/** 为每个规格项的值容器初始化拖拽（新增的创建，已删除的销毁） */
const syncValueSortables = () => {
  const root = itemListRef.value;
  if (!root) return;

  const validUids = new Set(specList.value.map(item => item._uid));
  valueSortableMap.forEach((instance, uid) => {
    if (!validUids.has(uid)) {
      instance.destroy();
      valueSortableMap.delete(uid);
    }
  });

  root.querySelectorAll<HTMLElement>(".spec-values").forEach(container => {
    const uid = container.dataset.uid;
    if (!uid || valueSortableMap.has(uid)) return;
    const specItem = specList.value.find(item => item._uid === uid);
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
        }
      })
    );
  });
};

/** 结构变更后重新同步规格值拖拽实例 */
const refreshValueSortables = () => {
  nextTick(syncValueSortables);
};

const addSpecItem = () => {
  specList.value.push(createSpecItem());
  refreshValueSortables();
};

const removeSpecItem = (index: number) => {
  specList.value.splice(index, 1);
  refreshValueSortables();
};

const addSpecValue = (item: SpecItemDraft) => {
  item.values.push(createSpecValue());
  refreshValueSortables();
};

const removeSpecValue = (item: SpecItemDraft, index: number) => {
  item.values.splice(index, 1);
  refreshValueSortables();
};

/** 获取表单数据（供 dialog beforeSure 回调调用） */
const getFormData = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return null;

  const emptyItem = specList.value.find(item => !item.name.trim());
  if (!specList.value.length || emptyItem) {
    ElMessage.warning("规格项名称不能为空");
    return null;
  }

  const invalidItem = specList.value.find(
    item => !item.values.length || item.values.some(v => !v.value.trim())
  );
  if (invalidItem) {
    ElMessage.warning(`规格项「${invalidItem.name}」的规格值不能为空`);
    return null;
  }

  return {
    id: formData.id,
    name: formData.name,
    sort: formData.sort,
    status: formData.status,
    spec_json: specList.value.map(item => ({
      name: item.name.trim(),
      values: item.values.map(value => ({ value: value.value.trim() }))
    }))
  };
};

defineExpose({ getFormData });

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

.spec-values {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.spec-value {
  display: flex;
  align-items: center;
  gap: 8px;
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
</style>
