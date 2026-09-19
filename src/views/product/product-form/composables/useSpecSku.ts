import { computed, ref } from "vue";
import type { SkuDraft, SpecItemDraft, SpecValueDraft } from "../types";

/** 本地唯一ID生成器：用时间戳递增，避免与后端自增主键（新增时不生效）冲突 */
let uidSeed = Date.now();
export const nextUid = () => ++uidSeed;

export const createSpecValue = (
  value = "",
  image_url = ""
): SpecValueDraft => ({
  id: nextUid(),
  value,
  image_url
});

export const createSpecItem = (): SpecItemDraft => ({
  id: nextUid(),
  name: "",
  is_image_required: 0,
  values: [createSpecValue()]
});

interface UseSpecSkuOptions {
  /** 商品名称，用于自动生成 SKU 名称 */
  getProductName: () => string;
  /** 商品编码，用于自动生成 SKU 编码 */
  getSpuCode: () => string;
}

/**
 * 规格项 / 规格值 / SKU 的领域逻辑：
 * 规格组合生成 SKU、SKU 名称与编码的自动生成、规格值文案映射
 */
export function useSpecSku({ getProductName, getSpuCode }: UseSpecSkuOptions) {
  const specList = ref<SpecItemDraft[]>([createSpecItem()]);
  const skus = ref<SkuDraft[]>([]);
  const defaultSkuId = ref<number>();

  /** 规格值ID与规格值文案的映射（用于 SKU 规格展示与自动命名） */
  const valueLabelMap = computed(() => {
    const map = new Map<number, string>();
    specList.value.forEach(item => {
      item.values.forEach(value => map.set(value.id, value.value.trim()));
    });
    return map;
  });

  /** SKU 对应的规格文案，如：雅川青 / 256GB */
  const specTextOf = (specValueIds: number[]) =>
    specValueIds
      .map(id => valueLabelMap.value.get(id) ?? "")
      .filter(Boolean)
      .join(" / ");

  /** 自动生成的 SKU 名称 */
  const autoSkuName = (specValueIds: number[]) =>
    [
      getProductName().trim(),
      ...specValueIds.map(id => valueLabelMap.value.get(id) ?? "")
    ]
      .filter(Boolean)
      .join(" ");

  /** 自动生成的 SKU 编码 */
  const autoSkuCode = (index: number) => {
    const prefix = getSpuCode().trim();
    const seq = String(index + 1).padStart(3, "0");
    return prefix ? `${prefix}-${seq}` : seq;
  };

  /** 刷新仍处于自动生成状态的 SKU 名称与编码 */
  const refreshAutoSkus = () => {
    skus.value.forEach((sku, index) => {
      if (sku.auto_name) sku.name = autoSkuName(sku.spec_value_ids);
      if (sku.auto_code) sku.sku_code = autoSkuCode(index);
    });
  };

  /** 按规格值做笛卡尔积，重新生成 SKU 列表（保留已填写的同组合数据） */
  const regenerate = () => {
    const items = specList.value;
    if (!items.length || items.some(item => !item.values.length)) {
      skus.value = [];
      defaultSkuId.value = undefined;
      return;
    }

    const combos = items.reduce<SpecValueDraft[][]>(
      (acc, item) =>
        acc.length
          ? acc.flatMap(combo => item.values.map(v => [...combo, v]))
          : item.values.map(v => [v]),
      []
    );

    const previous = new Map<string, SkuDraft>();
    skus.value.forEach(sku =>
      previous.set([...sku.spec_value_ids].sort().join("|"), sku)
    );

    skus.value = combos.map(values => {
      const valueIds = values.map(v => v.id);
      const prev = previous.get([...valueIds].sort().join("|"));
      return {
        id: prev?.id ?? nextUid(),
        sku_code: prev?.sku_code ?? "",
        name: prev?.name ?? "",
        image_url: prev?.image_url ?? "",
        sale_price: prev?.sale_price ?? 0,
        cost_price: prev?.cost_price ?? 0,
        strike_price: prev?.strike_price ?? 0,
        stock: prev?.stock ?? 0,
        weight: prev?.weight ?? 0,
        volume: prev?.volume ?? 0,
        status: prev?.status ?? 1,
        spec_value_ids: valueIds,
        auto_name: prev?.auto_name ?? true,
        auto_code: prev?.auto_code ?? true
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
    valueLabelMap,
    specTextOf,
    autoSkuName,
    autoSkuCode,
    refreshAutoSkus,
    regenerate
  };
}
