<template>
  <!-- 照片墙 -->
  <div class="flex flex-wrap gap-2">
    <div
      v-for="(url, index) in urls"
      :key="url + index"
      class="group relative size-24 overflow-hidden rounded-md border border-[#d9d9d9]"
    >
      <el-image :src="url" class="size-full" fit="cover" />
      <!-- 悬停操作：放大 / 删除 -->
      <div
        class="absolute inset-0 flex items-center justify-center gap-x-4 bg-black/50 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      >
        <el-icon
          v-if="isImageUrl(url)"
          class="cursor-pointer"
          :size="18"
          @click.stop="handlePreview(urls, index)"
        >
          <ZoomIn />
        </el-icon>
        <el-icon
          class="cursor-pointer"
          :size="18"
          @click.stop="handleRemove(index)"
        >
          <Delete />
        </el-icon>
      </div>
    </div>

    <div
      v-if="canAdd"
      class="size-24 flex items-center justify-center rounded-md border border-dashed border-[#d9d9d9] text-[#8c939d] cursor-pointer transition-colors hover:border-[#077aff] hover:text-[#077aff]"
      @click="open"
    >
      <el-icon :size="24"><Plus /></el-icon>
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
import { computed, h, ref } from "vue";
import { ElButton } from "element-plus";
import { Delete, Plus, ZoomIn } from "@element-plus/icons-vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import { isImageUrl } from "@/utils/attachment/common";
import AttachmentDialog from "./AttachmentDialog.vue";

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
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  multiple: false,
  limit: undefined,
  title: "选择附件"
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string | string[]): void;
}>();

const previewList = ref<string[]>([]);
const previewVisible = ref(false);
const previewIndex = ref(0);
/** 弹窗中当前已选中的附件 URL */
const selectedUrls = ref<string[]>([]);

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

/** 打开选择器 */
const open = () => {
  selectedUrls.value = urls.value.slice();

  addDialog({
    title: props.title,
    width: "900px",
    alignCenter: true,
    contentRenderer: () =>
      h(AttachmentDialog, {
        initialUrls: urls.value,
        multiple: props.multiple,
        limit: limit.value,
        onSelect: (list: string[]) => {
          selectedUrls.value = list;
        }
      }),
    footerRenderer: ({ options, index }) =>
      h("div", { class: "flex items-center justify-between" }, [
        h(
          "span",
          { class: "text-xs text-gray-400" },
          props.multiple
            ? `已选 ${selectedUrls.value.length} / ${limit.value} 张`
            : ""
        ),
        h("div", [
          h(
            ElButton,
            {
              onClick: () => closeDialog(options, index, { command: "cancel" })
            },
            () => "取消"
          ),
          h(
            ElButton,
            {
              type: "primary",
              disabled: !selectedUrls.value.length,
              onClick: () => {
                handleConfirm();
                closeDialog(options, index, { command: "sure" });
              }
            },
            () => "确定"
          )
        ])
      ])
  });
};

/** 确定选择 */
const handleConfirm = () => {
  emit(
    "update:modelValue",
    props.multiple ? selectedUrls.value : (selectedUrls.value[0] ?? "")
  );
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
