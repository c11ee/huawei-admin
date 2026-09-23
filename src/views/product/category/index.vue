<template>
  <div class="h-full w-full flex">
    <el-card shadow="never" class="h-full w-full">
      <template #header>
        <div class="card-header flex items-center justify-between">
          <span class="text-lg font-bold">商品分类</span>
          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreateTop"
              >添加分类</el-button
            >
            <el-button
              :icon="Refresh"
              :loading="loading"
              @click="fetchCategories"
              >刷新</el-button
            >
          </div>
        </div>
      </template>

      <div v-loading="loading" class="h-full min-h-0 overflow-hidden">
        <XPopperProxy @confirm="handleDeleteConfirm">
          <XVirtualTable
            ref="tableRef"
            row-key="id"
            :columns="columnsConfig"
            :data="categoryTree"
            :extra-grid-options="{
              treeConfig: { childrenField: 'children', expandAll: true }
            }"
          >
            <!-- 图标列自定义渲染 -->
            <template #icon-default="{ row }">
              <div class="flex justify-center">
                <el-image
                  v-if="row.icon"
                  :src="row.icon"
                  class="size-8"
                  fit="contain"
                  :preview-src-list="[row.icon]"
                  preview-teleported
                />
              </div>
            </template>

            <!-- 状态列自定义渲染 -->
            <template #status-default="{ row }">
              <el-switch
                :model-value="row.status"
                :active-value="1"
                :inactive-value="0"
                inline-prompt
                :loading="loadingStatusMap[row.id]"
                active-text="启用"
                inactive-text="禁用"
                @change="handleStatusChange($event as 0 | 1, row)"
              />
            </template>

            <!-- 操作列自定义渲染 -->
            <template #operation-default="{ row }">
              <el-button link type="primary" @click="handleAdd(row)">
                添加
              </el-button>

              <el-divider direction="vertical" />

              <el-button link type="primary" @click="handleEdit(row)">
                编辑
              </el-button>

              <el-divider direction="vertical" />

              <el-button
                link
                type="danger"
                data-proxy-popover
                data-popover-title="确定删除此分类吗？其子分类也会一并删除。"
                :data-row-data="JSON.stringify({ id: row.id })"
              >
                删除
              </el-button>
            </template>
          </XVirtualTable>
        </XPopperProxy>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Plus } from "@element-plus/icons-vue";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type Category,
  type CategoryStatus
} from "@/api/category";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import CategoryForm from "./CategoryForm.vue";

defineOptions({
  name: "ProductCategory"
});

const loading = ref(false);
const categoryTree = ref<Category[]>([]);
const tableRef = ref();
const loadingStatusMap = ref<Record<number, boolean>>({});

/** 列配置 */
const columnsConfig = ref<Column[]>([
  {
    field: "category_name",
    title: "分类名称",
    minWidth: 240,
    treeNode: true,
    align: "left"
  },
  {
    field: "icon",
    title: "图标",
    width: 100,
    slots: { default: "icon-default" }
  },
  {
    field: "status",
    title: "状态",
    width: 100,
    slots: { default: "status-default" },
    params: {
      localFilter: true,
      filterConfig: { 0: "禁用", 1: "启用" }
    }
  },
  {
    field: "sort",
    title: "排序",
    width: 100
  },
  {
    field: "created_at",
    title: "创建时间",
    width: 180
  },
  {
    field: "updated_at",
    title: "更新时间",
    width: 180
  },
  {
    field: "operation",
    title: "操作",
    width: 200,
    slots: { default: "operation-default" }
  }
]);

/** 获取分类列表（树形） */
const fetchCategories = async () => {
  loading.value = true;
  try {
    const res = await getCategories();
    if (res.code === 200) {
      categoryTree.value = res.data;
    }
  } catch (error) {
    console.error("获取分类列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 父级状态变更后，子孙分类在本地树中同步为相同状态（后端已级联更新） */
const syncDescendantsStatus = (row: Category, status: CategoryStatus) => {
  (row.children || []).forEach(child => {
    child.status = status;
    syncDescendantsStatus(child, status);
  });
};

/** 更新分类状态 */
const handleStatusChange = async (status: CategoryStatus, row: Category) => {
  try {
    loadingStatusMap.value[row.id] = true;
    const res = await updateCategory(row.id, {
      category_name: row.category_name,
      parent_id: row.parent_id,
      icon: row.icon,
      sort: row.sort,
      status
    });
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
      syncDescendantsStatus(row, status);
    }
  } catch (error) {
    console.error("更新分类状态失败:", error);
  } finally {
    loadingStatusMap.value[row.id] = false;
  }
};

/** 打开添加/编辑分类对话框 */
const openCategoryDialog = (
  defaultParentId?: number,
  row?: Category | null
) => {
  const isEdit = !!row;

  addDialog({
    title: isEdit ? "编辑分类" : "添加分类",
    width: "600px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: ({ options }) => {
      return h(CategoryForm, {
        treeData: categoryTree.value,
        defaultParentId,
        row,
        ref: (el: any) => {
          if (el) {
            options.formComponent = el;
          }
        }
      });
    },
    beforeSure: async (done, { options, index, closeLoading }) => {
      const formComponent = options.formComponent;
      if (!formComponent) {
        closeLoading();
        return;
      }
      const data = await formComponent.getFormData();
      if (!data) {
        closeLoading();
        return;
      }

      try {
        const res = isEdit
          ? await updateCategory(data.id, data)
          : await createCategory(data);
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg || "操作成功");
          fetchCategories();
        } else {
          ElMessage.error(res.msg || "操作失败");
        }
      } catch (error) {
        console.error("操作失败:", error);
      } finally {
        closeLoading();
      }
    }
  });
};

/** 添加顶级分类 */
const handleCreateTop = () => {
  openCategoryDialog(0, null);
};

/** 添加子分类（行内） */
const handleAdd = (row: Category) => {
  openCategoryDialog(row.id, null);
};

/** 编辑分类 */
const handleEdit = (row: Category) => {
  openCategoryDialog(undefined, row);
};

/** 接收 Popover 确认删除的回调 */
const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteCategory(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      fetchCategories();
    }
  } catch (error) {
    console.error("删除分类失败:", error);
  }
};

onMounted(() => {
  fetchCategories();
});
</script>
