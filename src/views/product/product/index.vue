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
        <div class="card-header flex flex-col gap-y-3">
          <el-tabs
            v-model="activeTab"
            class="status-tabs min-w-0"
            @tab-change="handleTabChange"
          >
            <el-tab-pane
              v-for="tab in statusTabs"
              :key="tab.name"
              :name="tab.name"
            >
              <template #label>
                {{ tab.label }}
                <span
                  v-if="tab.count !== undefined"
                  class="text-(--el-text-color-secondary)"
                  >({{ tab.count }})</span
                >
              </template>
            </el-tab-pane>
          </el-tabs>

          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreate"
              >添加商品</el-button
            >
            <el-button :icon="ExportOutlined">导出</el-button>
            <!-- <el-button :icon="Refresh" :loading="loading" @click="fetchProducts"
              >刷新</el-button
            > -->
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
            <!-- 主图列自定义渲染 -->
            <template #default_sku_image="{ row }">
              <div class="flex justify-center">
                <el-image
                  v-if="row.default_sku_image_url"
                  :src="row.default_sku_image_url"
                  class="size-8"
                  fit="cover"
                  :preview-src-list="[row.default_sku_image_url]"
                  preview-teleported
                />
                <span v-else class="text-(--el-text-color-placeholder)">-</span>
              </div>
            </template>

            <!-- 品牌列自定义渲染 -->
            <template #brand-default="{ row }">
              <div class="flex justify-center items-center gap-x-2">
                <el-image
                  v-if="row.brand?.logo"
                  :src="row.brand.logo"
                  class="size-6 shrink-0 rounded"
                  fit="contain"
                />
                <span class="truncate">{{ row.brand?.name || "-" }}</span>
              </div>
            </template>

            <!-- 分类列自定义渲染：分类较多时只展示前几个，其余以 +N 折叠，悬停查看全部 -->
            <template #category-default="{ row }">
              <div
                v-if="row.categories?.length"
                class="flex items-center gap-x-1"
                data-proxy-tooltip
                :data-tooltip-content="categoryText(row)"
              >
                <el-tag
                  v-for="item in row.categories.slice(0, categoryShowLimit)"
                  :key="item.id"
                  size="small"
                  type="info"
                  class="shrink-0"
                >
                  {{ item.category_name }}
                </el-tag>
                <el-tag
                  v-if="row.categories.length > categoryShowLimit"
                  size="small"
                  type="info"
                  class="shrink-0"
                >
                  +{{ row.categories.length - categoryShowLimit }}
                </el-tag>
              </div>
              <span v-else class="text-(--el-text-color-placeholder)">-</span>
            </template>

            <!-- 价格列自定义渲染 -->
            <template #price-default="{ row }">
              <span>{{ priceText(row) }}</span>
            </template>

            <!-- 状态列自定义渲染：回收站不提供上下架操作，状态以标签展示 -->
            <template #status-default="{ row }">
              <el-tag v-if="isTrashed" type="info">
                {{ statusTextMap[row.status] }}
              </el-tag>
              <el-tag v-else-if="row.status == 0" type="warning">草稿</el-tag>
              <el-switch
                v-else
                :model-value="row.status"
                :active-value="1"
                :inactive-value="2"
                inline-prompt
                :loading="loadingStatusMap[row.id]"
                active-text="上架"
                inactive-text="下架"
                @change="handleStatusChange($event as ProductStatus, row)"
              />
            </template>

            <!-- 创建人列自定义渲染 -->
            <template #creator-default="{ row }">
              <XOperatorCell :user="row.creator" />
            </template>

            <!-- 更新人列自定义渲染 -->
            <template #updater-default="{ row }">
              <XOperatorCell :user="row.updater" />
            </template>

            <!-- 操作列自定义渲染：回收站展示恢复与彻底删除 -->
            <template #operation-default="{ row }">
              <template v-if="isTrashed">
                <el-button link type="primary" @click="handleRestore(row)">
                  恢复
                </el-button>

                <el-divider direction="vertical" />

                <el-button
                  link
                  type="danger"
                  data-proxy-popover
                  data-popover-title="彻底删除后不可恢复，确定删除此商品吗？"
                  :data-row-data="JSON.stringify({ id: row.id })"
                >
                  彻底删除
                </el-button>
              </template>

              <template v-else>
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

                <el-button
                  v-if="isTrashed"
                  plain
                  size="small"
                  type="primary"
                  :disabled="!selectedRows.length"
                  @click="handleRestoreBatch"
                >
                  批量恢复
                </el-button>

                <el-popconfirm
                  :title="
                    isTrashed
                      ? '确定彻底删除选中的商品吗？'
                      : '确定删除选中的商品吗？'
                  "
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
                  v-if="!isTrashed"
                  plain
                  size="small"
                  :disabled="!selectedRows.length"
                  @click="handleBatchStatus(1)"
                >
                  批量上架
                </el-button>

                <el-button
                  v-if="!isTrashed"
                  plain
                  size="small"
                  :disabled="!selectedRows.length"
                  @click="handleBatchStatus(2)"
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
import { ref, computed, onMounted, onActivated } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage } from "element-plus";
import { Refresh, Plus, Search } from "@element-plus/icons-vue";
import {
  getProducts,
  updateProductStatus,
  deleteProduct,
  restoreProduct,
  type Product,
  type ProductListCounts,
  type ProductStatus,
  type YesNoFlag
} from "@/api/product";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import XOperatorCell from "@/components/XOperatorCell/index.vue";
import ExportOutlined from "~icons/ant-design/export-outlined";

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

