<template>
  <div class="h-130 flex gap-x-3">
    <!-- 文件夹树 -->
    <el-card shadow="never" class="w-50 shrink-0 flex flex-col">
      <!-- <template #header>
        <span class="font-bold">目录</span>
      </template> -->
      <el-scrollbar class="flex-1">
        <el-tree
          ref="treeRef"
          :data="cache.folderTree"
          node-key="id"
          highlight-current
          default-expand-all
          :expand-on-click-node="false"
          :props="{ children: 'children', label: 'name' }"
          @current-change="handleFolderChange"
        />
      </el-scrollbar>
    </el-card>

    <!-- 附件列表 -->
    <div class="flex-1 min-w-0 flex flex-col gap-y-3">
      <div class="flex items-center justify-between">
        <span class="font-bold">附件列表</span>
        <div class="flex items-center gap-x-2">
          <el-button size="small" plain @click="handleNewFolder()">
            新建文件夹
          </el-button>
          <el-upload :http-request="handleUpload" :show-file-list="false">
            <el-button size="small" type="primary" :loading="uploading">
              上传文件
            </el-button>
          </el-upload>
        </div>
      </div>

      <div v-loading="loading" class="flex-1 min-h-0 overflow-hidden">
        <el-scrollbar v-if="cache.fileList.length" class="h-full">
          <div class="flex flex-wrap gap-2">
            <div
              v-for="item in cache.fileList"
              :key="item.type + item.id"
              class="group w-24 cursor-pointer rounded-md border-2 p-1"
              :class="
                isSelected(item) ? 'border-[#077aff]' : 'border-transparent'
              "
              @click="handleItemClick(item)"
            >
              <div
                class="relative h-24 w-full flex items-center justify-center overflow-hidden rounded bg-gray-100"
              >
                <el-image
                  :src="getFileUrl(item)"
                  class="h-full w-full"
                  fit="contain"
                  lazy
                />
                <!-- 悬停操作：放大 / 删除 -->
                <div
                  class="pointer-events-none absolute inset-0 flex items-center justify-center gap-x-4 bg-black/50 text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                >
                  <el-icon
                    v-if="item.type === 'file' && isImageUrl(item.file_url)"
                    class="pointer-events-auto cursor-pointer"
                    :size="18"
                    @click.stop="handlePreviewItem(item)"
                  >
                    <ZoomIn />
                  </el-icon>
                  <el-icon
                    class="pointer-events-auto cursor-pointer"
                    :size="18"
                    @click.stop="handleDelete(item)"
                  >
                    <Delete />
                  </el-icon>
                </div>
                <div
                  v-if="isSelected(item)"
                  class="absolute right-1 top-1 size-4 flex items-center justify-center rounded-full bg-[#077aff] text-white"
                >
                  <el-icon :size="10"><Check /></el-icon>
                </div>
              </div>
              <p class="mt-1! truncate text-center text-xs">
                {{ getName(item) }}
              </p>
            </div>
          </div>
        </el-scrollbar>
        <el-empty v-else-if="!loading" description="暂无附件" />
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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { ElMessage, TableV2SortOrder } from "element-plus";
import { Check, Delete, ZoomIn } from "@element-plus/icons-vue";
import { getAttachmentList, getFolderTree } from "@/api/attachment";
import type { AttachmentNode, FolderNode } from "@/api/types/attachment";
import { useAttachmentUpload } from "@/utils/attachment/useAttachmentUpload";
import { useDeleteAttachment } from "@/utils/attachment/useDeleteAttachment";
import { useNewFolderDialog } from "@/utils/attachment/useNewFolderDialog";
import {
  createRootFolderNode,
  getFileUrl,
  getName,
  isImageUrl
} from "@/utils/attachment/common";
import { cache } from "./cache";

defineOptions({ name: "AttachmentDialog" });

const props = defineProps<{
  /** 打开弹窗时已选中的附件 URL */
  initialUrls: string[];
  /** 是否多选 */
  multiple: boolean;
  /** 最多可选数量 */
  limit: number;
}>();

