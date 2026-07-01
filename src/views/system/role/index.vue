<template>
  <div class="h-full w-full flex gap-x-3">
    <div class="flex-1 h-full flex flex-col gap-y-3 min-w-0">
      <el-card shadow="never" class="shrink-0">
        <el-form :inline="true" :model="listParams" class="demo-form-inline">
          <el-form-item class="mb-0!">
            <el-input
              v-model="listParams.keyword"
              placeholder="请输入角色名称 / 描述"
              clearable
              class="!w-64"
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
            <span class="text-lg font-bold">角色列表</span>
            <div class="flex items-center gap-2">
              <el-button type="primary" :icon="Plus" @click="handleCreate"
                >添加角色</el-button
              >
              <el-button
                :icon="Refresh"
                :loading="loading"
                @click="fetchRoles()"
                >刷新</el-button
              >
            </div>
          </div>
        </template>

        <div
          v-loading="loading"
          ref="contentRef"
          class="h-full min-h-0 overflow-hidden"
        >
          <XPopperProxy @confirm="handleDeleteConfirm">
            <XVirtualTable
              ref="tableRef"
              row-key="id"
              :columns="COLUMNS_CONFIG"
              :data="roleList"
              :pagination="listParams"
            >
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
                <div v-if="row.name !== '超级管理员'">
                  <el-button link type="primary" @click="handleEdit(row)"
                    >编辑</el-button
                  >
                  <el-divider direction="vertical" />
                  <el-button link type="primary" @click="handlePermission(row)"
                    >权限</el-button
                  >
                  <el-divider direction="vertical" />
                  <el-button
                    link
                    type="danger"
                    data-proxy-popover
                    data-popover-title="确定删除此角色吗？"
                    :data-row-data="JSON.stringify({ id: row.id })"
                  >
                    删除
                  </el-button>
                </div>
              </template>
            </XVirtualTable>
          </XPopperProxy>
        </div>
      </el-card>
    </div>

    <el-card
      v-show="isPermissionDialogShow"
      shadow="never"
      class="min-w-67 h-full flex flex-col"
    >
      <template #header>
        <div class="flex gap-x-4 justify-between leading-8">
          <p class="font-bold truncate">{{ curRow?.name || "菜单权限" }}</p>

          <div class="flex items-center gap-x-2">
            <span
              v-for="action in HEADER_ACTIONS"
              :key="action.tip"
              class="size-5.5 flex items-center justify-center outline-hidden rounded-sm cursor-pointer transition-colors hover:bg-[#0000000f] dark:hover:bg-[#ffffff1f] dark:hover:text-[#ffffffd9]"
            >
              <IconifyIconOffline
                v-tippy="{ content: action.tip }"
                width="18px"
                height="18px"
                :icon="action.icon"
                @click="action.handler"
              />
            </span>
          </div>
        </div>
      </template>

      <div class="flex flex-col h-full">
        <el-input
          v-model="treeSearchValue"
          placeholder="请输入菜单进行搜索"
          class="mb-2"
          clearable
          @input="onQueryChanged"
        />

        <div class="flex-1 min-h-0">
          <el-tree-v2
            ref="treeRef"
            show-checkbox
            :data="permissionTree"
            :props="TREE_PROPS"
            :height="treeHeight"
            :check-strictly="true"
            :filter-method="filterMethod"
            :loading="permissionLoading"
            :default-expanded-keys="defaultExpandedKeys"
            @check-change="handleCheckChange"
          >
            <template #default="{ data }">
              <span class="flex items-center gap-1">
                <IconifyIconOnline
                  v-if="data.icon"
                  :icon="data.icon"
                  class="text-sm"
                />
                <span>{{ data.name }}</span>
                <el-tag v-if="data.type === 2" size="small" type="warning"
                  >按钮</el-tag
                >
              </span>
            </template>
          </el-tree-v2>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h, nextTick } from "vue";
