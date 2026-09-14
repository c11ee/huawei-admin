<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="rules"
    label-width="100px"
    label-position="right"
  >
    <el-form-item label="父级分类" prop="parent_id">
      <el-tree-select
        v-model="formData.parent_id"
        :data="treeOptions"
        :props="{
          children: 'children',
          label: 'category_name',
          disabled: 'disabled'
        }"
        default-expand-all
        node-key="id"
        filterable
        clearable
        check-strictly
        placeholder="请选择父级分类（不选则为顶级分类）"
        class="w-full"
      />
    </el-form-item>

    <el-form-item label="分类名称" prop="category_name">
      <el-input
        v-model="formData.category_name"
        placeholder="请输入分类名称"
        maxlength="100"
      />
    </el-form-item>

    <el-form-item label="图标" prop="icon">
      <XAttachmentPicker v-model="formData.icon" />
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
import { ref, reactive, computed } from "vue";
import type { FormInstance, FormRules } from "element-plus";
import type { Category, CategoryStatus } from "@/api/category";
import XAttachmentPicker from "@/components/XAttachmentPicker/index.vue";

interface Props {
  /** 分类树数据（供 tree-select 选择父级） */
  treeData?: Category[];
  /** 默认选中的父级分类 id（行内添加时传入） */
  defaultParentId?: number;
  /** 编辑时传入的当前行数据（有值则为编辑模式） */
  row?: Category | null;
}

const props = withDefaults(defineProps<Props>(), {
  treeData: () => [],
  defaultParentId: undefined,
  row: null
});

const formRef = ref<FormInstance>();

const formData = reactive({
  id: props.row?.id ?? undefined,
  category_name: props.row?.category_name ?? "",
  parent_id: (props.row?.parent_id ?? props.defaultParentId ?? 0) as number,
  icon: props.row?.icon ?? "",
  status: (props.row?.status ?? 1) as CategoryStatus,
  sort: props.row?.sort ?? 0
});

/** 编辑时禁用的节点（自身及其子孙），避免父分类形成环 */
const disabledIds = computed(() => {
  const ids = new Set<number>();
  if (!props.row) return ids;

  const find = (nodes: Category[]): Category | null => {
    for (const node of nodes) {
      if (node.id === props.row.id) return node;
      const found = node.children?.length ? find(node.children) : null;
      if (found) return found;
    }
    return null;
  };

  const current = find(props.treeData);
  if (!current) {
    ids.add(props.row.id);
    return ids;
  }

  const collect = (node: Category) => {
    ids.add(node.id);
    node.children?.forEach(collect);
  };
  collect(current);
  return ids;
});

/** 追加“顶级分类”根节点，并标记编辑时不可选的节点 */
const treeOptions = computed(() => {
  const mark = (nodes: Category[]): any[] =>
    nodes.map(node => ({
      ...node,
      disabled: disabledIds.value.has(node.id),
      children: node.children?.length ? mark(node.children) : undefined
    }));

  return [{ id: 0, category_name: "顶级分类", children: mark(props.treeData) }];
});

const rules: FormRules = {
  category_name: [
    { required: true, message: "请输入分类名称", trigger: "blur" },
    { max: 100, message: "分类名称不能超过100个字符", trigger: "blur" }
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
