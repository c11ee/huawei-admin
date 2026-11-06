import { computed, ref } from "vue";
import type { SkuDraft, SpecItemDraft, SpecValueDraft } from "../types";

/** 本地唯一ID生成器：用时间戳递增，避免与后端自增主键（新增时不生效）冲突 */
const uidBase = Date.now();
let uidSeed = uidBase;
export const nextUid = () => ++uidSeed;

/** 前端生成的临时ID远大于后端自增主键，据此判断记录是否已落库（未落库的ID不提交给后端） */
export const isServerId = (id: number) => id < uidBase;

export const createSpecValue = (
  value = "",
  image_url = ""
): SpecValueDraft => ({
  id: nextUid(),
  value,
  image_url
});

export const createSpecItem = (withValue = true): SpecItemDraft => ({
  id: nextUid(),
  name: "",
  is_image_required: 0,
  values: withValue ? [createSpecValue()] : []
});

interface UseSpecSkuOptions {
  /** 商品名称，用于自动生成 SKU 名称 */
  getProductName: () => string;
}

/**
 * 规格项 / 规格值 / SKU 的领域逻辑：
 * 规格组合生成 SKU、SKU 名称的自动生成、规格值文案映射
 */
export function useSpecSku({ getProductName }: UseSpecSkuOptions) {
  const specList = ref<SpecItemDraft[]>([createSpecItem()]);
  const skus = ref<SkuDraft[]>([]);
  const defaultSkuId = ref<number>();

  /** 规格值ID -> 规格值文案（用于 SKU 规格展示、自动命名与提交组装） */
  const valueMetaMap = computed(() => {
    const map = new Map<number, string>();
    specList.value.forEach(item => {
      item.values.forEach(value => map.set(value.id, value.value.trim()));
    });
    return map;
  });

  /** SKU 对应的规格文案，如：雅川青 / 256GB */
  const specTextOf = (specValueIds: number[]) =>
    specValueIds
      .map(id => valueMetaMap.value.get(id) ?? "")
      .filter(Boolean)
      .join(" / ");

  /** 自动生成的 SKU 名称 */
  const autoSkuName = (specValueIds: number[]) =>
    [
      getProductName().trim(),
      ...specValueIds.map(id => valueMetaMap.value.get(id) ?? "")
    ]
      .filter(Boolean)
      .join(" ");

  /** 刷新仍处于自动生成状态的 SKU 名称 */
  const refreshAutoSkus = () => {
    skus.value.forEach(sku => {
      if (sku.auto_name) sku.name = autoSkuName(sku.spec_value_ids);
    });
  };

  /** 按商品名称 + 规格值强制重算全部 SKU 名称（含手动改过名的） */
  const resetSkuNames = () => {
    skus.value.forEach(sku => {
      sku.name = autoSkuName(sku.spec_value_ids);
      sku.auto_name = true;
    });
  };

  /** 按规格值做笛卡尔积，重新生成 SKU 列表（保留已填写的同组合数据） */
  const regenerate = () => {
    // 只把已填写文案的规格值纳入组合：刚添加、还没填值的规格项/规格值不参与，
    // 避免编辑时因新增空行导致整张 SKU 表重建、原有价格丢失
    const items = specList.value
      .map(item => ({
        ...item,
        values: item.values.filter(value => value.value.trim())
      }))
      .filter(item => item.values.length);

    // 当前没有可组合的规格值时，保持已有 SKU 不变（保存前的校验会提示补全规格值）
    if (!items.length) return;

    const combos = items.reduce<SpecValueDraft[][]>(
      (acc, item) =>
        acc.length
          ? acc.flatMap(combo => item.values.map(v => [...combo, v]))
          : item.values.map(v => [v]),
      []
    );

    const keyOf = (valueIds: number[]) =>
      [...valueIds].sort((a, b) => a - b).join("|");

    const previous = skus.value;
    const exactMap = new Map(
      previous.map(sku => [keyOf(sku.spec_value_ids), sku])
    );

    /** 本次已沿用 ID 的旧 SKU：一个旧 SKU 最多只能被一个组合沿用，避免提交重复ID */
    const usedPrevIds = new Set<number>();

    // 先给组合完全一致的 SKU 占位，避免被后面的子集匹配抢占
    const exactPrevMap = new Map<number, SkuDraft>();
    combos.forEach((values, index) => {
      const exact = exactMap.get(keyOf(values.map(value => value.id)));
      if (!exact || usedPrevIds.has(exact.id)) return;
      usedPrevIds.add(exact.id);
      exactPrevMap.set(index, exact);
    });

    /**
     * 查找可复用数据的旧 SKU：
     * 1. 规格组合完全一致时直接沿用原 SKU；
     * 2. 只新增了一个规格值（如编辑时新增规格项后填了第一个值）时，旧 SKU 只是多挂一条
     *    sku_spec，沿用原 ID，避免保存时整批 SKU 变成新增；
     * 3. 其余新增组合只复用「旧组合是新组合子集」的价格等数据，ID 按新增处理
     *    （保存时为 undefined），避免每加一个规格项就要把所有价格重填一遍。
     */
    const findPrevious = (valueIds: number[]) => {
      const idSet = new Set(valueIds);
      const candidates = previous.filter(sku => {
        const oldIds = sku.spec_value_ids;
        return (
          oldIds.length > 0 &&
          oldIds.length < valueIds.length &&
          oldIds.every(id => idSet.has(id))
        );
      });
      if (!candidates.length) return { sku: undefined, reuseId: false };

      const reusable = candidates.find(
        sku =>
          sku.spec_value_ids.length === valueIds.length - 1 &&
          !usedPrevIds.has(sku.id)
      );
      if (reusable) {
        usedPrevIds.add(reusable.id);
        return { sku: reusable, reuseId: true };
      }

      const matched = candidates.reduce((longest, sku) =>
        sku.spec_value_ids.length > longest.spec_value_ids.length
          ? sku
          : longest
      );
      return { sku: matched, reuseId: false };
    };

    skus.value = combos.map((values, index) => {
      const valueIds = values.map(v => v.id);
      const exact = exactPrevMap.get(index);
      const { sku: prev, reuseId } = exact
        ? { sku: exact, reuseId: true }
        : findPrevious(valueIds);
      return {
        // 组合完全一致或只多挂一个规格值时沿用原 SKU；其余组合视为新 SKU
        id: prev && reuseId ? prev.id : nextUid(),
        name: reuseId ? (prev?.name ?? "") : "",
        image_url: prev?.image_url ?? "",
        sale_price: prev?.sale_price ?? 0,
        cost_price: prev?.cost_price ?? 0,
        strike_price: prev?.strike_price ?? 0,
        stock: prev?.stock ?? 0,
        weight: prev?.weight ?? 0,
        volume: prev?.volume ?? 0,
        status: prev?.status ?? 1,
        spec_value_ids: valueIds,
        // 沿用的 SKU 保持原有命名状态；新增组合的名称按最新规格值重新生成
        auto_name: reuseId ? (prev?.auto_name ?? true) : true
      };
    });

    refreshAutoSkus();

    if (!skus.value.some(sku => sku.id === defaultSkuId.value)) {
      defaultSkuId.value = skus.value[0]?.id;
    }
  };

  return {
    specList,
    skus,
    defaultSkuId,
    valueMetaMap,
    specTextOf,
    autoSkuName,
    refreshAutoSkus,
    resetSkuNames,
    regenerate
  };
}
