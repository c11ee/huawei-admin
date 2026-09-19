import type { ProductStatus, SpecImageRequired } from "@/api/product";

/** 规格值草稿 */
export interface SpecValueDraft {
  /** 记录ID：新增（含编辑时新增的行）为前端生成的临时ID，编辑回填为后端记录ID */
  id: number;
  value: string;
  image_url: string;
}

/** 规格项草稿 */
export interface SpecItemDraft {
  /** 记录ID：新增（含编辑时新增的行）为前端生成的临时ID，编辑回填为后端记录ID */
  id: number;
  name: string;
  is_image_required: SpecImageRequired;
  values: SpecValueDraft[];
}

/** SKU 草稿 */
export interface SkuDraft {
  /** 记录ID：新增（含编辑时新增的行）为前端生成的临时ID，编辑回填为后端记录ID */
  id: number;
  sku_code: string;
  name: string;
  image_url: string;
  sale_price?: number;
  cost_price?: number;
  strike_price?: number;
  stock?: number;
  weight?: number;
  volume?: number;
  status: ProductStatus;
  spec_value_ids: number[];
  /** 名称是否仍由系统自动生成（用户手动修改后不再覆盖） */
  auto_name: boolean;
  /** 编码是否仍由系统自动生成（用户手动修改后不再覆盖） */
  auto_code: boolean;
}

/** SKU 表格首行的批量设置行 */
export interface SkuBatchRow {
  __batch: true;
  sale_price?: number;
  cost_price?: number;
  strike_price?: number;
  stock?: number;
  weight?: number;
  volume?: number;
  status: ProductStatus;
}

export type SkuTableRow = SkuDraft | SkuBatchRow;

/** el-table 插槽中 row 的宽松类型 */
export type TableAnyRow = Record<string, any>;

/** 批量设置行支持的数值字段 */
export type BatchNumberField =
  | "sale_price"
  | "cost_price"
  | "strike_price"
  | "stock"
  | "weight"
  | "volume";