const emit = defineEmits<{
  (e: "select", urls: string[]): void;
}>();

const treeRef = ref();
const selectedUrls = ref<Set<string>>(new Set(props.initialUrls));
// 首次打开时缓存尚未就绪，先置为加载中，避免闪现「暂无附件」
const loading = ref(!cache.loaded);
const previewList = ref<string[]>([]);
const previewVisible = ref(false);
const previewIndex = ref(0);

/** 选中项变化时同步给父级（弹窗底部文案与确定按钮依赖它） */
watch(selectedUrls, value => emit("select", Array.from(value)), {
  deep: true,
  immediate: true
});

/** 当前目录下的图片 URL 列表（用于预览） */
const fileUrls = computed(() =>
  cache.fileList.filter(item => item.type === "file").map(item => item.file_url)
);

/** 获取文件夹树 */
const fetchFolders = async () => {
  const res = await getFolderTree();
  if (res.code === 200) {
    cache.folderTree = [createRootFolderNode("全部", 0, res.data)];
  }
};

/** 获取当前目录下的附件列表 */
const fetchFiles = async () => {
  loading.value = true;
  try {
    const res = await getAttachmentList({
      folder_id: cache.folderId,
      orderBy: TableV2SortOrder.DESC,
      only_image: 1
    });
    if (res.code === 200) {
      cache.fileList = res.data;
    }
  } catch (error) {
    console.error("获取附件列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 切换文件夹 */
const handleFolderChange = async (data: FolderNode) => {
  if (cache.folderId === data.id) return;
  cache.folderId = data.id;
  await fetchFiles();
};

/** 点击附件：文件夹进入下一级，文件则切换选中 */
const handleItemClick = async (item: AttachmentNode) => {
  if (item.type === "folder") {
    cache.folderId = item.id;
    treeRef.value?.setCurrentKey(item.id);
    await fetchFiles();
    return;
  }

  const url = item.file_url;
  if (selectedUrls.value.has(url)) {
    selectedUrls.value.delete(url);
    return;
  }
  if (!props.multiple) {
    selectedUrls.value = new Set([url]);
    return;
  }
  if (selectedUrls.value.size >= props.limit) {
    ElMessage.warning(`最多选择 ${props.limit} 张图片`);
    return;
  }
  selectedUrls.value.add(url);
};

const isSelected = (item: AttachmentNode) =>
  item.type === "file" && selectedUrls.value.has(item.file_url);

/** 上传附件 */
const { uploading, handleUpload } = useAttachmentUpload({
  getFolderId: () => cache.folderId,
  onSuccess: async file => {
    await fetchFiles();
    handleItemClick(file);
  }
});

/** 删除附件 / 文件夹 */
const { handleDelete } = useDeleteAttachment({
  onSuccess: async item => {
    if (item.type === "file") {
      selectedUrls.value.delete(item.file_url);
    } else {
      await fetchFolders();
    }
    await fetchFiles();
  }
});

/** 新建文件夹 */
const { handleNewFolder } = useNewFolderDialog({
  getParentId: () => cache.folderId,
  getTreeData: () => cache.folderTree,
  onSuccess: () => {
    fetchFolders();
    fetchFiles();
  }
});

/** 放大预览（仅图片，非图片忽略） */
const handlePreview = (list: string[], index: number) => {
  const url = list[index];
  if (!isImageUrl(url)) return;
  const images = list.filter(isImageUrl);
  previewList.value = images;
  previewIndex.value = images.indexOf(url);
  previewVisible.value = true;
};

/** 预览列表中的某张图片 */
const handlePreviewItem = (item: AttachmentNode) => {
  if (item.type !== "file") return;
  handlePreview(fileUrls.value, fileUrls.value.indexOf(item.file_url));
};

onMounted(async () => {
  // 首次打开才获取数据，之后复用缓存
  if (!cache.loaded) {
    cache.loaded = true;
    try {
      await fetchFolders();
      await fetchFiles();
    } finally {
      loading.value = false;
    }
  }
  await nextTick();
  treeRef.value?.setCurrentKey(cache.folderId);
});
</script>
