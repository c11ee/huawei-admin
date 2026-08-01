<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import {
  Close,
  CopyDocument,
  Delete,
  DocumentCopy,
  Download,
  FolderAdd,
  Refresh,
  Search,
  Upload
} from "@element-plus/icons-vue";
import { TableV2SortOrder } from "element-plus";
import { useRoute } from "vue-router";
import { copyText } from "@/utils/tool";

import { useFetch } from "./utils/useFetch";
import { useAction } from "./utils/useAction";
import { useDrag } from "./utils/useDrag";
import { useSelection } from "./utils/useSelection";
import { useContextMenu } from "./utils/useContextMenu";
import { useUpload } from "./utils/useUpload";
import { getFileUrl, getName } from "./utils/common";

defineOptions({ name: "Attachment" });

const route = useRoute();
const loading = ref(false);
const fileItemRef = ref<HTMLDivElement[]>([]);

// allFileList 由此处创建，同时注入 useFetch 和 useSelection，消除循环依赖
const allFileList = ref<any[]>([]);

// --- 选择（先于 useFetch，使 clearSelectedMaps 可用） ---
const {
  container,
  selecto,
  selectedMaps,
  selectedCount,
  isAllSelected,
  clearSelectedMaps,
  getGroupedSelectedIds,
  handleSelectAll,
  initSelecto
} = useSelection({ allFileList });

// --- 数据 ---
const {
  params,
  treeRef,
  treeFileList,
  fetchFolderList,
  fetchData,
  handleCurrentChange,
  handleSort,
  handleReset,
  handleSearch
} = useFetch({ allFileList, clearSelectedMaps });

// --- 右键菜单 ---
const {
  dropdownRef,
  dropdownTriggerRef,
  dropdownEditRow,
  handleRightClick,
  handleDropdownVisibleChange
} = useContextMenu({ params });

// --- 上传 ---
const { uploading, uploadRef, handleUpload, handleDragUpload } = useUpload({
  params: params as { folder_id: number },
  onSuccess: fetchData
});

// --- 文件操作 ---
const {
  showPreview,
  previewInfo,
  handleDelete,
  handleDownload,
  handleNewFolder,
  handleDeleteBatch,
  handleClick,
  handleRestoreBatch,
  handleKeyDown
} = useAction({
  params,
  treeFileList,
  fetchData,
  fetchFolderList,
  getGroupedSelectedIds
});

// --- 拖拽 ---
const {
  dropContainer,
  isDragOver,
  handleDragEnter,
  handleDragLeave,
  handleDragOver,
  handleDrop
} = useDrag({ onDrop: handleDragUpload });

const initRightClick = (e: Event) => {
  e.preventDefault();
};

