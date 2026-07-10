<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="80px"
    label-position="right"
  >
    <el-form-item label="昵称" prop="nickname">
      <el-input
        v-model="formData.nickname"
        placeholder="请输入昵称"
        maxlength="50"
      />
    </el-form-item>

    <el-form-item label="用户名" prop="username">
      <el-input
        v-model="formData.username"
        placeholder="请输入登录用户名"
        maxlength="50"
        :disabled="isEdit"
      />
    </el-form-item>

    <el-form-item label="手机号" prop="phone">
      <el-input
        v-model="formData.phone"
        placeholder="请输入手机号"
        maxlength="11"
      />
    </el-form-item>
    <el-form-item label="邮箱" prop="email">
      <el-input
        v-model="formData.email"
        placeholder="请输入邮箱"
        maxlength="11"
      />
    </el-form-item>

    <el-form-item label="角色" prop="role_ids">
      <el-select
        v-model="formData.role_ids"
        multiple
        placeholder="请选择角色"
        class="w-full!"
      >
        <el-option
          v-for="role in roleOptions"
          :key="role.id"
          :label="role.name"
          :value="role.id"
        />
      </el-select>
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input
        v-model="formData.password"
        type="password"
        placeholder="请输入密码"
        maxlength="50"
        show-password
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
import { ref, reactive, computed, onMounted } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { User } from "@/api/types/user";
import { getRoles, type Role } from "@/api/role";

interface Props {
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: User | null;
}

const props = withDefaults(defineProps<Props>(), {
  row: null
});

const isEdit = computed(() => !!props.row);

const formRef = ref<FormInstance>();
const roleOptions = ref<Role[]>([]);

const formData = reactive({
  id: props.row?.id ?? undefined,
  nickname: props.row?.nickname ?? "",
  username: props.row?.username ?? "",
  password: "",
  phone: props.row?.phone ?? "",
  email: props.row?.email ?? "",
  status: (props.row?.status ?? 1) as 0 | 1,
  role_ids: props.row?.role_ids
    ? String(props.row.role_ids).split(",").map(Number).filter(Boolean)
    : []
});

const rules: FormRules = {
  nickname: [{ required: true, message: "请输入昵称", trigger: "blur" }],
  username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
  password: props.row
    ? []
    : [{ required: true, message: "请输入密码", trigger: "blur" }],
  phone: [
    {
      // required: true,
      pattern: /^1[3-9]\d{9}$/,
      message: "请输入正确的手机号",
      trigger: "blur"
    }
  ],
  role_ids: [{ required: true, message: "请选择角色", trigger: "change" }]
};

// 编辑模式下密码非必填
if (isEdit.value) {
  rules.password = [];
}

const fetchRoles = async () => {
  try {
    const res = await getRoles({ page: 1, limit: 999, keyword: "" });
    if (res.code === 200) {
      roleOptions.value = res.data.data;
    }
  } catch (error) {
    console.error("获取角色列表失败:", error);
  }
};

/** 获取表单数据（供 dialog beforeSure 回调调用） */
const getFormData = async () => {
  const valid = await formRef.value?.validate().catch(() => false);
  if (!valid) return null;

  return {
    ...formData,
    role_ids: formData.role_ids.join(",")
  };
};

onMounted(() => {
  fetchRoles();
});

defineExpose({ getFormData });
</script>
