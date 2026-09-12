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
            <el-button :icon="Refresh" :loading="loading" @click="fetchCategories"
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
  type Category
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
