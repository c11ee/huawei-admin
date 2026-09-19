<template>
  <div class="w-full">
    <div class="mb-2 flex items-center justify-between">
      <span class="text-xs text-(--el-text-color-secondary)">
        共 {{ skus.length }} 条，规格项/规格值变更后自动重新生成
      </span>
      <el-button
        link
        type="primary"
        :icon="Refresh"
        @click="emit('regenerate')"
      >
        重新生成
      </el-button>
    </div>

    <el-table
      :data="tableData"
      size="small"
      border
      class="sku-table"
      :span-method="specSpanMethod"
      :row-class-name="skuRowClassName"
    >
      <el-table-column label="默认" width="60" align="center">
        <template #default="{ row }">
          <el-radio
            v-if="!isBatchRow(row)"
            :model-value="defaultSkuId"
            :value="row.id"
            @change="setDefaultSku(row.id)"
          >
            <span />
          </el-radio>
        </template>
      </el-table-column>

      <!-- 规格按规格项拆列，相邻行相同规格值纵向合并 -->
      <el-table-column
        v-for="(specItem, specIndex) in specList"
        :key="specItem.id"
        :label="specItem.name || `规格${specIndex + 1}`"
        min-width="110"
      >
        <template #default="{ row }">
          <el-select
            v-if="isBatchRow(row)"
            v-model="batchSpecValues[specItem.id]"
            size="small"
            clearable
            placeholder="全部"
            class="w-full"
          >
            <el-option
              v-for="value in specItem.values"
              :key="value.id"
              :label="value.value"
              :value="value.id"
            />
          </el-select>
          <span v-else class="text-xs">
            {{ specValueOf(row.spec_value_ids, specIndex) }}
          </span>
        </template>
      </el-table-column>

      <el-table-column label="SKU编码" width="180">
        <template #default="{ row }">
          <el-tooltip
            v-if="isBatchRow(row)"
            content="选择规格值后填写，只应用到匹配的 SKU；留空不改"
            placement="top"
          >
            <span class="text-xs text-(--el-color-primary)">批量设置</span>
          </el-tooltip>
          <el-input
            v-else
            v-model="row.sku_code"
            size="small"
            placeholder="如：HW-PH-001-001"
            @input="row.auto_code = false"
          />
        </template>
      </el-table-column>

      <el-table-column label="SKU名称" width="220">
        <template #default="{ row }">
          <span
            v-if="isBatchRow(row)"
            class="text-xs text-(--el-text-color-secondary)"
          >
            将应用到 {{ batchTargetCount }} 个 SKU
          </span>
          <el-input
            v-else
            v-model="row.name"
            size="small"
            placeholder="默认按商品名称+规格生成"
            @input="row.auto_name = false"
          />
        </template>
      </el-table-column>

      <el-table-column label="SKU图片" width="90">
        <template #default="{ row }">
          <XAttachmentPicker
            v-if="!isBatchRow(row)"
            v-model="row.image_url"
            title="选择SKU图片"
            :size="48"
          />
        </template>
      </el-table-column>

      <el-table-column label="售价(元)" width="130">
        <template #default="{ row }">
          <el-input-number
            v-model="row.sale_price"
            class="w-full"
            size="small"
            :min="0"
            :precision="2"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'sale_price')"
          />
        </template>
      </el-table-column>

      <el-table-column label="成本价(元)" width="130">
        <template #default="{ row }">
          <el-input-number
            v-model="row.cost_price"
            class="w-full"
            size="small"
            :min="0"
            :precision="2"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'cost_price')"
          />
        </template>
      </el-table-column>

      <el-table-column label="划线价(元)" width="130">
        <template #default="{ row }">
          <el-input-number
            v-model="row.strike_price"
            class="w-full"
            size="small"
            :min="0"
            :precision="2"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'strike_price')"
          />
        </template>
      </el-table-column>

      <el-table-column label="库存" width="110">
        <template #default="{ row }">
          <el-input-number
            v-model="row.stock"
            class="w-full"
            size="small"
            :min="0"
            :precision="0"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'stock')"
          />
        </template>
      </el-table-column>

      <el-table-column label="重量(kg)" width="110">
        <template #default="{ row }">
          <el-input-number
            v-model="row.weight"
            class="w-full"
            size="small"
            :min="0"
            :precision="3"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'weight')"
          />
        </template>
      </el-table-column>

      <el-table-column label="体积(m³)" width="120">
        <template #default="{ row }">
          <el-input-number
            v-model="row.volume"
            class="w-full"
            size="small"
            :min="0"
            :precision="6"
            :controls="false"
            :placeholder="isBatchRow(row) ? '批量' : ''"
            @change="handleBatchNumber(row, 'volume')"
          />
        </template>
      </el-table-column>

      <el-table-column label="状态" width="90">
        <template #default="{ row }">
          <el-switch
            v-model="row.status"
            inline-prompt
            :active-value="1"
            :inactive-value="0"
            active-text="上架"
            inactive-text="下架"
            @change="handleBatchStatus(row)"
          />
        </template>
      </el-table-column>
    </el-table>

    <div
      v-if="!skus.length"
      class="mt-2 text-xs text-(--el-text-color-placeholder)"
    >
      请先完善规格项与规格值，系统会按规格组合自动生成 SKU
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Refresh } from "@element-plus/icons-vue";
import XAttachmentPicker from "@/components/XAttachmentPicker/index.vue";
import type {
  BatchNumberField,
  SkuBatchRow,
  SkuDraft,
  SkuTableRow,
  SpecItemDraft,
  TableAnyRow
} from "../types";

