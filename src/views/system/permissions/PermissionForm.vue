<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="100px"
    label-position="right"
  >
    <el-form-item label="类型" prop="type">
      <el-radio-group v-model="formData.type">
        <el-radio-button :value="1">菜单</el-radio-button>
        <el-radio-button :value="2">按钮</el-radio-button>
      </el-radio-group>
    </el-form-item>

    <el-form-item label="父级节点" prop="parent_id">
      <el-tree-select
        v-model="formData.parent_id"
        :data="treeData"
        :props="{
          children: 'children',
          label: 'name'
        }"
        default-expand-all
        node-key="id"
        filterable
        clearable
        placeholder="请选择父级权限（不选则为顶级权限）"
        class="w-full"
        check-strictly
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
      </el-tree-select>
    </el-form-item>

    <div class="grid grid-cols-2">
      <el-form-item label="权限名称" prop="name">
        <el-input
          v-model="formData.name"
          placeholder="请输入权限名称"
          maxlength="50"
        />
      </el-form-item>

      <el-form-item label="权限标识" prop="key">
        <el-input
          v-model="formData.key"
          placeholder="请输入权限标识，如 user.index"
          maxlength="100"
        />
      </el-form-item>

      <el-form-item v-if="formData.type === 1" label="路由路径" prop="path">
        <el-input
          v-model="formData.path"
          placeholder="请输入路由路径"
          maxlength="200"
        />
      </el-form-item>

      <el-form-item v-if="formData.type === 1" label="图标" prop="icon">
        <IconSelect v-model="formData.icon" class="w-full" />
      </el-form-item>
    </div>

    <el-form-item label="排序" prop="sort">
      <el-input-number
        v-model="formData.sort"
        :min="0"
        :max="9999"
        controls-position="right"
      />
    </el-form-item>

    <el-form-item label="备注" prop="remark">
      <el-input
        v-model="formData.remark"
        type="textarea"
        placeholder="请输入备注"
        :rows="3"
        maxlength="200"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { PermissionType, Permission } from "@/api/permission";
import { IconSelect } from "@/components/ReIcon";

interface Props {
  /** 父级权限树数据（供 tree-select 选择） */
  treeData?: Permission[];
  /** 默认选中的父级节点 id（行内添加时传入） */
  defaultParentId?: number;
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: Permission | null;
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  defaultParentId: undefined,
  row: null
});

const treeData = computed(() => [
  {
    id: 0,
    name: "根节点",
    children: props.treeData
  }
]);

const formRef = ref<FormInstance>();

const formData = reactive({
  id: props.row?.id ?? undefined,
  name: props.row?.name ?? "",
  key: props.row?.key ?? "",
  type: (props.row?.type ?? 1) as PermissionType,
  path: props.row?.path ?? "",
  icon: props.row?.icon ?? "",
  sort: props.row?.sort ?? 0,
  remark: props.row?.remark ?? "",
  parent_id: props.row?.parent_id ?? props.defaultParentId
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入权限名称", trigger: "blur" }],
  key: [{ required: true, message: "请输入权限标识", trigger: "blur" }],
  type: [{ required: true, message: "请选择类型", trigger: "change" }],
  path: [
    {
      trigger: "blur",
      validator: (_rule, value, callback) => {
        if (formData.type === 1 && !value) {
          callback(new Error("请输入路由路径"));
        } else {
          callback();
        }
      }
    }
  ]
};

/** 获取表单数据（供 dialog beforeSure 回调调用） */
const getFormData = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return null;
  return {
    ...formData
  };
};

defineExpose({ getFormData });
</script>