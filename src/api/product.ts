import { http } from "@/utils/http";
import type { Timestamped } from "./types/common";
import type { Brand } from "./brand";

/** 商品状态：0=下架 1=上架 */
export type ProductStatus = 0 | 1;

/** 规格值是否需要上传图片：0=否 1=是 */
export type SpecImageRequired = 0 | 1;

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
  /** 状态：0=下架 1=上架 */
  status: ProductStatus;
  /** 排序值，越小越靠前 */
  sort: number;
  /** 品牌信息 */
  brand?: Brand | null;
} & Timestamped;

/** 规格值提交结构 */
export type ProductSpecValuePayload = {
  /** 记录ID：新增时为前端生成的临时ID（后端写库用自增主键，仅用它做关联），编辑时为后端返回的记录ID */
  id: number;
  /** 规格值，如：雅川青 */
  value: string;
  /** 规格值图片（需要图片的规格项必填） */
  image_url: string;
  /** 排序值 */
  sort: number;
};

/** 规格项提交结构 */
export type ProductSpecPayload = {
  /** 记录ID：新增时为前端生成的临时ID，编辑时为后端返回的记录ID */
  id: number;
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
  /** 记录ID：新增时为前端生成的临时ID，编辑时为后端返回的记录ID */
  id: number;
  /** SKU编码 */
  sku_code: string;
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
  /** 关联的规格值ID列表 */
  spec_value_ids: number[];
};

/** SPU 提交结构 */
export type ProductSpuPayload = {
  /** 商品编码 */
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
  /** 状态：0=下架 1=上架 */
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
  /** 默认SKU的ID */
  default_sku_id: number;
};

/** 商品详情（编辑时回显） */
export type ProductDetail = {
  id: number;
  spu: ProductSpuPayload & { id?: number };
  /** 商品分类ID列表 */
  category_ids: number[];
  /** 商品详情 */
  detail: {
    detail_html: string;
    mobile_detail_html: string;
  };
  /** 规格项与规格值 */
  specs: ProductSpecPayload[];
  /** SKU列表 */
  skus: ProductSkuPayload[];
  /** 默认SKU的ID */
  default_sku_id: number;
};

/** 获取商品详情 */
export const getProductDetail = (id: number) => {
  return http.request<ApiResponse<ProductDetail>>(
    "get",
    `/v1/product-list/${id}`
  );
};

/** 获取商品列表（分页） */
export const getProducts = (params: {
  page?: number;
  limit?: number;
  keyword?: string;
}) => {
  return http.request<PageData<Product[]>>("get", "/v1/product-list", {
    params
  });
};

/** 添加商品 */
export const createProduct = (data: ProductSavePayload) => {
  return http.request<ApiResponse<[]>>("post", "/v1/product-list", { data });
};

/** 更新商品 */
export const updateProduct = (id: number, data: ProductSavePayload) => {
  return http.request<ApiResponse<[]>>("put", `/v1/product-list/${id}`, {
    data
  });
};

/** 批量更新商品状态（上架/下架） */
export const updateProductStatus = (ids: string, status: ProductStatus) => {
  return http.request<ApiResponse<[]>>("put", "/v1/product-list/status", {
    data: { ids, status }
  });
};

/** 删除商品（传入数组时按逗号分隔批量删除） */
export const deleteProduct = (ids: number | string) => {
  return http.request<ApiResponse<[]>>("delete", `/v1/product-list/${ids}`);
};
