import { computed, type Ref, ref } from "vue";
import type { AttachmentNode } from "@/api/types/attachment";
import Selecto from "selecto";

export const useSelection = ({
  allFileList
}: {
  allFileList: Ref<AttachmentNode[]>;
}) => {
  const container = ref<HTMLDivElement>();
  const selecto = ref<Selecto>();

  const selectedMaps = ref<Record<string, boolean>>({});

  const selectedCount = computed(() =>
    Object.values(selectedMaps.value).filter(Boolean).length
  );

  const isAllSelected = computed(
    () =>
      selectedCount.value === allFileList.value.length &&
      selectedCount.value !== 0
  );

  const clearSelectedMaps = () => {
    selectedMaps.value = {};
  };

  /** 将选中的 ID 按类型分组 */
  const getGroupedSelectedIds = () => {
    const folder: number[] = [];
    const file: number[] = [];
    Object.entries(selectedMaps.value).forEach(([key, selected]) => {
      if (!selected) return;
      if (key.startsWith("folder")) {
        folder.push(Number(key.slice(6)));
      } else if (key.startsWith("file")) {
        file.push(Number(key.slice(4)));
      }
    });
    return { folder, file };
  };

  const handleSelectAll = () => {
    if (isAllSelected.value) {
      selectedMaps.value = {};
    } else {
      selectedMaps.value = allFileList.value.reduce(
        (prev, cur) => ({ ...prev, [cur.type + cur.id]: true }),
        {}
      );
    }
  };

  const handleSelect = (e: any) => {
    e.added.forEach((el: HTMLElement) => {
      selectedMaps.value[el.dataset.type! + Number(el.dataset.id)] = true;
    });
    e.removed.forEach((el: HTMLElement) => {
      selectedMaps.value[el.dataset.type! + Number(el.dataset.id)] = false;
    });
  };

  const initSelecto = () => {
    selecto.value = new Selecto({
      container: container.value,
      dragContainer: container.value,
      selectableTargets: [".file-item"],
      selectByClick: false,
      selectFromInside: true,
      toggleContinueSelect: "shift",
      boundContainer: true,
      checkOverflow: false,
      hitRate: 0,
      continueSelect: true
    });
    selecto.value.on("select", handleSelect);
  };

  return {
    container,
    selecto,
    selectedMaps,
    selectedCount,
    isAllSelected,
    clearSelectedMaps,
    getGroupedSelectedIds,
    handleSelectAll,
    initSelecto
  };
};
