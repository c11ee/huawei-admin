<template>
  <div class="h-full w-full flex">
    <el-card shadow="never" class="h-full w-full">
      <template #header>
        <div class="card-header flex items-center justify-between">
          <span class="text-lg font-bold">商品品牌</span>
          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreate"
              >添加品牌</el-button
            >
            <el-button :icon="Refresh" :loading="loading" @click="fetchBrands"
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
            :data="brandList"
            :pagination="listParams"
            @pagination-change="handlePaginationChange"
            @update:selectedRows="handleSelectionChange"
          >
            <!-- Logo列自定义渲染 -->
            <template #logo-default="{ row }">
              <div class="flex justify-center">
                <el-image
                  v-if="row.logo"
                  :src="row.logo"
                  class="size-8"
                  fit="contain"
                  :preview-src-list="[row.logo]"
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
              <el-button link type="primary" @click="handleEdit(row)">
                编辑
              </el-button>

              <el-divider direction="vertical" />

              <el-button
                link
                type="danger"
                data-proxy-popover
                data-popover-title="确定删除此品牌吗？"
                :data-row-data="JSON.stringify({ id: row.id })"
              >
                删除
              </el-button>
            </template>

            <!-- 分页左侧：批量操作 -->
            <template #pager-left>
              <div class="flex items-center">
                <span class="text-xs text-(--el-text-color-secondary) mr-3"
                  >已选
                  <span class="text-(--el-text-color-primary) font-medium">{{
                    selectedRows.length
                  }}</span>
                  条</span
                >

                <el-popconfirm
                  title="确定删除选中的品牌吗？"
                  placement="top-start"
                  @confirm="handleDeleteBatch"
                >
                  <template #reference>
                    <el-button
                      plain
                      size="small"
                      type="danger"
                      :disabled="!selectedRows.length"
                    >
                      批量删除
                    </el-button>
                  </template>
                </el-popconfirm>

                <el-button
                  plain
                  size="small"
                  :disabled="!selectedRows.length"
                  @click="handleBatchStatus(1)"
                >
                  批量上架
                </el-button>

                <el-button
                  plain
                  size="small"
                  :disabled="!selectedRows.length"
                  @click="handleBatchStatus(0)"
                >
                  批量下架
                </el-button>
              </div>
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
  getBrands,
  createBrand,
  updateBrand,
  updateBrandStatus,
  deleteBrand,
  type Brand,
  type BrandStatus
} from "@/api/brand";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import BrandForm from "./BrandForm.vue";

defineOptions({
  name: "ProductBrand"
});

const loading = ref(false);
const brandList = ref<Brand[]>([]);
const selectedRows = ref<Brand[]>([]);
const tableRef = ref();
const loadingStatusMap = ref<Record<number, boolean>>({});

/** 分页参数 */
const listParams = ref({
  page: 1,
  limit: 100,
  total: 0
});

/** 列配置 */
const columnsConfig = ref<Column[]>([
  {
    type: "checkbox",
    title: "选择",
    width: 50,
    params: { noSetColumn: true }
  },
  {
    field: "name",
    title: "品牌名称",
    minWidth: 180
  },
  {
    field: "logo",
    title: "Logo",
    width: 100,
    slots: { default: "logo-default" }
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
    width: 150,
    slots: { default: "operation-default" },
    params: { noSetColumn: true }
  }
]);

/** 获取品牌列表 */
const fetchBrands = async () => {
  loading.value = true;
  try {
    const res = await getBrands(listParams.value);
    if (res.code === 200) {
      brandList.value = res.data;
      listParams.value.total = res.total;
    }
  } catch (error) {
    console.error("获取品牌列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 分页变化 */
const handlePaginationChange = (pagination: typeof listParams.value) => {
  listParams.value = { ...listParams.value, ...pagination };
  fetchBrands();
};

/** 表格勾选变化 */
const handleSelectionChange = (rows: Brand[]) => {
  selectedRows.value = rows;
};

/** 更新单个品牌状态 */
const handleStatusChange = async (status: BrandStatus, row: Brand) => {
  try {
    loadingStatusMap.value[row.id] = true;
    const res = await updateBrandStatus(row.id.toString(), status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
    }
  } catch (error) {
    console.error("更新品牌状态失败:", error);
  } finally {
    loadingStatusMap.value[row.id] = false;
  }
};

/** 批量上下架 */
const handleBatchStatus = async (status: BrandStatus) => {
  if (!selectedRows.value.length) return;

  try {
    const ids = selectedRows.value.map(row => row.id).join(",");
    const res = await updateBrandStatus(ids, status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      tableRef.value?.clearCheckboxRow();
      fetchBrands();
    }
  } catch (error) {
    console.error("批量更新品牌状态失败:", error);
  }
};

/** 批量删除 */
const handleDeleteBatch = async () => {
  if (!selectedRows.value.length) return;

  try {
    const res = await deleteBrand(
      selectedRows.value.map(row => row.id).join(",")
    );
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchBrands();
    }
  } catch (error) {
    console.error("批量删除品牌失败:", error);
  }
};

/** 打开添加/编辑品牌对话框 */
const openBrandDialog = (row?: Brand | null) => {
  const isEdit = !!row;

  addDialog({
    title: isEdit ? "编辑品牌" : "添加品牌",
    width: "600px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: ({ options }) => {
      return h(BrandForm, {
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
          ? await updateBrand(data.id, data)
          : await createBrand(data);
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg || "操作成功");
          fetchBrands();
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

/** 添加品牌 */
const handleCreate = () => {
  openBrandDialog(null);
};

/** 编辑品牌 */
const handleEdit = (row: Brand) => {
  openBrandDialog(row);
};

/** 接收 Popover 确认删除的回调 */
const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteBrand(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchBrands();
    }
  } catch (error) {
    console.error("删除品牌失败:", error);
  }
};

onMounted(() => {
  fetchBrands();
});
</script>