import { ElMessage, type TreeV2Instance } from "element-plus";
import { Refresh, Plus, Search } from "@element-plus/icons-vue";
import {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  type Role,
  updateRoleStatus
} from "@/api/role";
import { getPermissions, type Permission } from "@/api/permission";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import RoleForm from "./RoleForm.vue";
import Close from "~icons/ep/close";
import Check from "~icons/ep/check";
import { useResizeObserver } from "@vueuse/core";

defineOptions({ name: "SystemRoles" });

// --- 静态常量配置 ---
const TREE_PROPS = { value: "id", label: "name", children: "children" };
const COLUMNS_CONFIG: any[] = [
  { field: "name", title: "角色名称", minWidth: 150 },
  { field: "user_count", title: "成员数量", width: 120 },
  { field: "description", title: "角色描述", minWidth: 180 },
  {
    field: "status",
    title: "状态",
    width: 100,
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
    width: 180,
    slots: { default: "operation-default" },
    params: { noSetColumn: true }
  }
];

// --- 响应式状态 ---
const loading = ref(false);
const permissionLoading = ref(false);
const isPermissionDialogShow = ref(false);
const treeHeight = ref(400);
const treeSearchValue = ref("");
const roleList = ref<Role[]>([]);
const permissionTree = ref<Permission[]>([]);
const defaultExpandedKeys = ref<number[]>([]);
const curRow = ref<Role | null>(null);
const loadingStatusMap = ref<Record<number, boolean>>({});

const listParams = ref({
  page: 1,
  limit: 100,
  total: 0,
  keyword: ""
});

const tableRef = ref();
const treeRef = ref<TreeV2Instance>();
const contentRef = ref<HTMLDivElement>();

const HEADER_ACTIONS = [
  { tip: "关闭", icon: Close, handler: () => handleClose() },
  { tip: "保存菜单权限", icon: Check, handler: () => handleSave() }
];

const parentMap = new Map<number, number>();
const nodeMap = new Map<number, Permission>();

const buildTreeMaps = (nodes: Permission[]) => {
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    if (node.children?.length) {
      for (const child of node.children) {
        parentMap.set(child.id, node.id);
      }
      buildTreeMaps(node.children);
    }
  }
};

// --- 核心业务逻辑 ---

const fetchRoles = async () => {
  loading.value = true;
  try {
    const res = await getRoles(listParams.value);
    if (res.code === 200) {
      roleList.value = res.data.data;
      listParams.value.total = res.data.total;
    }
  } catch (error) {
    console.error("获取角色列表失败:", error);
  } finally {
    loading.value = false;
  }
};

const handleSearch = () => {
  fetchRoles();
};

/** 重置搜索 */
const handleReset = () => {
  listParams.value.keyword = "";
  fetchRoles();
};

