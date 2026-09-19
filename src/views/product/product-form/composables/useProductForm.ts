import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch
} from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, type FormInstance, type FormRules } from "element-plus";
import { getBrands, type Brand } from "@/api/brand";
import { getCategories, type Category } from "@/api/category";
import { getSpecTemplates, type SpecTemplate } from "@/api/specTemplate";
import {
  createProduct,
  getProductDetail,
  updateProduct,
  type ProductDetail,
  type ProductSavePayload,
  type ProductStatus
} from "@/api/product";
import {
  createSpecItem,
  createSpecValue,
  nextUid,
  useSpecSku
} from "./useSpecSku";

/**
 * 商品表单的页面级逻辑：选项加载、详情回填、校验组装、提交与未保存拦截
 */
export function useProductForm() {
  const route = useRoute();
  const router = useRouter();

  const formRef = ref<FormInstance>();
  const loading = ref(false);
  const saving = ref(false);
  /** 当前激活的分页 */
  const activeTab = ref("basic");

  /** 表单字段所属分页，校验失败时用于自动切换 */
  const fieldTabMap: Record<string, string> = {
    product_name: "basic",
    spu_code: "basic",
    brand_id: "basic",
    category_ids: "basic",
    slider_images: "basic"
  };

  const brandList = ref<Brand[]>([]);
  const categoryTree = ref<Category[]>([]);
  const templateList = ref<SpecTemplate[]>([]);

  /** 路由上的商品ID，存在则为编辑模式 */
  const productId = computed(() => {
    const id = Number(route.query.id);
    return Number.isFinite(id) && id > 0 ? id : undefined;
  });
  const isEdit = computed(() => productId.value !== undefined);

  const formData = reactive({
    product_name: "",
    product_description: "",
    spu_code: "",
    brand_id: undefined as number | undefined,
    spec_template_id: null as number | null,
    category_ids: [] as number[],
    slider_images: [] as string[],
    video_url: "",
    video_cover_url: "",
    status: 1 as ProductStatus,
    sort: 0,
    detail_html: "",
    mobile_detail_html: ""
  });

  const {
    specList,
    skus,
    defaultSkuId,
    specTextOf,
    autoSkuName,
    autoSkuCode,
    refreshAutoSkus,
    regenerate
  } = useSpecSku({
    getProductName: () => formData.product_name,
    getSpuCode: () => formData.spu_code
  });

  const rules: FormRules = {
    product_name: [
      { required: true, message: "请输入商品名称", trigger: "blur" },
      { max: 100, message: "商品名称不能超过100个字符", trigger: "blur" }
    ],
    spu_code: [
      { required: true, message: "请输入商品编码", trigger: "blur" },
      { max: 50, message: "商品编码不能超过50个字符", trigger: "blur" }
    ],
    brand_id: [{ required: true, message: "请选择品牌", trigger: "change" }],
    category_ids: [
      {
        required: true,
        type: "array",
        min: 1,
        message: "请选择商品分类",
        trigger: "change"
      }
    ],
    slider_images: [
      {
        required: true,
        type: "array",
        min: 1,
        message: "请至少上传一张轮播图",
        trigger: "change"
      }
    ]
  };

  /** 分类树的字段映射 */
  const categoryProps = {
    label: "category_name",
    children: "children"
  };

  /** 选择规格模板后填充规格项 */
  const handleTemplateChange = (id: number) => {
    const template = templateList.value.find(item => item.id === id);
    if (!template?.spec_json?.length) return;

    specList.value = template.spec_json.map(item => ({
      id: nextUid(),
      name: item.name,
      is_image_required: 0,
      values: (item.values || []).length
        ? item.values.map(value => createSpecValue(value.value))
        : [createSpecValue()]
    }));
    regenerate();
  };

  /** 商品名称 / 编码变更时同步自动生成的 SKU 名称与编码 */
  watch(
    () => [formData.product_name, formData.spu_code],
    () => refreshAutoSkus()
  );

  /** 校验并组装提交给后端的商品数据 */
  const getFormData = async (): Promise<ProductSavePayload | null> => {
    /** 规格 / SKU 的校验提示：切回基本信息分页并提示 */
    const warnBasic = (message: string): null => {
      activeTab.value = "basic";
      ElMessage.warning(message);
      return null;
    };

    let valid = true;
    let firstInvalidProp = "";
    await formRef.value?.validate((isValid, invalidFields) => {
      valid = isValid;
      if (isValid || !invalidFields) return;
      firstInvalidProp = Object.keys(invalidFields)[0] || "";
      // 校验失败时切到第一个出错字段所在的分页
      const tab = fieldTabMap[firstInvalidProp];
      if (tab) activeTab.value = tab;
    });
    if (!valid) {
      // 等分页切换渲染完成后，滚动到第一个出错的表单项
      await nextTick();
      if (firstInvalidProp) formRef.value?.scrollToField(firstInvalidProp);
      return null;
    }

    if (!specList.value.length) {
      return warnBasic("请至少添加一个规格项");
    }

    const emptyItem = specList.value.find(item => !item.name.trim());
    if (emptyItem) {
      return warnBasic("规格项名称不能为空");
    }

    const invalidItem = specList.value.find(
      item => !item.values.length || item.values.some(v => !v.value.trim())
    );
    if (invalidItem) {
      return warnBasic(`规格项「${invalidItem.name}」的规格值不能为空`);
    }

    const invalidImage = specList.value.find(
      item =>
        item.is_image_required === 1 && item.values.some(v => !v.image_url)
    );
    if (invalidImage) {
      return warnBasic(`规格项「${invalidImage.name}」的规格值必须上传图片`);
    }

    if (!skus.value.length) {
      return warnBasic("请完善规格项与规格值后生成SKU");
    }

    const invalidPrice = skus.value.find(sku => !(Number(sku.sale_price) > 0));
    if (invalidPrice) {
      return warnBasic(
        `SKU「${specTextOf(invalidPrice.spec_value_ids)}」的售价必须大于0`
      );
    }

    if (
      !defaultSkuId.value ||
      !skus.value.some(sku => sku.id === defaultSkuId.value)
    ) {
      return warnBasic("请选择默认SKU");
    }

    return {
      spu: {
        spu_code: formData.spu_code.trim(),
        product_name: formData.product_name.trim(),
        product_description: formData.product_description.trim(),
        brand_id: formData.brand_id as number,
        spec_template_id: formData.spec_template_id,
        slider_images: [...formData.slider_images],
        video_url: formData.video_url,
        video_cover_url: formData.video_cover_url,
        status: formData.status,
        sort: formData.sort
      },
      category_ids: [...formData.category_ids],
      detail: {
        detail_html: formData.detail_html,
        mobile_detail_html: formData.mobile_detail_html
      },
      specs: specList.value.map((item, index) => ({
        id: item.id,
        name: item.name.trim(),
        is_image_required: item.is_image_required,
        sort: index + 1,
        values: item.values.map((value, valueIndex) => ({
          id: value.id,
          value: value.value.trim(),
          image_url: value.image_url || "",
          sort: valueIndex + 1
        }))
      })),
      skus: skus.value.map((sku, index) => ({
        id: sku.id,
        sku_code: sku.sku_code.trim() || autoSkuCode(index),
        name: sku.name.trim() || autoSkuName(sku.spec_value_ids),
        image_url: sku.image_url || "",
        sale_price: Number(sku.sale_price) || 0,
        cost_price: Number(sku.cost_price) || 0,
        strike_price: Number(sku.strike_price) || 0,
        stock: Number(sku.stock) || 0,
        weight: Number(sku.weight) || 0,
        volume: Number(sku.volume) || 0,
        status: sku.status,
        sort: index + 1,
        spec_value_ids: [...sku.spec_value_ids]
      })),
      default_sku_id: defaultSkuId.value as number
    };
  };

  /** 编辑模式：回填商品详情 */
  const fillForm = (detail: ProductDetail) => {
    const spu = detail.spu || ({} as ProductDetail["spu"]);

    formData.product_name = spu.product_name ?? "";
    formData.product_description = spu.product_description ?? "";
    formData.spu_code = spu.spu_code ?? "";
    formData.brand_id = spu.brand_id ?? undefined;
    formData.spec_template_id = spu.spec_template_id ?? null;
    formData.slider_images = spu.slider_images?.length
      ? [...spu.slider_images]
      : [];
    formData.video_url = spu.video_url ?? "";
    formData.video_cover_url = spu.video_cover_url ?? "";
    formData.status = (spu.status ?? 0) as ProductStatus;
    formData.sort = spu.sort ?? 0;

    formData.category_ids = detail.category_ids?.length
      ? [...detail.category_ids]
      : [];
    formData.detail_html = detail.detail?.detail_html ?? "";
    formData.mobile_detail_html = detail.detail?.mobile_detail_html ?? "";

    specList.value = detail.specs?.length
      ? detail.specs.map(item => ({
          id: item.id ?? nextUid(),
          name: item.name ?? "",
          is_image_required: item.is_image_required ?? 0,
          values: (item.values || []).length
            ? item.values.map(value => ({
                id: value.id ?? nextUid(),
                value: value.value ?? "",
                image_url: value.image_url ?? ""
              }))
            : [createSpecValue()]
        }))
      : [createSpecItem()];

    skus.value = (detail.skus || []).map(sku => ({
      id: sku.id ?? nextUid(),
      sku_code: sku.sku_code ?? "",
      name: sku.name ?? "",
      image_url: sku.image_url ?? "",
      sale_price: Number(sku.sale_price) || 0,
      cost_price: Number(sku.cost_price) || 0,
      strike_price: Number(sku.strike_price) || 0,
      stock: Number(sku.stock) || 0,
      weight: Number(sku.weight) || 0,
      volume: Number(sku.volume) || 0,
      status: (sku.status ?? 1) as ProductStatus,
      spec_value_ids: [...(sku.spec_value_ids ?? [])],
      auto_name: false,
      auto_code: false
    }));

    defaultSkuId.value = detail.default_sku_id || skus.value[0]?.id;
  };

  /** 返回商品列表 */
  const goBack = () => {
    const redirect = route.query.redirect as string | undefined;
    if (redirect) {
      router.push(redirect);
    } else if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const handleCancel = () => goBack();

  /** 保存商品 */
  const handleSave = async () => {
    const data = await getFormData();
    if (!data) return;

    saving.value = true;
    try {
      const res = isEdit.value
        ? await updateProduct(productId.value as number, data)
        : await createProduct(data);
      if (res.code === 200) {
        ElMessage.success(res.msg || "操作成功");
        goBack();
      } else {
        ElMessage.error(res.msg || "操作失败");
      }
    } catch (error) {
      console.error("保存商品失败:", error);
    } finally {
      saving.value = false;
    }
  };

  /** 表单是否已修改（有未保存内容时，刷新 / 关闭标签会先弹提示） */
  const dirty = ref(false);
  /** 数据加载 / 回填完成后才开始记录修改，避免回显被误判为已修改 */
  let dirtyTracking = false;

  watch(
    [formData, specList, skus],
    () => {
      if (dirtyTracking) dirty.value = true;
    },
    { deep: true }
  );

  /** 刷新 / 关闭标签：有未保存修改时拦截并弹出浏览器原生提示 */
  const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!dirty.value) return;
    event.preventDefault();
    // 兼容旧浏览器：需要设置 returnValue 才会弹出提示
    event.returnValue = "";
  };

  /** 加载品牌、分类、规格模板 */
  const loadOptions = async () => {
    try {
      const res = await getBrands({ page: 1, limit: 100 });
      if (res.code === 200) brandList.value = res.data;
    } catch (error) {
      console.error("获取品牌列表失败:", error);
    }

    try {
      const res = await getCategories();
      if (res.code === 200) categoryTree.value = res.data;
    } catch (error) {
      console.error("获取分类列表失败:", error);
    }

    try {
      const res = await getSpecTemplates({ page: 1, limit: 100 });
      if (res.code === 200) templateList.value = res.data;
    } catch (error) {
      console.error("获取规格模板列表失败:", error);
    }
  };

  /** 编辑模式：加载商品详情 */
  const loadDetail = async () => {
    if (!isEdit.value) return;

    loading.value = true;
    try {
      const res = await getProductDetail(productId.value as number);
      if (res.code === 200 && res.data) fillForm(res.data);
    } catch (error) {
      console.error("获取商品详情失败:", error);
    } finally {
      loading.value = false;
    }
  };

  onMounted(async () => {
    loadOptions();
    await loadDetail();
    window.addEventListener("beforeunload", handleBeforeUnload);
    // 回填完成后再开启脏检查，避免加载过程中的赋值被判为已修改
    dirtyTracking = true;
  });

  onBeforeUnmount(() => {
    window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  return {
    formRef,
    loading,
    saving,
    activeTab,
    brandList,
    categoryTree,
    templateList,
    isEdit,
    formData,
    rules,
    categoryProps,
    specList,
    skus,
    defaultSkuId,
    regenerate,
    handleTemplateChange,
    handleCancel,
    handleSave
  };
}
