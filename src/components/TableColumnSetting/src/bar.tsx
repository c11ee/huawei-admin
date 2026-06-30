import Sortable from "sortablejs";
import {
  type PropType,
  ref,
  unref,
  nextTick,
  defineComponent,
  getCurrentInstance,
  watch
} from "vue";
import { cloneDeep, getKeyList } from "@pureadmin/utils";

import DragIcon from "@/assets/table-bar/drag.svg?component";
import SettingIcon from "@/assets/table-bar/settings.svg?component";

const props = {
  /** 需要展示的列 */
  columns: {
    type: Array as PropType<Column[]>,
    default: () => []
  },
  defaultColumns: {
    type: Array as PropType<Column[]>,
    default: () => []
  },
  tableKey: {
    type: [String, Number] as PropType<string | number>,
    default: "0"
  }
};

export default defineComponent({
  name: "TableColumnSetting",
  props,
  emits: ["columns-change"],
  setup(props, { emit }) {
    const checkAll = ref(true);
    const isIndeterminate = ref(false);
    const instance = getCurrentInstance()!;

    // 内部维护的响应式列数据
    const dynamicColumns = ref<Column[]>(cloneDeep(props?.columns));

    // 所有列的 title 集合（用于控制全选）
    let checkColumnList: Column[] = cloneDeep(props?.columns);

    // 当前勾选（显示）的列 title 集合
    const checkedColumns = ref(
      getKeyList(
        cloneDeep(props?.columns).filter(c => c.visible),
        "title"
      )
    );

    // 监听外部 columns 变化，同步内部状态
    watch(
      () => props.columns,
      newVal => {
        const copiedValue = cloneDeep(newVal);
        dynamicColumns.value = copiedValue;
        checkColumnList = copiedValue;
        checkedColumns.value = getKeyList(
          copiedValue.filter(c => c.visible),
          "title"
        );
        updateCheckAllState();
      },
      { deep: true }
    );

    // 更新全选框的半选/全选状态
    function updateCheckAllState() {
      const checkedCount = checkedColumns.value.length;
      checkAll.value = checkedCount === checkColumnList.length;
      isIndeterminate.value =
        checkedCount > 0 && checkedCount < checkColumnList.length;
    }

    // 触发事件通知父组件
    function emitColumnsChange() {
      emit("columns-change", cloneDeep(dynamicColumns.value));
    }

    // 顶级全选/全不选 切换
    function handleCheckAllChange(val: boolean) {
      // 全不选时，checkedColumns 仍需保留 noSetColumn 的列
      const noSetColumnTitles = getKeyList(
        checkColumnList.filter(c => c.params?.noSetColumn),
        "title"
      );
      checkedColumns.value = val
        ? getKeyList(checkColumnList, "title")
        : noSetColumnTitles;
      isIndeterminate.value = false;
      dynamicColumns.value.forEach(column => {
        if (!column.params?.noSetColumn) {
          column.visible = val;
        }
        return;
      });
      emitColumnsChange();
    }

    // 单个多选框 切换
    function handleCheckedColumnsChange(value: string[]) {
      // 保证 noSetColumn 的列始终处于勾选状态
      const noSetColumnTitles = getKeyList(
        checkColumnList.filter(c => c.params?.noSetColumn),
        "title"
      );
      checkedColumns.value = [...new Set([...value, ...noSetColumnTitles])];
      updateCheckAllState();
    }

    // 联动修改对应列的 visible 属性
    function handleCheckColumnListChange(val: boolean, title: string) {
      const target = dynamicColumns.value.find(item => item.title === title);
      if (target && !target.params?.noSetColumn) {
        target.visible = val;
        emitColumnsChange();
      }
    }

    // 重置按钮
    async function onReset() {
      checkAll.value = true;
      isIndeterminate.value = false;
      const copiedValue = cloneDeep(props.defaultColumns);
      dynamicColumns.value = copiedValue;
      checkColumnList = copiedValue;
      checkedColumns.value = getKeyList(
        copiedValue.filter(c => c.visible),
        "title"
      );
      emitColumnsChange();
    }

    // 列展示拖拽排序
    const rowDrop = (event: { preventDefault: () => void }) => {
      event.preventDefault();
      nextTick(() => {
        const wrapper: HTMLElement = (
          instance?.proxy?.$refs[`GroupRef${unref(props.tableKey)}`] as any
        ).$el.firstElementChild;

        Sortable.create(wrapper, {
          animation: 300,
          handle: ".drag-btn",
          onMove(evt) {
            const related = evt.related;

            // 拖到不可拖拽元素上，禁止
            if (related?.classList.contains("no-drag")) {
              return false;
            }

            return true;
          },
          onEnd: ({ newIndex, oldIndex, item }) => {
            const targetThElem = item;
            const wrapperElem = targetThElem.parentNode as HTMLElement;
            const oldColumn = dynamicColumns.value[oldIndex];
            const newColumn = dynamicColumns.value[newIndex];

            // 当前列或目标列存在 fixed 属性，不可拖拽交换
            if (
              oldColumn?.params?.noSetColumn ||
              newColumn?.params?.noSetColumn
            ) {
              const oldThElem = wrapperElem.children[oldIndex] as HTMLElement;
              if (newIndex > oldIndex) {
                wrapperElem.insertBefore(targetThElem, oldThElem);
              } else {
                wrapperElem.insertBefore(
                  targetThElem,
                  oldThElem ? oldThElem.nextElementSibling : oldThElem
                );
              }
              return;
            }

            // 执行实际的数据位置交换
            const currentRow = dynamicColumns.value.splice(oldIndex, 1)[0];
            dynamicColumns.value.splice(newIndex, 0, currentRow);
            emitColumnsChange();
          }
        });
      });
    };

    const rendTippyProps = (content: string) => {
      return {
        content,
        offset: [0, 18],
        duration: [300, 0],
        followCursor: true,
        hideOnClick: "toggle"
      };
    };

    // 弹出框触发器
    const reference = {
      reference: () => (
        <SettingIcon
          class={[
            "w-[16px]",
            "h-[16px]",
            "text-black",
            "dark:text-white",
            "duration-100",
            "hover:text-primary!",
            "cursor-pointer",
            "outline-hidden"
          ]}
          v-tippy={rendTippyProps("列设置")}
        />
      )
    };

    return () => (
      <el-popover
        v-slots={reference}
        placement="bottom-start"
        popper-style={{ padding: 0 }}
        width="200"
        trigger="click"
      >
        {/* Popover 头部：全选与重置 */}
        <div class="flex justify-between pt-[3px] px-[11px] border-0 border-b border-solid border-[#dcdfe6] dark:border-[#303030]">
          <el-checkbox
            class="-mr-1!"
            label="列展示"
            v-model={checkAll.value}
            indeterminate={isIndeterminate.value}
            onChange={value => handleCheckAllChange(value)}
          />
          <el-button type="primary" link onClick={() => onReset()}>
            重置
          </el-button>
        </div>

        {/* Popover 内容：列项拖拽与勾选 */}
        <div class="pt-[6px] pl-[10px]">
          <el-scrollbar max-height="36vh">
            <el-checkbox-group
              ref={`GroupRef${unref(props.tableKey)}`}
              modelValue={checkedColumns.value}
              onChange={value => handleCheckedColumnsChange(value)}
            >
              <div class="flex flex-col items-start gap-y-0">
                {checkColumnList.map((item, index) => {
                  return (
                    <div
                      class={[
                        "flex items-center",
                        item.params?.noSetColumn ? "no-drag" : ""
                      ]}
                      key={index}
                    >
                      <DragIcon
                        class={[
                          "drag-btn w-[16px] mr-2",
                          item.params?.noSetColumn
                            ? "cursor-no-drop! opacity-70"
                            : "cursor-grab!"
                        ]}
                        onMouseenter={(event: {
                          preventDefault: () => void;
                        }) => {
                          if (item.params?.noSetColumn) return;
                          rowDrop(event);
                        }}
                      />
                      <el-checkbox
                        label={item.title}
                        value={item.title}
                        disabled={item.params?.noSetColumn}
                        onChange={value =>
                          handleCheckColumnListChange(
                            value,
                            item.title as string
                          )
                        }
                      >
                        <span
                          title={item.title}
                          class="inline-block w-[120px] truncate hover:text-text_color_primary"
                        >
                          {item.title}
                        </span>
                      </el-checkbox>
                    </div>
                  );
                })}
              </div>
            </el-checkbox-group>
          </el-scrollbar>
        </div>
      </el-popover>
    );
  }
});