const props = defineProps<{
  /** 规格项列表，用于生成规格列与规格值纵向合并 */
  specList: SpecItemDraft[];
}>();

/** SKU 列表 */
const skus = defineModel<SkuDraft[]>("skus", { required: true });
/** 默认 SKU 的ID */
const defaultSkuId = defineModel<number | undefined>("defaultSkuId", {
  required: true
});

const emit = defineEmits<{ regenerate: [] }>();

/** 是否为批量设置行 */
const isBatchRow = (row: TableAnyRow): row is SkuBatchRow & TableAnyRow =>
  (row as SkuBatchRow).__batch === true;

/** 固定在表格第一行的批量设置行 */
const batchRow = reactive<SkuBatchRow>({
  __batch: true,
  sale_price: undefined,
  cost_price: undefined,
  strike_price: undefined,
  stock: undefined,
  weight: undefined,
  volume: undefined,
  status: 1
});

/** 表格数据：第一行为批量设置行 */
const tableData = computed<SkuTableRow[]>(() => [batchRow, ...skus.value]);

/** 批量设置行选中的规格值：规格项ID -> 规格值ID */
const batchSpecValues = reactive<Record<number, number | undefined>>({});

/** 批量设置行的目标 SKU：按选中的规格值筛选，未选规格值则视为全部 */
const batchTargetSkus = computed(() => {
  const selected = Object.values(batchSpecValues).filter((id): id is number =>
    Boolean(id)
  );
  if (!selected.length) return skus.value;
  return skus.value.filter(sku =>
    selected.every(id => sku.spec_value_ids.includes(id))
  );
});

/** 批量设置行将影响的 SKU 数量 */
const batchTargetCount = computed(() => batchTargetSkus.value.length);

/** 规格值被删除后清掉失效的批量筛选，避免下拉框显示原始ID */
watch(
  () => props.specList,
  () => {
    const validIds = new Set(
      props.specList.flatMap(item => item.values.map(value => value.id))
    );
    Object.keys(batchSpecValues).forEach(key => {
      const id = batchSpecValues[Number(key)];
      if (id && !validIds.has(id)) delete batchSpecValues[Number(key)];
    });
  },
  { deep: true }
);

/** 批量设置行的行样式（滚动吸顶） */
const skuRowClassName = ({ row }: { row: TableAnyRow }) =>
  isBatchRow(row) ? "sku-batch-row" : "";

/** 取 SKU 在指定规格项上的规格值 */
const specValueOf = (specValueIds: number[], specIndex: number) => {
  const specItem = props.specList[specIndex];
  if (!specItem) return "";
  return (
    specItem.values.find(value => specValueIds.includes(value.id))?.value ?? ""
  );
};

/** 各规格列的纵向合并数：[规格列下标][SKU行下标]，0 表示被合并 */
const specColumnSpans = computed(() =>
  props.specList.map((_, specIndex) => {
    const values = skus.value.map(row =>
      specValueOf(row.spec_value_ids, specIndex)
    );
    const spans = values.map(() => 1);
    let start = 0;
    for (let i = 1; i <= values.length; i++) {
      if (i < values.length && values[i] === values[start]) continue;
      spans[start] = i - start;
      for (let j = start + 1; j < i; j++) spans[j] = 0;
      start = i;
    }
    return spans;
  })
);

/** 规格列合并：批量设置行的规格列各占一格，其余按相同规格值纵向合并 */
const specSpanMethod = ({
  row,
  rowIndex,
  columnIndex
}: {
  row: TableAnyRow;
  rowIndex: number;
  columnIndex: number;
}) => {
  const specCount = props.specList.length;
  if (isBatchRow(row)) return undefined;
  if (columnIndex < 1 || columnIndex > specCount) return undefined;
  return [specColumnSpans.value[columnIndex - 1]?.[rowIndex - 1] ?? 1, 1];
};

/** 批量设置行的数值变更：同步到匹配的 SKU（留空不改） */
const handleBatchNumber = (row: TableAnyRow, field: BatchNumberField) => {
  if (!isBatchRow(row)) return;
  const value = row[field];
  if (value === undefined || value === null) return;
  batchTargetSkus.value.forEach(sku => {
    sku[field] = Number(value);
  });
};

/** 批量设置行的状态变更：同步到匹配的 SKU */
const handleBatchStatus = (row: TableAnyRow) => {
  if (!isBatchRow(row)) return;
  batchTargetSkus.value.forEach(sku => {
    sku.status = row.status;
  });
};

/** 选择默认 SKU */
const setDefaultSku = (id: number) => {
  defaultSkuId.value = id;
};
</script>

<style scoped>
/* 表格内输入框跟随列宽，避免 element-plus 默认宽度把单元格内容截断 */
.sku-table :deep(.el-input),
.sku-table :deep(.el-input-number) {
  width: 100%;
}

.sku-table :deep(.sku-batch-row td) {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--el-fill-color-lighter);
}

.sku-table :deep(.sku-batch-row:hover > td) {
  background: var(--el-fill-color-lighter);
}
</style>
