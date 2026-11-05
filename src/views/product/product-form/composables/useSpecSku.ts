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

    /**
     * 查找可复用数据的旧 SKU：
     * 1. 规格组合完全一致时直接复用；
     * 2. 新增规格项后组合变多，此时复用「旧组合是新组合子集」的 SKU 的价格等数据，
     *    避免每加一个规格项就要把所有价格重填一遍。
     */
    const findPrevious = (valueIds: number[]) => {
      const exact = exactMap.get(keyOf(valueIds));
      if (exact) return { sku: exact, exact: true };

      const idSet = new Set(valueIds);
      let matched: SkuDraft | undefined;
      previous.forEach(sku => {
        const oldIds = sku.spec_value_ids;
        if (!oldIds.length || oldIds.length >= valueIds.length) return;
        if (!oldIds.every(id => idSet.has(id))) return;
        if (!matched || oldIds.length > matched.spec_value_ids.length) {
          matched = sku;
        }
      });
      return { sku: matched, exact: false };
    };

    skus.value = combos.map(values => {
      const valueIds = values.map(v => v.id);
      const { sku: prev, exact } = findPrevious(valueIds);
      return {
        // 组合完全一致的沿用原 SKU；新增组合视为新 SKU
        id: exact && prev ? prev.id : nextUid(),
        name: exact ? prev?.name ?? "" : "",
        image_url: prev?.image_url ?? "",
        sale_price: prev?.sale_price ?? 0,
        cost_price: prev?.cost_price ?? 0,
        strike_price: prev?.strike_price ?? 0,
        stock: prev?.stock ?? 0,
        weight: prev?.weight ?? 0,
        volume: prev?.volume ?? 0,
        status: prev?.status ?? 1,
        spec_value_ids: valueIds,
        // 新增组合的名称按最新规格值重新生成
        auto_name: exact ? prev?.auto_name ?? true : true
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
    regenerate
  };
}
