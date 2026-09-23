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
            placeholder="请输入模板名称 / 规格内容"
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
          <span class="text-lg font-bold">规格模板</span>
          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreate"
              >添加规格模板</el-button
            >
            <el-button
              :icon="Refresh"
              :loading="loading"
              @click="fetchTemplates"
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
            :data="templateList"
            :pagination="listParams"
            @pagination-change="handlePaginationChange"
            @update:selectedRows="handleSelectionChange"
          >
            <!-- 规格项列自定义渲染 -->
            <template #spec-default="{ row }">
              <div
                v-if="row.spec_json?.length"
                class="flex items-center gap-x-2 overflow-hidden"
              >
                <span
                  v-for="item in row.spec_json"
                  :key="item.name"
                  class="inline-block min-w-0 max-w-55 truncate rounded bg-(--el-fill-color-light) px-1.5 py-0.5 text-xs leading-5"
                  data-proxy-tooltip
                  :data-tooltip-content="specItemText(item)"
                >
                  <span class="font-medium">{{ item.name }}</span>
                  <span class="text-(--el-text-color-secondary)"
                    >：{{ specValuesText(item) }}</span
                  >
                </span>
              </div>
              <span v-else class="text-(--el-text-color-placeholder)">-</span>
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

            <!-- 创建人列自定义渲染 -->
            <template #creator-default="{ row }">
              <XOperatorCell :user="row.creator" />
            </template>

            <!-- 更新人列自定义渲染 -->
            <template #updater-default="{ row }">
              <XOperatorCell :user="row.updater" />
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
                data-popover-title="确定删除此规格模板吗？"
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
                  title="确定删除选中的规格模板吗？"
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
                  批量启用
                </el-button>

                <el-button
                  plain
                  size="small"
                  :disabled="!selectedRows.length"
                  @click="handleBatchStatus(0)"
                >
                  批量禁用
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
import { Refresh, Plus, Search } from "@element-plus/icons-vue";
import {
  getSpecTemplates,
  createSpecTemplate,
  updateSpecTemplate,
  updateSpecTemplateStatus,
  deleteSpecTemplate,
  type SpecTemplate,
  type SpecItem,
  type SpecTemplateStatus
} from "@/api/specTemplate";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import XOperatorCell from "@/components/XOperatorCell/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import SpecTemplateForm from "./SpecTemplateForm.vue";

defineOptions({
  name: "ProductSpecTemplate"
});

const loading = ref(false);
const templateList = ref<SpecTemplate[]>([]);
const selectedRows = ref<SpecTemplate[]>([]);
const tableRef = ref();
const loadingStatusMap = ref<Record<number, boolean>>({});

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
    field: "name",
    title: "模板名称",
    minWidth: 160,
    align: "left"
  },
  {
    field: "spec_json",
    title: "规格项",
    minWidth: 320,
    align: "left",
    slots: { default: "spec-default" }
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
    width: 150,
    slots: { default: "operation-default" },
    params: { noSetColumn: true }
  }
]);

/** 拼接单个规格项的所有规格值文案 */
const specValuesText = (item: SpecItem) => {
  return (item.values || []).map(v => v.value).join(" / ");
};

/** 单个规格项的完整文案，如：颜色：红色 / 黑色（同时用于展示与悬停提示） */
const specItemText = (item: SpecItem) => {
  return `${item.name}：${specValuesText(item)}`;
};

/** 获取规格模板列表 */
const fetchTemplates = async () => {
  loading.value = true;
  try {
    const res = await getSpecTemplates(listParams.value);
    if (res.code === 200) {
      templateList.value = res.data;
      listParams.value.total = res.total;
    }
  } catch (error) {
    console.error("获取规格模板列表失败:", error);
  } finally {
    loading.value = false;
  }
};

/** 查询 */
const handleSearch = () => {
  listParams.value.page = 1;
  fetchTemplates();
};

/** 重置搜索 */
const handleReset = () => {
  listParams.value.keyword = "";
  listParams.value.page = 1;
  fetchTemplates();
};

/** 分页变化 */
const handlePaginationChange = (pagination: typeof listParams.value) => {
  listParams.value = { ...listParams.value, ...pagination };
  fetchTemplates();
};

/** 表格勾选变化 */
const handleSelectionChange = (rows: SpecTemplate[]) => {
  selectedRows.value = rows;
};

/** 更新单个规格模板状态 */
const handleStatusChange = async (
  status: SpecTemplateStatus,
  row: SpecTemplate
) => {
  try {
    loadingStatusMap.value[row.id] = true;
    const res = await updateSpecTemplateStatus(row.id.toString(), status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
    }
  } catch (error) {
    console.error("更新规格模板状态失败:", error);
  } finally {
    loadingStatusMap.value[row.id] = false;
  }
};

/** 批量启用/禁用 */
const handleBatchStatus = async (status: SpecTemplateStatus) => {
  if (!selectedRows.value.length) return;

  try {
    const ids = selectedRows.value.map(row => row.id).join(",");
    const res = await updateSpecTemplateStatus(ids, status);
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      tableRef.value?.clearCheckboxRow();
      fetchTemplates();
    }
  } catch (error) {
    console.error("批量更新规格模板状态失败:", error);
  }
};

/** 批量删除 */
const handleDeleteBatch = async () => {
  if (!selectedRows.value.length) return;

  try {
    const res = await deleteSpecTemplate(
      selectedRows.value.map(row => row.id).join(",")
    );
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchTemplates();
    }
  } catch (error) {
    console.error("批量删除规格模板失败:", error);
  }
};

/** 打开添加/编辑规格模板对话框 */
const openTemplateDialog = (row?: SpecTemplate | null) => {
  const isEdit = !!row;

  addDialog({
    title: isEdit ? "编辑规格模板" : "添加规格模板",
    width: "720px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    alignCenter: true,
    contentRenderer: ({ options }) => {
      return h(SpecTemplateForm, {
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
          ? await updateSpecTemplate(data.id, data)
          : await createSpecTemplate(data);
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg || "操作成功");
          fetchTemplates();
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

/** 添加规格模板 */
const handleCreate = () => {
  openTemplateDialog(null);
};

/** 编辑规格模板 */
const handleEdit = (row: SpecTemplate) => {
  openTemplateDialog(row);
};

/** 接收 Popover 确认删除的回调 */
const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteSpecTemplate(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      tableRef.value?.clearCheckboxRow();
      fetchTemplates();
    }
  } catch (error) {
    console.error("删除规格模板失败:", error);
  }
};

onMounted(() => {
  fetchTemplates();
});
</script>
