import { getColumnsPreference, setColumnsPreference } from "@/api/column";
import { useUserStoreHook } from "@/store/modules/user";
import { cloneDeep } from "@pureadmin/utils";
import { computed, ref, Ref } from "vue";
import { useRoute } from "vue-router";
import { VxeGridEvents, VxeGridInstance, VxeGridPropTypes } from "vxe-table";

type Columns = VxeGridPropTypes.Column[];

export function useColumns(
  initialColumns: Columns,
  diyKey: string | undefined,
  gridRef: Ref<VxeGridInstance | null>
) {
  const route = useRoute();
  const { userInfo } = useUserStoreHook();
  const renderColumns = ref<Columns>(initialColumns);
  const columnsKey = computed<string>(() => {
    return (diyKey || (route.name as string)) + "_" + userInfo?.id;
  });

  /** 向服务器发送列配置 */
  const sendColumns = (columns: Columns) => {
    setColumnsPreference({
      key: columnsKey.value,
      columns
    });
  };

  /** 获取服务器列配置  */
  const getColumns = () => {
    getColumnsPreference(columnsKey.value).then(res => {
      renderColumns.value = washColumnsByField(res.data, initialColumns);
    });
  };

  /** 外部调用更新列配置函数 */
  function handleColumnsChange(columns: Columns) {
    renderColumns.value = columns;
    sendColumns(columns);
    const $grid = gridRef.value;
    if ($grid) {
      $grid.reloadColumn(columns);
    }
  }

  /** 列拖动结束时触发 */
  const handleColumnDragEnd: VxeGridEvents.ColumnDragend = config => {
    const { newColumn, oldColumn } = config;

    // 1. 找到旧索引和新索引
    const oldIndex = renderColumns.value.findIndex(
      col => col.title === oldColumn.title
    );
    const newIndex = renderColumns.value.findIndex(
      col => col.title === newColumn.title
    );

    // 如果位置没变，直接拦截
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // 2. 脱离 Vue 的响应式监听
    const nextColumns = cloneDeep(renderColumns.value);

    // 3. 如果是从前往后拖拽，由于前面删除了一个元素，目标索引需要向前减 1
    const targetIndex = oldIndex < newIndex ? newIndex - 1 : newIndex;

    // 先取出旧元素
    const [draggedColumn] = nextColumns.splice(oldIndex, 1);
    // 插入到修正后的正确位置
    nextColumns.splice(targetIndex, 0, draggedColumn);

    // 4. 一次性整体赋值，Vue 只会捕捉到一次改变，触发一次渲染
    renderColumns.value = nextColumns;
    sendColumns(nextColumns);
  };

  /** 列宽度改变时触发 */
  const handleColumnResizableChange = ({
    resizeColumn,
    columnIndex,
    resizeWidth
  }: {
    resizeColumn: { level: number; field: string };
    columnIndex: number;
    resizeWidth: number;
  }) => {
    if (resizeColumn.level != 1) {
      // 子列拖拽了宽度
      recursiveSetColumnAttr(
        renderColumns.value,
        resizeColumn.field!,
        "width",
        resizeWidth
      );
    } else {
      renderColumns.value[columnIndex].width = resizeWidth;
    }
    sendColumns(renderColumns.value);
  };

  /**
   * 递归遍历 columns, 设置指定 field 的 指定属性
   * @param columns 表格列
   * @param field 列字段
   * @param attr 要设置的属性
   * @param value 属性值
   */
  const recursiveSetColumnAttr = (
    columns: Columns,
    field: string,
    attr: string,
    value: string | number
  ) => {
    columns.forEach(col => {
      if (col.field === field) {
        col[attr] = value;
      }
      if (col.children) {
        recursiveSetColumnAttr(col.children, field, attr, value);
      }
    });
  };

  /**
   * 严格基于 field 匹配的列配置洗涤函数（支持多级表头 children 递归）
   * @param remoteColumns 后端保存的用户喜好配置
   * @param localColumns 前端最新代码里的 columns 定义
   */
  function washColumnsByField(
    remoteColumns: Columns,
    localColumns: Columns
  ): Columns {
    // 如果后端没有配置，直接返回本地最新配置
    if (!remoteColumns || remoteColumns.length === 0) return localColumns;

    // 1. 将本地最新列转化为 Map，以 field 为 key，方便快速 O(1) 查找
    const localMap = new Map(localColumns.map(col => [col.field, col]));
    const mergedColumns: Columns = [];

    // 2. 按照后端保存的【顺序】进行遍历映射
    remoteColumns.forEach(remoteCol => {
      if (!remoteCol.field) return;

      // 检查这个 field 在最新代码里还存不存在
      const localCol = localMap.get(remoteCol.field);

      if (localCol) {
        // 基础合并对象：继承本地最新的一切，覆盖显隐和宽度
        const mergedCol: any = {
          ...localCol,
          visible: remoteCol.visible,
          width: remoteCol.width
        };

        // 【核心修复：递归处理子级】
        if (localCol.children && localCol.children.length > 0) {
          // 拿后端的子级喜好和本地的最新的子级结构，丢给自身递归洗涤
          mergedCol.children = washColumnsByField(
            remoteCol.children || [],
            localCol.children
          );
        } else {
          // 如果本地代码把原有的 children 删除了，则确保清空该属性
          delete mergedCol.children;
        }

        mergedColumns.push(mergedCol);

        // 从 Map 中移除已经匹配上的列，剩下的就是“新列”
        localMap.delete(remoteCol.field);
      }
    });

    // 3. 【新列处理】把本地代码里新加的、后端没记录过的列，直接追加到表格末尾
    localMap.forEach(newLocalCol => {
      mergedColumns.push(newLocalCol);
    });

    return mergedColumns;
  }

  return {
    renderColumns,
    getColumns,
    handleColumnsChange,
    handleColumnDragEnd,
    handleColumnResizableChange
  };
}