onMounted(async () => {
  const { folder_id, del } = route.query;
  fetchFolderList();

  if (folder_id != "0" && folder_id != undefined && del != "1") {
    params.folder_id = Number(folder_id);
  }

  await nextTick();
  treeRef.value?.setCurrentKey(params.folder_id);

  loading.value = true;
  await fetchData();
  loading.value = false;

  initSelecto();
  document.addEventListener("keydown", handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener("keydown", handleKeyDown);
});

watch(
  () => route.query.pid,
  async n => {
    const pid = Number(n);
    params.folder_id = pid;
    loading.value = true;
    await fetchData();
    loading.value = false;
  }
);

watch(
  () => selectedMaps.value,
  n => {
    nextTick(() => {
      if (selecto.value) {
        const selectedItems = fileItemRef.value.filter(
          el => n[Number(el.dataset.id)]
        );
        // @ts-ignore
        selecto.value.selectedTargets = selectedItems;
      }
    });
  },
  { deep: true }
);
</script>

<template>
  <div
    class="page attachment h-full w-full flex gap-x-3 select-none"
    ref="container"
    @contextmenu="initRightClick"
  >
    <!-- 左侧目录树 -->
    <el-card shadow="never" class="w-42.5 shrink-0 h-full flex flex-col">
      <template #header>
        <span class="font-bold">目录</span>
      </template>
      <el-scrollbar class="flex-1 -mx-3">
        <el-tree
          ref="treeRef"
          :data="treeFileList"
          node-key="id"
          highlight-current
          default-expand-all
          :expand-on-click-node="false"
          @current-change="handleCurrentChange"
        >
          <template #default="{ node }">
            <div
              class="h-full flex items-center"
              @contextmenu="
                handleRightClick($event, 'tree-folder', {
                  id: node.data.id
                })
              "
            >
              <span class="el-text is-truncated el-tree-node__label">{{
                node.data.name
              }}</span>
            </div>
          </template>
        </el-tree>
      </el-scrollbar>
    </el-card>

    <!-- 右侧主区域 -->
    <div class="flex-1 h-full flex flex-col gap-y-3 min-w-0">
      <!-- 搜索栏 -->
      <el-card shadow="never" class="shrink-0">
        <el-form :inline="true" class="demo-form-inline" @submit.native.prevent>
          <el-form-item class="mb-0!">
            <el-input
              v-model="params.keyword"
              placeholder="请输入详细名称"
              clearable
              class="w-64!"
              :prefix-icon="Search"
              @keyup.enter="handleSearch"
              @clear="handleSearch"
            />
          </el-form-item>
          <el-form-item class="mb-0!">
            <el-button type="primary" :icon="Search" @click="handleSearch"
              >查询</el-button
            >
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
          </el-form-item>
          <el-form-item class="mb-0!">
            <div class="flex items-center h-6 gap-x-4">
              <i
                class="iconfont icon-shuaxin text-lg text-gray-600 cursor-pointer"
                @click="fetchData()"
              ></i>

              <i
                :class="[
                  'iconfont icon-shengjiangxu text-lg cursor-pointer',
                  params.orderBy === TableV2SortOrder.DESC ? 'rotate-180' : ''
                ]"
                :title="
                  params.orderBy === TableV2SortOrder.DESC ? '降序' : '升序'
                "
                @click="
                  handleSort(
                    params.orderBy === TableV2SortOrder.DESC
                      ? TableV2SortOrder.ASC
                      : TableV2SortOrder.DESC
                  )
                "
              ></i>
            </div>
          </el-form-item>
        </el-form>
      </el-card>

      <!-- 文件列表 -->
      <el-card shadow="never" class="flex-1 flex flex-col min-h-0 pager-card">
        <template #header>
          <div class="card-header flex items-center justify-between">
            <span class="text-lg font-bold"> 附件管理 </span>
            <div class="flex items-center gap-x-3">
              <el-button plain size="small" @click="handleNewFolder()">
                新建文件夹
              </el-button>
              <el-upload
                :http-request="handleUpload"
                :show-file-list="false"
                ref="uploadRef"
              >
                <el-button
                  type="primary"
                  size="small"
                  class="ml-0!"
                  :loading="uploading"
                >
                  上传文件
                </el-button>
              </el-upload>
            </div>
          </div>
        </template>

        <div class="flex flex-col min-h-0 h-full">
          <div
            v-loading="loading"
            class="flex-1 min-h-0 overflow-hidden relative"
            ref="dropContainer"
            @dragover.prevent="handleDragOver"
            @dragenter="handleDragEnter"
            @drop.prevent="handleDrop"
          >
            <el-scrollbar class="h-full" v-if="allFileList.length">
              <div class="flex flex-wrap gap-x-2 gap-y-6">
                <div
                  v-for="(item, index) in allFileList"
                  :key="item.type + item.id"
                  :data-id="item.id"
                  :data-type="item.type"
                  :title="getName(item)"
                  class="w-22 lg:w-27 cursor-pointer group file-item"
                  ref="fileItemRef"
                  @click="handleClick(item)"
                  @contextmenu="handleRightClick($event, item.type, item)"
                >
                  <div
                    class="h-22 lg:h-27 w-full bg-gray-100 flex items-center justify-center relative"
                  >
                    <div
                      class="absolute top-1.25 right-2 z-2 group-hover:block hidden"
                      :style="
                        selectedMaps[item.type + item.id]
                          ? 'display: block;'
                          : ''
                      "
                      v-if="item.type + item.id"
                    >
                      <el-checkbox
                        style="
                          --el-checkbox-height: 12px;
                          --el-checkbox-input-height: 12px;
                          --el-checkbox-input-width: 12px;
                        "
                        :key="'box_' + selectedMaps[item.type + item.id]"
                        v-model="selectedMaps[item.type + item.id]"
                        @click.stop
                      />
                    </div>

                    <el-image
                      :src="getFileUrl(item)"
                      :class="'w-full h-full'"
                      fit="contain"
                      lazy
                    />
                    <div
                      v-if="params.folder_id !== -1 && item.type === 'file'"
                      class="linear-gradient z-1 absolute top-0 right-0 left-0 bottom-0 group-hover:opacity-100 opacity-0 transition-all duration-300"
                    >
                      <div
                        class="flex items-center pb-2 px-3 text-white justify-between"
                      >
                        <el-icon
                          class="cursor-pointer text-xs"
                          @click.stop="copyText(item.file_url)"
                        >
                          <CopyDocument />
                        </el-icon>
                        <el-icon
                          class="cursor-pointer text-xs"
                          @click.stop="
                            handleDownload(item.file_url, item.original_name)
                          "
                        >
                          <Download />
                        </el-icon>
                        <el-icon
                          class="cursor-pointer text-xs"
                          @click.stop="handleDelete(item)"
                        >
                          <Delete />
                        </el-icon>
                      </div>
                    </div>
                  </div>
                  <div class="text-xs mt-2 line-clamp-1 text-center">
                    <p>{{ getName(item) }}</p>
                  </div>
                </div>
              </div>
            </el-scrollbar>

            <el-empty v-else class="h-full" description="暂无附件"></el-empty>

            <div
              v-if="isDragOver"
              class="drag-overlay"
              @dragleave.stop="handleDragLeave"
            >
              <div class="mask"></div>
              <el-icon size="48" color="#077aff"><Upload /></el-icon>
              <p class="drag-text">松开鼠标上传文件，只支持单个上传</p>
            </div>
          </div>

          <!-- 批量操作栏 -->
          <div
            class="flex items-center px-4 py-3 border-t shrink-0"
            v-if="selectedCount !== 0"
            @click.stop
          >
            <el-checkbox
              class="h-3.5 mr-0"
              :model-value="isAllSelected"
              @change="handleSelectAll()"
            >
              <span class="text-gray-500 text-xs"
                >已选
                <span class="text-gray-900">{{ selectedCount }}</span> 条</span
              >
            </el-checkbox>
            <el-popconfirm
              title="确定删除吗？"
              placement="top-start"
              @confirm="handleDeleteBatch()"
            >
              <template #reference>
                <el-button plain size="small" class="ml-4!">
                  {{ params.folder_id != -1 ? "批量删除" : "彻底删除" }}
                </el-button>
              </template>
            </el-popconfirm>

            <el-button
              plain
              size="small"
              class="ml-4!"
              v-if="params.folder_id == -1"
              @click="handleRestoreBatch()"
            >
              还原
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <Teleport to="body" v-if="showPreview">
      <div
        class="fixed top-0 bottom-0 left-0 right-0 z-9999 flex items-center justify-center text-white"
      >
        <div
          class="absolute top-0 bottom-0 left-0 right-0 z-[-1]"
          style="background: rgba(0, 0, 0, 0.6)"
        ></div>

        <div class="absolute top-[11%] right-[5%] text-[32px] z-2">
          <el-icon @click="showPreview = false"
            ><Close class="cursor-pointer"
          /></el-icon>
        </div>

        <span
          class="absolute top-[11%] font-semibold left-0 right-0 text-lg text-center z-1"
          >{{ previewInfo.name }}</span
        >
        <img
          :src="previewInfo.url"
          class="max-w-[60%] max-h-[60%] object-contain"
        />
      </div>
    </Teleport>

    <el-dropdown
      ref="dropdownRef"
      :virtual-ref="dropdownTriggerRef"
      virtual-triggering
      hide-on-click
      trigger="contextmenu"
      :key="dropdownEditRow?.id ? 'dd_' + dropdownEditRow.id : 'defaultKey'"
      v-if="dropdownEditRow"
      @visible-change="handleDropdownVisibleChange"
    >
      <template #dropdown>
        <span class="hidden"></span>
        <el-dropdown-menu>
          <el-dropdown-item
            :icon="FolderAdd"
            v-if="['folder', 'tree-folder'].includes(dropdownEditRow.type)"
            @click="handleNewFolder(dropdownEditRow.id)"
            >新增文件夹</el-dropdown-item
          >
          <el-dropdown-item
            :icon="DocumentCopy"
            v-if="dropdownEditRow.type == 'file'"
            @click.stop="copyText(dropdownEditRow.file_url)"
            >复制</el-dropdown-item
          >
          <el-dropdown-item
            :icon="Download"
            v-if="dropdownEditRow.type == 'file'"
            @click.stop="
              handleDownload(
                dropdownEditRow.file_url,
                dropdownEditRow.original_name
              )
            "
            >下载</el-dropdown-item
          >
          <el-dropdown-item
            :icon="Delete"
            v-if="true"
            @click="handleDelete(dropdownEditRow)"
            >删除</el-dropdown-item
          >
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<style scoped lang="scss">
:deep(.el-checkbox__inner) {
  border-width: 2px !important;
}
:deep(.btn-container) {
  column-gap: 0.75rem /* 12px */;
  .el-button + .el-button {
    margin: 0;
  }
}
:deep(.el-upload) {
  width: 100%;
  .el-button {
    flex: 1;
  }
}
.attachment {
  :deep(.el-tree) {
    .el-tree-node__content:hover {
      background-color: transparent;
      .el-text {
        color: #077aff;
      }
    }
    .el-tree-node__content {
      margin-bottom: 14px;
    }
    .is-current {
      position: relative;
      &::after {
        content: "";
        position: absolute;
        left: 0;
        top: 0;
        transform: translateY(40%);
        height: 16px;
        width: 1px;
        background-color: #077aff;
      }
      > .el-tree-node__content {
        background-color: transparent;
        .el-text {
          color: #077aff;
        }
      }
    }
    .el-text.is-truncated {
      line-height: 18px;
    }
  }

  :deep(.el-input) {
    --el-input-bg-color: #f2f8ff;
    --el-text-color-placeholder: #848a97;
    .el-input__wrapper {
      padding: 1px 10px;
      box-shadow: none;
    }
  }

  .linear-gradient {
    background: linear-gradient(
      180deg,
      rgba(0, 0, 0, 0) 66%,
      rgba(9, 9, 9, 0.28) 98%
    );
    display: flex;
    flex-direction: column;
    justify-content: end;
  }
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.95);
  border: 2px dashed #077aff;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  .mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: transparent;
    z-index: 1;
  }
  .drag-text {
    margin-top: 12px;
    font-size: 16px;
    color: #077aff;
    font-weight: 500;
  }
}
</style>
