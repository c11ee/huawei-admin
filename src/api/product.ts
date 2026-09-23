import { http } from "@/utils/http";
import type { Timestamped } from "./types/common";
import type { Brand } from "./brand";
import type { Category } from "./category";
import type { Operator } from "./types/user";

/** 商品状态：0=草稿 1=上架 2=下架 */
export type ProductStatus = 0 | 1 | 2;

/** 规格值是否需要上传图片：0=否 1=是 */
export type SpecImageRequired = 0 | 1;

/** 通用是否标记：0=否 1=是 */
export type YesNoFlag = 0 | 1;

/** 商品（SPU）列表数据结构 */
export type Product = {
  id: number;
  /** 商品编码（SPU编码） */
  spu_code: string;
  /** 商品名称 */
  product_name: string;
  /** 商品描述 */
  product_description: string;
  /** 品牌ID */
  brand_id: number;
  /** 规格模板ID */
  spec_template_id: number | null;
  /** 轮播图 */
  slider_images: string[];
  /** 商品视频 */
  video_url: string;
  /** 视频封面 */
  video_cover_url: string;
  /** 状态：0=草稿 1=上架 2=下架 */
  status: ProductStatus;
  /** 排序值，越小越靠前 */
  sort: number;
  /** 品牌信息 */
  brand?: Brand | null;
  /** 默认SKU的ID */
  default_sku_id?: number | null;
  /** 默认SKU的售价 */
  default_sku_sale_price?: string;
  /** 默认SKU的库存 */
  default_sku_stock?: number;
  /** 默认SKU的图片 */
  default_sku_image_url?: string;
  /** 全部SKU中的最低售价 */
  min_sale_price?: string;
  /** 全部SKU中的最高售价 */
  max_sale_price?: string;
  /** 全部SKU的总库存 */
  total_stock?: number;
  /** 关联的分类 */
  categories?: Category[];
  /** 创建人信息 */
  creator?: Operator | null;
  /** 更新人信息 */
  updater?: Operator | null;
} & Timestamped;

/** 规格值提交结构 */
export type ProductSpecValuePayload = {
  /** 记录ID：编辑已有规格值时传后端记录ID，新增的规格值不传 */
  id?: number;
  /** 规格值，如：雅川青 */
  value: string;
  /** 规格值图片（需要图片的规格项必填） */
  image_url: string;
  /** 排序值 */
  sort: number;
};

/** 规格项提交结构 */
export type ProductSpecPayload = {
  /** 记录ID：编辑已有规格项时传后端记录ID，新增的规格项不传 */
  id?: number;
  /** 规格项名称，如：颜色 */
  name: string;
  /** 规格值是否必须上传图片：0=否 1=是 */
  is_image_required: SpecImageRequired;
  /** 排序值 */
  sort: number;
  /** 规格值列表 */
  values: ProductSpecValuePayload[];
};

/** SKU 提交结构 */
export type ProductSkuPayload = {
  /** 记录ID：编辑已有 SKU 时传后端记录ID，新增的 SKU 不传 */
  id?: number;
  /** 是否默认SKU：0=否 1=是 */
  is_default: YesNoFlag;
  /** SKU名称 */
  name: string;
  /** SKU图片 */
  image_url: string;
  /** 销售价 */
  sale_price: number;
  /** 成本价 */
  cost_price: number;
  /** 划线价 */
  strike_price: number;
  /** 库存 */
  stock: number;
  /** 重量（kg） */
  weight: number;
  /** 体积（m³） */
  volume: number;
  /** 状态：0=禁用 1=启用 */
  status: ProductStatus;
  /** 排序值 */
  sort: number;
  /** 规格组合：{ 规格项名称: 规格值 }，如 { "颜色": "星云灰" } */
  spec_values: Record<string, string>;
};

