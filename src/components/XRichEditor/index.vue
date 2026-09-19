<template>
  <div class="rich-editor">
    <div ref="toolbarRef" class="rich-editor__toolbar" />
    <div ref="editorRef" class="rich-editor__body" :style="{ height }" />
  </div>
</template>

<script setup lang="ts">
import "@wangeditor/editor/dist/css/style.css";
import { ref, shallowRef, watch, onMounted, onBeforeUnmount } from "vue";
import { createEditor, createToolbar } from "@wangeditor/editor";
import type {
  IDomEditor,
  IEditorConfig,
  IToolbarConfig
} from "@wangeditor/editor";
import { openAttachmentDialog } from "@/components/XAttachmentPicker/useAttachmentDialog";

defineOptions({ name: "XRichEditor" });

interface Props {
  /** 富文本内容（HTML） */
  modelValue?: string;
  /** 编辑区域高度 */
  height?: string;
  /** 占位提示 */
  placeholder?: string;
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: "",
  height: "320px",
  placeholder: "请输入内容..."
});

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const mode = "default";
const editorRef = ref<HTMLDivElement>();
const toolbarRef = ref<HTMLDivElement>();
const editor = shallowRef<IDomEditor>();
/** 编辑器当前内容，用于区分内外部变更 */
const innerHtml = ref(props.modelValue ?? "");

const toolbarConfig: Partial<IToolbarConfig> = {
  excludeKeys: ["group-video", "fullScreen"]
};

const editorConfig: Partial<IEditorConfig> = {
  placeholder: props.placeholder,
  onChange: (instance: IDomEditor) => {
    const html = instance.getHtml();
    innerHtml.value = html;
    if (html !== props.modelValue) emit("update:modelValue", html);
  },
  MENU_CONF: {
    uploadImage: {
      /** 插入图片改为从项目附件库选择（弹窗内也支持上传文件） */
      customBrowseAndUpload(
        insertFn: (url: string, alt: string, href: string) => void
      ) {
        openAttachmentDialog({
          title: "选择图片",
          multiple: true,
          limit: 9,
          onConfirm: urls => {
            // 弹窗关闭后恢复编辑器选区，保证图片插入到原光标位置
            editor.value?.restoreSelection();
            urls.forEach(url => insertFn(url, "", url));
          }
        });
      }
    }
  }
};

/** 外部值变化时同步到编辑器 */
watch(
  () => props.modelValue,
  value => {
    const next = value ?? "";
    if (next === innerHtml.value) return;
    innerHtml.value = next;
    editor.value?.setHtml(next);
  }
);

onMounted(() => {
  if (!editorRef.value || !toolbarRef.value) return;

  editor.value = createEditor({
    selector: editorRef.value,
    html: props.modelValue || "",
    config: editorConfig,
    mode
  });

  createToolbar({
    editor: editor.value,
    selector: toolbarRef.value,
    config: toolbarConfig,
    mode
  });
});

onBeforeUnmount(() => {
  editor.value?.destroy();
  editor.value = undefined;
});
</script>

<style scoped>
.rich-editor {
  z-index: 0;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
}

.rich-editor__toolbar {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.rich-editor__body {
  overflow-y: hidden;
}
</style>
