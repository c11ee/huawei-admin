<template>
  <div class="h-full w-full flex gap-x-3">
    <div class="flex-1 h-full flex flex-col gap-y-3 min-w-0">
      <el-card shadow="never" class="shrink-0">
        <el-form
          :inline="true"
          :model="listParams"
          class="demo-form-inline"
          @submit.native.prevent
        >
          <el-form-item class="mb-0!">
            <el-input
              v-model="listParams.keyword"
              placeholder="请输入昵称"
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
            <span class="text-lg font-bold">用户列表</span>
            <div class="flex items-center">
              <el-button type="primary" :icon="Plus" @click="handleCreate"
                >添加用户</el-button
              >
              <el-button
                :icon="Refresh"
                :loading="loading"
                @click="fetchUsers()"
                >刷新</el-button
              >
            </div>
          </div>
        </template>

        <div
          ref="contentRef"
          v-loading="loading"
          class="h-full min-h-0 overflow-hidden"
        >
          <XPopperProxy @confirm="handleDeleteConfirm">
            <XVirtualTable
              ref="tableRef"
              row-key="id"
              :columns="COLUMNS_CONFIG"
              :data="userList"
              :pagination="listParams"
              @pagination-change="handlePaginationChange"
            >
              <template #avatar-default="{ row }">
                <el-avatar
                  :size="32"
                  :src="row.avatar || undefined"
                  class="shrink-0"
                >
                  {{ row.nickname?.charAt(0) || "?" }}
                </el-avatar>
              </template>

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

              <template #operation-default="{ row }">
                <el-button link type="primary" @click="handleEdit(row)"
                  >编辑</el-button
                >
                <el-divider direction="vertical" />
                <el-button
                  link
                  type="danger"
                  data-proxy-popover
                  data-popover-title="确定删除此用户吗？"
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Plus, Search } from "@element-plus/icons-vue";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  type User,
  updateUserStatus
} from "@/api/user";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import UserForm from "./UserForm.vue";

defineOptions({ name: "SystemUsers" });

// --- 静态常量配置 ---
const COLUMNS_CONFIG: any[] = [
  { field: "nickname", title: "昵称", minWidth: 120 },
  { field: "username", title: "用户名", minWidth: 120 },
  {
    field: "avatar",
    title: "头像",
    width: 70,
    slots: { default: "avatar-default" }
  },
  { field: "phone", title: "手机号", width: 130 },
  { field: "email", title: "邮箱", width: 150 },
  { field: "role_names", title: "角色", minWidth: 150 },
  {
    field: "status",
    title: "状态",
    width: 80,
    params: {
      localFilter: true,
      filterConfig: { 0: "禁用", 1: "启用" }
    },
    slots: { default: "status-default" }
  },
  { field: "created_at", title: "创建时间", width: 180 },
  { field: "updated_at", title: "更新时间", width: 180 },
  {
    field: "operation",
    title: "操作",
    width: 130,
    slots: { default: "operation-default" },
    params: { noSetColumn: true }
  }
];

// --- 响应式状态 ---
const loading = ref(false);
const userList = ref<User[]>([]);

const listParams = ref({
  page: 1,
  limit: 100,
  total: 0,
  keyword: ""
});

const tableRef = ref();
const contentRef = ref<HTMLDivElement>();
const loadingStatusMap = ref<Record<number, boolean>>({});

// --- 核心业务逻辑 ---

const fetchUsers = async () => {
  loading.value = true;
  try {
    const res = await getUsers(listParams.value);
    if (res.code === 200) {
      userList.value = res.data;
      listParams.value.total = res.total;
    }
  } catch (error) {
    console.error("获取用户列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  fetchUsers();
};

/** 重置搜索 */
const handleReset = () => {
  listParams.value.keyword = "";
  fetchUsers();
};

const handleStatusChange = async (status: 0 | 1, row: User) => {
  try {
    const userId = row.id;
    loadingStatusMap.value[userId] = true;
    const res = await updateUserStatus(userId, status);
    loadingStatusMap.value[userId] = false;
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
    }
  } catch (error) {
    console.error("操作失败:", error);
  }
};

const openUserDialog = async (row?: User | null) => {
  const isEdit = !!row;
  addDialog({
    title: isEdit ? "编辑用户" : "添加用户",
    width: "550px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: ({ options }) =>
      h(UserForm, {
        row,
        ref: (el: any) => {
          if (el) options.formComponent = el;
        }
      }),
    beforeSure: async (done, { options, index, closeLoading }) => {
      const formComponent = options.formComponent;
      if (!formComponent) return closeLoading();

      const data = await formComponent.getFormData();
      if (!data) return closeLoading();

      try {
        const res = isEdit
          ? await updateUser(data.id, data)
          : await createUser(data);
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg || "操作成功");
          fetchUsers();
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

const handleCreate = () => openUserDialog(null);
const handleEdit = (row: User) => openUserDialog(row);

const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteUser(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      fetchUsers();
    }
  } catch (error) {
    console.error("删除用户失败:", error);
  }
};

const handlePaginationChange = (pagination: typeof listParams.value) => {
  listParams.value = { ...listParams.value, ...pagination };
  fetchUsers();
};

// --- 生命周期 ---
onMounted(() => {
  fetchUsers();
});
</script>
