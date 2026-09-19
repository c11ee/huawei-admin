<template>
  <div class="h-full w-full flex flex-col gap-y-3">
    <el-card shadow="never" class="shrink-0">
      <el-form
        :inline="true"
        :model="listParams"
        class="demo-form-inline"
        @submit.prevent
      >
        <el-form-item class="mb-0!">
          <el-input
            v-model="listParams.keyword"
            placeholder="请输入商品名称 / 商品编码"
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
      </el-form>
    </el-card>

    <el-card shadow="never" class="flex-1 flex flex-col min-h-0 pager-card">
      <template #header>
        <div class="card-header flex items-center justify-between">
          <span class="text-lg font-bold">商品列表</span>
          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreate"
              >添加商品</el-button
            >
            <el-button :icon="Refresh" :loading="loading" @click="fetchProducts"
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
            :data="productList"
            :pagination="listParams"
            @pagination-change="handlePaginationChange"
            @update:selectedRows="handleSelectionChange"
          >
            <!-- 轮播图列自定义渲染 -->
            <template #slider-default="{ row }">
              <div class="flex justify-center">
                <el-image
                  v-if="row.slider_images?.length"
                  :src="row.slider_images[0]"
                  class="size-8"
                  fit="cover"
                  :preview-src-list="row.slider_images"
                  preview-teleported
                />
                <span v-else class="text-(--el-text-color-placeholder)">-</span>
              </div>
            </template>

            <!-- 品牌列自定义渲染 -->
            <template #brand-default="{ row }">
              <span>{{ row.brand?.name || "-" }}</span>
            </template>

            <!-- 状态列自定义渲染 -->
            <template #status-default="{ row }">
              <el-switch
                :model-value="row.status"
                :active-value="1"
                :inactive-value="0"
                inline-prompt
                :loading="loadingStatusMap[row.id]"
                active-text="上架"
                inactive-text="下架"
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
                data-popover-title="确定删除此商品吗？"
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
                  title="确定删除选中的商品吗？"
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
import { ref, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Refresh, Plus, Search } from "@element-plus/icons-vue";
import {
  getProducts,
  updateProductStatus,
  deleteProduct,
  type Product,
  type ProductStatus
} from "@/api/product";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";

defineOptions({
  name: "ProductList"
});

const route = useRoute();
const router = useRouter();

const loading = ref(false);
const productList = ref<Product[]>([]);
const selectedRows = ref<Product[]>([]);
const tableRef = ref();
const loadingStatusMap = ref<Record<number, boolean>>({});
/** 首次激活由 onMounted 请求，避免重复加载 */
let isFirstActivated = true;

/** 分页参数 */
const listParams = ref({
  page: 1,
  limit: 20,
  total: 0,
  keyword: ""
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
    field: "product_name",
    title: "商品名称",
    minWidth: 200,
    align: "left"
  },
  {
    field: "spu_code",
    title: "商品编码",
    minWidth: 160,
    align: "left"
  },
  {
    field: "slider_images",
    title: "主图",
    width: 90,
    slots: { default: "slider-default" }
  },
  {
    field: "brand",
    title: "品牌",
    width: 120,
    slots: { default: "brand-default" }
  },
  {
    field: "status",
    title: "状态",
    width: 110,
    slots: { default: "status-default" },
    params: {
      localFilter: true,
      filterConfig: { 0: "下架", 1: "上架" }
    }
  },
  {
    field: "sort",
    title: "排序",
    width: 90
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
    width: 130,
    slots: { default: "operation-default" },
    params: { noSetColumn: true }
  }
]);

/** 获取商品列表 */
const fetchProducts = async () => {
  loading.value = true;
  try {
    const res = await getProducts(listParams.value);
    if (res.code === 200) {
      productList.value = res.data;
      listParams.value.total = res.total;
    }
  } catch (error) {
    console.error("获取商品列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 查询 */
const handleSearch = () => {
  listParams.value.page = 1;
  fetchProducts();
};

/** 重置搜索 */
const handleReset = () => {
  listParams.value.keyword = "";
  listParams.value.page = 1;
  fetchProducts();
};

/** 分页变化 */
const handlePaginationChange = (pagination: typeof listParams.value) => {
  listParams.value = { ...listParams.value, ...pagination };
  fetchProducts();
};

/** 表格勾选变化 */
const handleSelectionChange = (rows: Product[]) => {
  selectedRows.value = rows;
};

/** 更新单个商品状态 */
const handleStatusChange = async (status: ProductStatus, row: Product) => {
  try {
    loadingStatusMap.value[row.id] = true;
    const res = await updateProductStatus(row.id.toString(), status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
    }
  } catch (error) {
    console.error("更新商品状态失败:", error);
  } finally {
    loadingStatusMap.value[row.id] = false;
  }
};

/** 批量上下架 */
const handleBatchStatus = async (status: ProductStatus) => {
  if (!selectedRows.value.length) return;

  try {
    const ids = selectedRows.value.map(row => row.id).join(",");
    const res = await updateProductStatus(ids, status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      tableRef.value?.clearCheckboxRow();
      fetchProducts();
    }
  } catch (error) {
    console.error("批量更新商品状态失败:", error);
  }
};

/** 批量删除 */
const handleDeleteBatch = async () => {
  if (!selectedRows.value.length) return;

  try {
    const res = await deleteProduct(
      selectedRows.value.map(row => row.id).join(",")
    );
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchProducts();
    }
  } catch (error) {
    console.error("批量删除商品失败:", error);
  }
};

/** 跳转到商品添加/编辑页面 */
const goProductForm = (id?: number) => {
  router.push({
    name: "ProductForm",
    query: { id, redirect: route.path }
  });
};

/** 添加商品 */
const handleCreate = () => {
  goProductForm();
};

/** 编辑商品 */
const handleEdit = (row: Product) => {
  goProductForm(row.id);
};

/** 接收 Popover 确认删除的回调 */
const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteProduct(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchProducts();
    }
  } catch (error) {
    console.error("删除商品失败:", error);
  }
};

onMounted(() => {
  fetchProducts();
});

/** 从添加/编辑页面返回后刷新列表 */
onActivated(() => {
  if (isFirstActivated) {
    isFirstActivated = false;
    return;
  }
  fetchProducts();
});
</script>
