<template>
  <div v-if="user" class="flex justify-center items-center gap-x-1.5">
    <el-avatar :size="24" :src="user.avatar || undefined" class="shrink-0">
      {{ user.nickname?.charAt(0) || "?" }}
    </el-avatar>
    <span class="truncate">{{ user.nickname || user.username || "-" }}</span>
  </div>
  <span v-else class="text-(--el-text-color-placeholder)">-</span>
</template>

<script setup lang="ts">
import type { Operator } from "@/api/types/user";

defineOptions({
  name: "XOperatorCell"
});

defineProps<{
  /** 创建人 / 更新人信息，为空时展示 - */
  user?: Operator | null;
}>();
</script>