const getAllTreeIds = (nodes: Permission[]): number[] => {
  const ids: number[] = [];
  const walk = (list: Permission[]) => {
    for (const node of list) {
      ids.push(node.id);
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return ids;
};

const fetchPermissions = async () => {
  permissionLoading.value = true;
  try {
    const res = await getPermissions();
    if (res.code === 200) {
      permissionTree.value = res.data;
      defaultExpandedKeys.value = getAllTreeIds(res.data);
      buildTreeMaps(res.data);
    }
  } catch (error) {
    console.error("获取权限列表失败:", error);
  } finally {
    permissionLoading.value = false;
  }
};

const handleCheckChange = (_data: Permission, checked: boolean) => {
  nextTick(() => {
    if (!treeRef.value) return;
    if (checked) {
      propagateDownward(_data.id, true);
      propagateUpward(_data.id);
    } else {
      propagateUncheckUpward(_data.id);
      propagateDownward(_data.id, false);
    }
  });
};

const propagateUpward = (childId: number) => {
  const parentId = parentMap.get(childId);
  if (parentId === undefined) return;
  if (!treeRef.value!.getCheckedKeys().includes(parentId)) {
    treeRef.value!.setChecked(parentId, true, false);
  }
  propagateUpward(parentId);
};

const propagateDownward = (nodeId: number, checked: boolean) => {
  const node = nodeMap.get(nodeId);
  if (!node?.children) return;

  const checkedKeys = treeRef.value!.getCheckedKeys();
  for (const child of node.children) {
    if (checked && !checkedKeys.includes(child.id)) {
      treeRef.value!.setChecked(child.id, true, false);
    } else if (!checked && checkedKeys.includes(child.id)) {
      treeRef.value!.setChecked(child.id, false, false);
    }
    propagateDownward(child.id, checked);
  }
};

const propagateUncheckUpward = (childId: number) => {
  const parentId = parentMap.get(childId);
  if (parentId === undefined) return;

  const parentNode = nodeMap.get(parentId);
  if (!parentNode?.children) return;

  const checkedKeys = treeRef.value!.getCheckedKeys();
  const hasOtherChecked = parentNode.children.some(
    child => child.id !== childId && checkedKeys.includes(child.id)
  );

  if (!hasOtherChecked && checkedKeys.includes(parentId)) {
    treeRef.value!.setChecked(parentId, false, false);
    propagateUncheckUpward(parentId);
  }
};

const handleStatusChange = async (status: 0 | 1, row: Role) => {
  try {
    const roleId = row.id;
    loadingStatusMap.value[roleId] = true;
    const res = await updateRoleStatus(roleId, status);
    loadingStatusMap.value[roleId] = false;
    if (res.code === 200) {
      ElMessage.success(res.msg || "操作成功");
      row.status = status;
    }
  } catch (error) {
    console.error("操作失败:", error);
  }
};

const openRoleDialog = async (row?: Role | null) => {
  const isEdit = !!row;
  addDialog({
    title: isEdit ? "编辑角色" : "添加角色",
    width: "600px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: ({ options }) =>
      h(RoleForm, {
        treeData: permissionTree.value,
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
          ? await updateRole(data.id, data)
          : await createRole(data);
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg || "操作成功");
          fetchRoles();
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

const handleCreate = () => openRoleDialog(null);
const handleEdit = (row: Role) => openRoleDialog(row);

const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deleteRole(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      fetchRoles();
    }
  } catch (error) {
    console.error("删除角色失败:", error);
  }
};

const handlePermission = async (row: Role) => {
  if (!permissionTree.value.length) {
    await fetchPermissions();
  }

  isPermissionDialogShow.value = true;
  curRow.value = row;
  treeSearchValue.value = "";

  await nextTick();

  const keysToCheck = new Set(row.permission_ids);
  const collectAncestors = (id: number) => {
    const pid = parentMap.get(id);
    if (pid !== undefined) {
      keysToCheck.add(pid);
      collectAncestors(pid);
    }
  };
  row.permission_ids.forEach(pid => collectAncestors(pid));
  treeRef.value!.setCheckedKeys([...keysToCheck]);
};

const handleClose = () => {
  isPermissionDialogShow.value = false;
  curRow.value = null;
};

const handleSave = async () => {
  if (!curRow.value) return;
  try {
    const res = await updateRole(curRow.value.id, {
      name: curRow.value.name,
      description: curRow.value.description,
      status: curRow.value.status,
      permission_ids: treeRef.value!.getCheckedKeys()
    });
    if (res.code === 200) {
      ElMessage.success("保存成功");
      handleClose();
      fetchRoles();
    } else {
      ElMessage.error(res.msg || "保存失败");
    }
  } catch (error) {
    console.error("保存权限失败:", error);
    ElMessage.error("保存权限失败");
  }
};

const onQueryChanged = (query: string) => treeRef.value?.filter(query);
const filterMethod = (query: string, node: Permission) =>
  !!node.name?.includes(query);

// --- 监听高度变化 ---
onMounted(() => {
  fetchRoles();

  if (contentRef.value) {
    useResizeObserver(contentRef, entries => {
      const entry = entries[0];
      const { height } = entry.contentRect;
      // 减去搜索框和内边距的补差
      treeHeight.value = height - 48;
    });
  }
});
</script>
