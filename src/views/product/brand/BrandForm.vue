<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="100px"
    label-position="right"
  >
    <el-form-item label="品牌名称" prop="name">
      <el-input
        v-model="formData.name"
        placeholder="请输入品牌名称"
        maxlength="100"
      />
    </el-form-item>

    <el-form-item label="品牌Logo" prop="logo">
      <XAttachmentPicker v-model="formData.logo" />
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

    <el-form-item label="排序" prop="sort">
      <el-input-number
        v-model="formData.sort"
        :min="0"
        :max="9999"
        controls-position="right"
      />
    </el-form-item>
  </el-form>
</template>

<script setup lang="ts">
import { ref, reactive } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { Brand, BrandStatus } from "@/api/brand";
import XAttachmentPicker from "@/components/XAttachmentPicker/index.vue";

interface Props {
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: Brand | null;
}

const props = withDefaults(defineProps<Props>(), {
  row: null
});

const formRef = ref<FormInstance>();

const formData = reactive({
  id: props.row?.id ?? undefined,
  name: props.row?.name ?? "",
  logo: props.row?.logo ?? "",
  status: (props.row?.status ?? 1) as BrandStatus,
  sort: props.row?.sort ?? 0
});

const rules: FormRules = {
  name: [
    { required: true, message: "请输入品牌名称", trigger: "blur" },
    { max: 100, message: "品牌名称不能超过100个字符", trigger: "blur" }
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
