<template>
  <div>
    <el-card header="XVirtualTable 企业级虚拟表格演示（数千条数据秒开不卡顿）">
      <div
        style="
          margin-bottom: 16px;
          display: flex;
          gap: 12px;
          align-items: center;
        "
      >
        <el-button
          type="danger"
          :disabled="!selectedRows.length"
          @click="batchDelete"
        >
          批量删除 (已选 {{ selectedCount }} 项)
        </el-button>
        <el-button @click="selectFirstFive">勾选前5行(控制反转)</el-button>
        <el-button @click="clearAllSelections">清除所有勾选</el-button>
      </div>

      <div class="h-125">
        {{ selectedRows }}
        <XVirtualTable
          ref="tableRef"
          v-model:selectedRows="selectedRows"
          :columns="columnsConfig"
          :data="mockData"
          :loading="loading"
          @sort-change="handleServerSort"
          @switch-change="handleStatusSwitch"
        >
          <template #expand-content="{ row }">
            <p style="margin: 0; color: #666">
              <strong>详细日志描述：</strong>
              {{ row.detailDesc || "暂无更多系统级拓展详情" }}
            </p>
          </template>

          <template #level-tag="{ row }">
            <el-tag
              :type="
                row.level === 'High'
                  ? 'danger'
                  : row.level === 'Medium'
                    ? 'warning'
                    : 'success'
              "
            >
              {{ row.level }}
            </el-tag>
          </template>
        </XVirtualTable>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { ElMessage } from "element-plus";
import XVirtualTable from "@/components/XVirtualTable/index.vue";
import { VxeGridPropTypes } from "vxe-table";

const tableRef = ref<any>(null);
const loading = ref(false);
const selectedRows = ref<any[]>([]);
const selectedCount = ref(0);
const mockData = ref<any[]>([]);

// 模拟生产级数千条数据流
const generateMockData = () => {
  loading.value = true;
  const list: any[] = [];
  const levels = ["High", "Medium", "Low"];
  const categories = ["Finance", "Security", "Operations", "Development"];

  for (let i = 1; i <= 3500; i++) {
    list.push({
      id: `ROW_ID_${i}`,
      taskName: `自动化测试分析任务集群序列号 - #${i}`,
      category: categories[i % categories.length],
      level: levels[i % levels.length],
      status: i % 3 !== 0,
      creator: `Admin-User-${i}`,
      detailDesc: `此日志是由系统自动在核心线程 [Pool-${i}] 中捕获并持久化存储。涉及的高级参数包括虚拟节点寻址和微服务调用拓扑追踪，数据量级庞大。`
    });
  }
  mockData.value = list;
  loading.value = false;
};

// 严谨全面的多类型多级列排布配置
const columnsConfig = ref<VxeGridPropTypes.Column[]>([
  {
    field: "checkbox",
    type: "checkbox",
    width: 60,
    title: "选择",
    params: {
      noSetColumn: true
    }
  }, // 多选框（自带跨页记忆）
  {
    field: "expand",
    type: "expand",
    width: 50,
    title: "展开",
    params: {
      noSetColumn: true
    },
    slots: { content: "expand-content" }
  }, // 展开行
  {
    field: "taskName",
    width: 200,
    title: "核心任务属性分组",
    align: "center",
    children: [
      { field: "id", title: "任务ID", width: 120, sortable: true },
      {
        field: "detailDesc",
        title: "详细日志描述",
        minWidth: 260
      }
    ]
  },
  {
    field: "category",
    title: "所属范畴",
    width: 140,
    params: {
      localFilter: true
    }
  },
  {
    field: "level",
    title: "优先级级别",
    width: 130,
    params: {
      localFilter: true
    },
    slots: { default: "level-tag" } // 外部自定义 Tag 插槽
  },
  {
    field: "status",
    title: "服务激活状态",
    width: 130
  },
  {
    field: "creator",
    title: "创建人",
    width: 140,
    params: {
      noSetColumn: true
    }
  }
]);

// 响应服务端排序回调
const handleServerSort = ({ field, order, orderBy }: any) => {
  ElMessage.info(`向后端请求排序，参数字符串 -> orderBy: "${orderBy}"`);
  console.log("排序详细结构：", { field, order, orderBy });
  // 真实场景下，在此处调用后端 API 刷新 mockData 即可
};

// 响应便捷式开关变化回调
const handleStatusSwitch = async ({ row, field, value }: any) => {
  row.__switchLoading = true; // 局部行 loading 防御
  ElMessage.success(
    `状态变更拦截：ID [${row.id}] 的 ${field} 字段已被修改为 -> ${value}`
  );

  // 模拟异步网路回写
  setTimeout(() => {
    row.__switchLoading = false;
  }, 500);
};

// 外部控制反转示例：快速选中前 5 行
const selectFirstFive = () => {
  if (tableRef.value && mockData.value.length >= 5) {
    const firstFive = mockData.value.slice(0, 5);
    tableRef.value.setCheckboxRow(firstFive, true);
    ElMessage.success("已通过外部接口强制批量勾选前 5 条记录");
  }
};

// 外部控制反转示例：一键清空
const clearAllSelections = () => {
  tableRef.value?.clearCheckboxRow();
  ElMessage.warning("已清空全部页面所有勾选历史");
};

const batchDelete = () => {
  ElMessage.error(
    `触发批量删除，共涉及 ${selectedRows.value.length} 条跨页数据`
  );
};

onMounted(() => {
  generateMockData();
});
</script>