/** 状态分页签名称：all 表示全部，其余与后端 counts 的字段一致 */
type ProductTabName = "all" | keyof ProductListCounts;

/** 状态分页签：status / show_trashed 为对应的查询条件 */
const statusTabOptions: {
  name: ProductTabName;
  label: string;
  status?: ProductStatus;
  show_trashed: YesNoFlag;
}[] = [
  { name: "all", label: "全部", status: undefined, show_trashed: 0 },
  { name: "draft", label: "草稿", status: 0, show_trashed: 0 },
  { name: "on_sale", label: "上架", status: 1, show_trashed: 0 },
  { name: "off_sale", label: "下架", status: 2, show_trashed: 0 },
  { name: "trashed", label: "回收站", status: undefined, show_trashed: 1 }
];

/** 所有分页签名称，用于校验 URL 参数 */
const tabNames = statusTabOptions.map(item => item.name);

/** 当前分页签：优先取 URL 参数（刷新后保留），非法值回落到全部 */
const activeTab = ref<ProductTabName>(
  tabNames.includes(route.query.tab as ProductTabName)
    ? (route.query.tab as ProductTabName)
    : "all"
);

/** 各状态的商品数量（随列表接口返回） */
const counts = ref<ProductListCounts>();

/** 分页签展示数据：附加对应状态的数量 */
const statusTabs = computed(() =>
  statusTabOptions.map(tab => ({
    ...tab,
    count: counts.value?.[tab.name as keyof ProductListCounts]
  }))
);

/** 当前是否处于回收站分页签 */
const isTrashed = computed(() => activeTab.value === "trashed");

/** 回收站分页签对应的是否标记：0=否 1=是 */
const isTrashedFlag = computed<YesNoFlag>(() => (isTrashed.value ? 1 : 0));

/** 状态文案：0=草稿 1=上架 2=下架 */
const statusTextMap: Record<ProductStatus, string> = {
  0: "草稿",
  1: "上架",
  2: "下架"
};

