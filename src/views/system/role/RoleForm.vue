<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="100px"
    label-position="right"
  >
    <el-form-item label="角色名称" prop="name">
      <el-input
        v-model="formData.name"
        placeholder="请输入角色名称"
        maxlength="50"
      />
    </el-form-item>

    <el-form-item label="角色描述" prop="description">
      <el-input
        v-model="formData.description"
        type="textarea"
        placeholder="请输入角色描述"
        :rows="3"
        maxlength="200"
      />
    </el-form-item>

    <el-form-item label="状态" prop="status">
      <el-switch
        v-model="formData.status"
        inline-prompt
        :active-value="1"
        :inactive-value="0"
        active-text="启用"
        inactive-text="禁用"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { Role, RoleStatus } from "@/api/role";
import type { Permission } from "@/api/permission";

interface Props {
  /** 权限树数据 */
  treeData?: Permission[];
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: Role | null;
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  row: null
});

const formRef = ref<FormInstance>();

const formData = reactive({
  id: props.row?.id ?? undefined,
  name: props.row?.name ?? "",
  description: props.row?.description ?? "",
  status: (props.row?.status ?? 1) as RoleStatus,
  permission_ids: props.row?.permission_ids ?? []
});

const rules: FormRules = {
  name: [{ required: true, message: "请输入角色名称", trigger: "blur" }]
};

/** 获取表单数据（供 dialog beforeSure 回调调用） */
const getFormData = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return null;

  return formData;
};

defineExpose({ getFormData });
</script>
