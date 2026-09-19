<template>
  <!-- 照片墙 -->
  <div ref="wallRef" class="flex flex-wrap gap-2">
    <div
      v-for="(url, index) in urls"
      :key="url + index"
      class="attachment-item group relative overflow-hidden rounded-md border border-[#d9d9d9]"
      :style="tileStyle"
    >
      <el-image :src="url" class="size-full" fit="cover" />
      <!-- 悬停操作：拖拽 / 放大 / 删除 -->
      <div
        class="absolute inset-0 flex items-center justify-center gap-x-3 bg-black/50 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <el-icon
          v-if="sortableEnabled"
          class="attachment-drag-handle cursor-move"
          :size="iconSize"
        >
          <Rank />
        </el-icon>
        <el-icon
          v-if="isImageUrl(url)"
          class="cursor-pointer"
          :size="iconSize"
          @click.stop="handlePreview(urls, index)"
        >
          <ZoomIn />
        </el-icon>
        <el-icon
          class="cursor-pointer"
          :size="iconSize"
          @click.stop="handleRemove(index)"
        >
          <Delete />
        </el-icon>
      </div>
    </div>

    <div
      v-if="canAdd"
      class="flex items-center justify-center rounded-md border border-dashed border-[#d9d9d9] text-[#8c939d] cursor-pointer transition-colors hover:border-[#077aff] hover:text-[#077aff]"
      :style="tileStyle"
      @click="open"
    >
      <el-icon :size="iconSize + 6"><Plus /></el-icon>
    </div>
  </div>

  <!-- 图片放大预览 -->
  <el-image-viewer
    v-if="previewVisible"
    :url-list="previewList"
    :initial-index="previewIndex"
    teleported
    @close="previewVisible = false"
  />
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { Delete, Plus, Rank, ZoomIn } from "@element-plus/icons-vue";
import Sortable from "sortablejs";
import { isImageUrl } from "@/utils/attachment/common";
import { openAttachmentDialog } from "./useAttachmentDialog";

defineOptions({ name: "XAttachmentPicker" });

interface Props {
  /** 已选附件：单张为 URL 字符串，多张为 URL 数组 */
  modelValue?: string | string[];
  /** 是否多选，默认单选 */
  multiple?: boolean;
  /** 最多可选数量，多选默认 9 张，单选固定 1 张 */
  limit?: number;
  /** 弹窗标题 */
  title?: string;
  /** 缩略图尺寸（px），默认 96，表格等紧凑场景可传小一些 */
  size?: number;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  multiple: false,
  limit: undefined,
  title: "选择附件",
  size: 96
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | string[]): void;
}>();

const previewList = ref<string[]>([]);
const previewVisible = ref(false);
const previewIndex = ref(0);
const wallRef = ref<HTMLElement>();

/** 缩略图 / 添加按钮尺寸 */
const tileStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`
}));

/** 悬停操作图标尺寸 */
const iconSize = computed(() => (props.size >= 80 ? 18 : 14));

/** 已选附件 URL 列表 */
const urls = computed<string[]>(() => {
  if (props.multiple) {
    return Array.isArray(props.modelValue) ? props.modelValue : [];
  }
  return typeof props.modelValue === "string" && props.modelValue
    ? [props.modelValue]
    : [];
});

/** 最大可选数量 */
const limit = computed(() => props.limit ?? (props.multiple ? 9 : 1));

/** 是否还能继续添加 */
const canAdd = computed(() => urls.value.length < limit.value);

/** 多张时才允许拖拽调整顺序 */
const sortableEnabled = computed(() => urls.value.length > 1);

let sortable: Sortable | null = null;

/** 拖拽结束事件（仅取用排序所需字段） */
interface DragEndEvent {
  item: HTMLElement;
  oldIndex?: number;
  newIndex?: number;
}

/** 撤销 sortablejs 对 DOM 的直接移动，交还给 Vue 按数据顺序渲染 */
const revertSortableDom = (evt: DragEndEvent) => {
  const parent = evt.item.parentNode as HTMLElement | null;
  if (!parent || evt.oldIndex === undefined) return;
  parent.removeChild(evt.item);
  parent.insertBefore(evt.item, parent.children[evt.oldIndex] ?? null);
};

/** 拖拽结束后按新旧下标重排附件 */
const handleSortEnd = (evt: DragEndEvent) => {
  const { oldIndex, newIndex } = evt;
  revertSortableDom(evt);
  if (
    oldIndex === undefined ||
    newIndex === undefined ||
    oldIndex === newIndex
  ) {
    return;
  }
  const next = urls.value.slice();
  const [moved] = next.splice(oldIndex, 1);
  next.splice(newIndex, 0, moved);
  emit("update:modelValue", props.multiple ? next : (next[0] ?? ""));
};

onMounted(() => {
  if (!wallRef.value) return;
  sortable = Sortable.create(wallRef.value, {
    animation: 160,
    handle: ".attachment-drag-handle",
    draggable: ".attachment-item",
    ghostClass: "sortable-ghost",
    disabled: !sortableEnabled.value,
    onEnd: handleSortEnd
  });
});

watch(sortableEnabled, enabled => sortable?.option("disabled", !enabled));

onBeforeUnmount(() => {
  sortable?.destroy();
  sortable = null;
});

/** 打开选择器 */
const open = () => {
  openAttachmentDialog({
    title: props.title,
    multiple: props.multiple,
    limit: limit.value,
    initialUrls: urls.value,
    onConfirm: list => {
      emit("update:modelValue", props.multiple ? list : (list[0] ?? ""));
    }
  });
};

/** 移除照片墙上的附件 */
const handleRemove = (index: number) => {
  const next = urls.value.slice();
  next.splice(index, 1);
  emit("update:modelValue", props.multiple ? next : "");
};

/** 放大预览（仅图片，非图片忽略） */
const handlePreview = (list: string[], index: number) => {
  const url = list[index];
  if (!isImageUrl(url)) return;
  const images = list.filter(isImageUrl);
  previewList.value = images;
  previewIndex.value = images.indexOf(url);
  previewVisible.value = true;
};
</script>

<style scoped>
.sortable-ghost {
  opacity: 0.6;
}
</style>
