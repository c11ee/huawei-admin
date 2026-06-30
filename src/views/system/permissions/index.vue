<template>
  <div class="h-full w-full flex">
    <el-card shadow="never" class="h-full w-full">
      <template #header>
        <div class="card-header flex items-center justify-between">
          <span class="text-lg font-bold">权限列表</span>
          <div class="flex items-center">
            <el-button type="primary" :icon="Plus" @click="handleCreateTop"
              >添加顶级权限</el-button
            >
            <el-button
              :icon="Refresh"
              :loading="loading"
              @click="handleRefresh"
            >
              刷新
            </el-button>
          </div>
        </div>
      </template>

      <div v-loading="loading" class="h-full min-h-0 overflow-hidden">
        <XPopperProxy @confirm="handleDeleteConfirm">
          <XVirtualTable
            ref="tableRef"
            row-key="id"
            :columns="columnsConfig"
            :data="permissionTree"
            :extra-grid-options="{
              treeConfig: { childrenField: 'children', expandAll: true }
            }"
          >
            <!-- 类型列自定义渲染 -->
            <template #type-default="{ row }">
              <el-tag
                :type="row.type === 1 ? 'primary' : 'success'"
                effect="plain"
              >
                {{ row.type === 1 ? "菜单" : "按钮" }}
              </el-tag>
            </template>
            <!-- 图标列自定义渲染 -->
            <template #icon-default="{ row }">
              <div class="flex justify-center">
                <IconifyIconOnline :icon="row.icon" />
              </div>
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
                data-popover-title="确定删除此权限吗？"
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
import { ref, onMounted, h, nextTick } from "vue";
import { ElMessage } from "element-plus";
import { Refresh, Plus } from "@element-plus/icons-vue";
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  type Permission
} from "@/api/permission";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import XPopperProxy from "@/components/XPopperProxy/index.vue";
import { addDialog, closeDialog } from "@/components/ReDialog";
import PermissionForm from "./PermissionForm.vue";
import { initRouter } from "@/router/utils.js";

defineOptions({
  name: "SystemPermissions"
});

const loading = ref(false);
const permissionTree = ref<Permission[]>([]);
const tableRef = ref();

/** 列配置 */
const columnsConfig = ref<Column[]>([
  {
    field: "name",
    title: "权限名称",
    minWidth: 200,
    treeNode: true,
    align: "left"
  },
  {
    field: "key",
    title: "权限标识",
    width: 200
  },
  {
    field: "path",
    title: "路由路径",
    minWidth: 200
  },
  {
    field: "type",
    title: "类型",
    width: 100,
    slots: { default: "type-default" },
    params: {
      localFilter: true,
      filterConfig: {
        1: "菜单",
        2: "按钮"
      }
    }
  },
  {
    field: "icon",
    title: "图标",
    width: 100,
    slots: { default: "icon-default" }
  },
  {
    field: "sort",
    title: "排序",
    width: 70
  },
  {
    field: "remark",
    title: "备注",
    minWidth: 160
  },
  {
    field: "created_at",
    title: "创建时间",
    width: 180
  },
  {
    field: "operation",
    title: "操作",
    width: 180,
    slots: { default: "operation-default" }
  }
]);

/** 获取权限列表 */
const fetchPermissions = async () => {
  loading.value = true;
  try {
    const res = await getPermissions();
    if (res.code === 200) {
      permissionTree.value = res.data;
    }
  } catch (error) {
    console.error("获取权限列表失败:", error);
    ElMessage.error("获取权限列表失败");
  } finally {
    loading.value = false;
  }
};

/** 刷新 */
const handleRefresh = () => {
  fetchPermissions();
  // 重新生成路由配置
  initRouter();
};

/** 打开添加/编辑权限对话框 */
const openPermissionDialog = (
  defaultParentId?: number,
  row?: Permission | null
) => {
  const isEdit = !!row;
  const title = isEdit ? "编辑权限" : "添加权限";

  addDialog({
    title,
    width: "700px",
    closeOnClickModal: false,
    sureBtnLoading: true,
    contentRenderer: ({ options }) => {
      return h(PermissionForm, {
        treeData: permissionTree.value,
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
        let res: ApiResponse<Permission>;
        if (isEdit) {
          res = await updatePermission(data.id, data);
        } else {
          res = await createPermission(data);
        }
        if (res.code === 200) {
          closeDialog(options, index);
          ElMessage.success(res.msg);
          if (isEdit) {
            updateTreeNode(res.data);
          } else {
            addTreeNode(res.data);
          }
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

/** 添加顶级权限（顶部工具栏） */
const handleCreateTop = () => {
  openPermissionDialog(0, null);
};

/** 添加子级权限（行内） */
const handleAdd = (row: Permission) => {
  openPermissionDialog(row.id, null);
};

/** 编辑权限 */
const handleEdit = (row: Permission) => {
  openPermissionDialog(undefined, row);
};

/** 接收 Popover 确认删除的回调 */
const handleDeleteConfirm = async (row: { id: number }) => {
  try {
    const res = await deletePermission(row.id);
    if (res.code === 200) {
      ElMessage.success("删除成功");
      fetchPermissions();
    }
  } catch (error) {
    console.error("删除权限失败:", error);
  }
};

/**
 * 在权限树中查找指定 id 的节点
 */
const findNodeById = (nodes: Permission[], id: number): Permission | null => {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children?.length) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
};

/**
 * 将新权限按 sort 顺序插入到对应父节点下
 */
const addTreeNode = (newNode: Permission) => {
  const { parent_id } = newNode;

  if (!parent_id) {
    // 顶级权限，插入根列表
    permissionTree.value.push(newNode);
    permissionTree.value.sort((a, b) => a.sort - b.sort);
  } else {
    const parent = findNodeById(permissionTree.value, parent_id);
    if (!parent) {
      // 找不到父节点，回退到全量刷新
      fetchPermissions();
      return;
    }

    // 创建新数组引用，触发 VxeTable 树形节点更新
    parent.children = [...(parent.children || []), newNode].sort(
      (a, b) => a.sort - b.sort
    );
  }

  // 重新加载数据，触发表格重新渲染
  nextTick(() => {
    const gridRef = tableRef.value?.getGridRef();
    if (!gridRef) return;

    gridRef.loadData(permissionTree.value);

    // 数据已刷新，需要重新查找节点引用
    const expandedParent = findNodeById(permissionTree.value, parent_id);
    if (expandedParent) {
      gridRef.setTreeExpand([expandedParent], true);
    }
  });
};

/**
 * 在权限树中替换已更新的节点
 */
const updateTreeNode = (updatedNode: Permission) => {
  const target = findNodeById(permissionTree.value, updatedNode.id);
  if (target) {
    Object.assign(target, updatedNode);
  } else {
    // 找不到节点，回退到全量刷新
    fetchPermissions();
  }
};

onMounted(() => {
  fetchPermissions();
});
</script>