/** 分页参数 */
const listParams = ref({
  page: 1,
  limit: 100,
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
    field: "default_sku_image",
    title: "主图",
    width: 90,
    slots: { default: "default_sku_image" }
  },
  {
    field: "brand",
    title: "品牌",
    width: 150,
    slots: { default: "brand-default" }
  },
  {
    field: "categories",
    title: "分类",
    minWidth: 220,
    align: "left",
    slots: { default: "category-default" }
  },
  {
    field: "min_sale_price",
    title: "价格",
    width: 150,
    slots: { default: "price-default" }
  },
  {
    field: "total_stock",
    title: "库存",
    width: 90
  },
  {
    field: "status",
    title: "状态",
    width: 110,
    slots: { default: "status-default" },
    params: {
      localFilter: true,
      filterConfig: { ...statusTextMap }
    }
  },
  {
    field: "sort",
    title: "排序",
    width: 90
  },
  {
    field: "creator",
    title: "创建人",
    width: 120,
    slots: { default: "creator-default" }
  },
  {
    field: "created_at",
    title: "创建时间",
    width: 180
  },
  {
    field: "updater",
    title: "更新人",
    width: 120,
    slots: { default: "updater-default" }
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

/** 分类列最多展示的数量，超出部分以 +N 折叠（悬停查看全部分类） */
const categoryShowLimit = 2;

/** 分类文案：多个分类以 / 连接 */
const categoryText = (row: Product) =>
  (row.categories || []).map(item => item.category_name).join(" / ") || "-";

/** 价格文案：最低价与最高价相同时只展示一个 */
const priceText = (row: Product) => {
  if (!row.default_sku_sale_price) return "-";
  return `¥${row.default_sku_sale_price}`;
};

/** 获取商品列表 */
const fetchProducts = async () => {
  loading.value = true;
  try {
    const tab = statusTabOptions.find(item => item.name === activeTab.value);
    const res = await getProducts({
      ...listParams.value,
      status: tab?.status,
      show_trashed: tab?.show_trashed
    });
    if (res.code === 200) {
      productList.value = res.data;
      listParams.value.total = res.total;
      counts.value = res.counts;
    }
  } catch (error) {
    console.error("获取商品列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 解析当前列表页地址（携带分页签参数）：href 用于写回地址栏，fullPath 用于返回时的 redirect */
const resolveListUrl = () =>
  router.resolve({
    path: route.path,
    query: { ...route.query, tab: activeTab.value }
  });

/** 切换状态分页签：只改写地址栏，不走路由跳转，避免触发页面过渡动画与组件重挂载 */
const handleTabChange = () => {
  listParams.value.page = 1;
  window.history.replaceState(window.history.state, "", resolveListUrl().href);
  fetchProducts();
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

/** 恢复商品（回收站）：ids 支持单个ID或逗号分隔的多个ID */
const restoreProducts = async (ids: string) => {
  try {
    const res = await restoreProduct(ids);
    if (res.code === 200) {
      ElMessage.success(res.msg || "恢复成功");
      tableRef.value?.clearCheckboxRow();
      fetchProducts();
    }
  } catch (error) {
    console.error("恢复商品失败:", error);
  }
};

/** 恢复单个商品 */
const handleRestore = (row: Product) => {
  restoreProducts(row.id.toString());
};

/** 批量恢复 */
const handleRestoreBatch = () => {
  if (!selectedRows.value.length) return;
  restoreProducts(selectedRows.value.map(row => row.id).join(","));
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

/** 删除商品：ids 支持单个ID或逗号分隔的多个ID，force_delete 为 1 时彻底删除 */
const deleteProducts = async (ids: string, force_delete: YesNoFlag) => {
  try {
    const res = await deleteProduct(ids, force_delete);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchProducts();
    }
  } catch (error) {
    console.error("删除商品失败:", error);
  }
};

/** 批量删除 / 彻底删除 */
const handleDeleteBatch = () => {
  if (!selectedRows.value.length) return;
  const ids = selectedRows.value.map(row => row.id).join(",");
  deleteProducts(ids, isTrashedFlag.value);
};

/** 跳转到商品添加/编辑页面 */
const goProductForm = (id?: number) => {
  router.push({
    name: "ProductForm",
    // redirect 带上当前分页签参数，返回列表后仍停留在原来的分页签
    query: { id, redirect: resolveListUrl().fullPath }
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
const handleDeleteConfirm = (row: { id: number }) => {
  deleteProducts(row.id.toString(), isTrashedFlag.value);
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

<style scoped>
/* 卡片头部：去掉下边框与左内距，分隔线改由 tabs 自带的下划线提供 */
.pager-card :deep(.el-card__header) {
  padding-bottom: 0;
  border-bottom: none;
}

/* 状态分页签放在头部左侧，去掉默认下外边距 */
.status-tabs :deep(.el-tabs__header) {
  margin: 0;
}
</style>