/** SKU 详情结构（编辑回显） */
export type ProductSkuDetail = {
  /** 记录ID */
  id: number;
  /** SKU编码 */
  sku_code: string;
  /** SKU名称 */
  name: string;
  /** 是否默认SKU：0=否 1=是 */
  is_default: YesNoFlag;
  /** SKU图片 */
  image_url: string;
  /** 销售价 */
  sale_price: string;
  /** 成本价 */
  cost_price: string;
  /** 划线价 */
  strike_price: string;
  /** 库存 */
  stock: number;
  /** 重量（kg） */
  weight: string;
  /** 体积（m³） */
  volume: string;
  /** 状态：0=禁用 1=启用 */
  status: ProductStatus;
  /** 排序值 */
  sort: number;
  /** 规格组合：{ 规格项名称: 规格值 }，如 { "颜色": "星云灰" } */
  spec_json: Record<string, string>;
};

/** SPU 提交结构 */
export type ProductSpuPayload = {
  /** 记录ID：编辑时传 SPU 主键ID，新增时不传 */
  id?: number;
  /** 商品名称 */
  product_name: string;
  /** 商品描述 */
  product_description: string;
  /** 品牌ID */
  brand_id: number;
  /** 规格模板ID */
  spec_template_id: number | null;
  /** 轮播图 */
  slider_images: string[];
  /** 商品视频 */
  video_url: string;
  /** 视频封面 */
  video_cover_url: string;
  /** 状态：0=草稿 1=上架 2=下架 */
  status: ProductStatus;
  /** 排序值 */
  sort: number;
};

/** 商品新增/编辑提交结构 */
export type ProductSavePayload = {
  spu: ProductSpuPayload;
  /** 商品分类ID列表 */
  category_ids: number[];
  /** 商品详情 */
  detail: {
    /** PC端详情 */
    detail_html: string;
    /** 移动端详情 */
    mobile_detail_html: string;
  };
  /** 规格项与规格值 */
  specs: ProductSpecPayload[];
  /** SKU列表 */
  skus: ProductSkuPayload[];
};

/** 商品详情（编辑时回显）：SPU 字段与列表结构一致，平铺在顶层 */
export type ProductDetail = Product & {
  /** 商品详情 */
  detail: {
    /** PC端详情 */
    detail_html: string;
    /** 移动端详情 */
    mobile_detail_html: string;
  };
  /** 规格项与规格值 */
  specs: ProductSpecPayload[];
  /** SKU列表 */
  skus: ProductSkuDetail[];
};

/** 商品列表各状态的数量统计 */
export type ProductListCounts = {
  /** 草稿数量 */
  draft: number;
  /** 上架数量 */
  on_sale: number;
  /** 下架数量 */
  off_sale: number;
  /** 回收站数量 */
  trashed: number;
};

/** 获取商品详情 */
export const getProductDetail = (id: number) => {
  return http.request<ApiResponse<ProductDetail>>("get", `/v1/product/${id}`);
};

/** 获取商品列表（分页） */
export const getProducts = (params: {
  page?: number;
  limit?: number;
  keyword?: string;
  /** 状态筛选：0=草稿 1=上架 2=下架，不传表示全部 */
  status?: ProductStatus;
  /** 是否查看回收站商品：0=否 1=是 */
  show_trashed?: YesNoFlag;
}) => {
  return http.request<PageData<Product[]> & { counts: ProductListCounts }>(
    "get",
    "/v1/product",
    { params }
  );
};

/** 添加商品 */
export const createProduct = (data: ProductSavePayload) => {
  return http.request<ApiResponse<[]>>("post", "/v1/product", { data });
};

/** 更新商品 */
export const updateProduct = (id: number, data: ProductSavePayload) => {
  return http.request<ApiResponse<[]>>("put", `/v1/product/${id}`, {
    data
  });
};

/** 批量更新商品状态（上架/下架） */
export const updateProductStatus = (ids: string, status: ProductStatus) => {
  return http.request<ApiResponse<[]>>("put", "/v1/product/status", {
    data: { ids, status }
  });
};

/**
 * 删除商品（传入数组时按逗号分隔批量删除）
 * @param force_delete 是否彻底删除：0=否（移入回收站） 1=是（回收站内使用）
 */
export const deleteProduct = (
  ids: number | string,
  force_delete: YesNoFlag = 0
) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/product/${ids}`, {
    params: { force_delete }
  });
};

/** 恢复商品（回收站，传入数组时按逗号分隔批量恢复） */
export const restoreProduct = (ids: string) => {
  return http.request<ApiResponse<[]>>("put", "/v1/product/restore", {
    data: { ids }
  });
};
