<template>
  <div class="product-form-page h-full w-full flex flex-col gap-y-3">
    <el-card shadow="never" class="shrink-0">
      <div class="card-header flex items-center justify-between">
        <span class="text-lg font-bold">{{
          isEdit ? "编辑商品" : "添加商品"
        }}</span>
        <div class="flex items-center">
          <el-button
            type="primary"
            :icon="Check"
            :loading="saving"
            @click="handleSave"
          >
            保存
          </el-button>
          <el-button :icon="Close" @click="handleCancel">取消</el-button>
        </div>
      </div>
    </el-card>

    <el-card
      v-loading="loading"
      shadow="never"
      class="content-card flex-1 min-h-0"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        :label-width="isNarrow ? 'auto' : '100px'"
        :label-position="isNarrow ? 'top' : 'right'"
        class="content-form flex-1 min-h-0"
      >
        <el-tabs v-model="activeTab" class="content-tabs flex-1 min-h-0">
          <el-tab-pane label="基本信息" name="basic">
            <el-scrollbar height="100%">
              <div class="info-grid">
                <el-form-item label="商品名称" prop="product_name">
                  <el-input
                    v-model="formData.product_name"
                    placeholder="请输入商品名称"
                    maxlength="100"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="商品编码" prop="spu_code">
                  <el-input
                    v-model="formData.spu_code"
                    placeholder="请输入商品编码，如：HW-PH-001"
                    maxlength="50"
                  />
                </el-form-item>

                <el-form-item
                  class="info-grid-full"
                  label="商品描述"
                  prop="product_description"
                >
                  <el-input
                    v-model="formData.product_description"
                    type="textarea"
                    :rows="3"
                    placeholder="请输入商品描述"
                    maxlength="200"
                    show-word-limit
                  />
                </el-form-item>

                <el-form-item label="品牌" prop="brand_id">
                  <el-select
                    v-model="formData.brand_id"
                    placeholder="请选择品牌"
                    clearable
                    class="w-full"
                  >
                    <el-option
                      v-for="brand in brandList"
                      :key="brand.id"
                      :label="brand.name"
                      :value="brand.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="商品分类" prop="category_ids">
                  <el-tree-select
                    v-model="formData.category_ids"
                    :data="categoryTree"
                    :props="categoryProps"
                    node-key="id"
                    multiple
                    show-checkbox
                    check-on-click-node
                    clearable
                    class="w-full"
                    placeholder="请选择商品分类"
                  />
                </el-form-item>

                <el-form-item label="规格模板" prop="spec_template_id">
                  <el-select
                    v-model="formData.spec_template_id"
                    placeholder="请选择规格模板，选择后自动填充规格项"
                    clearable
                    class="w-full"
                    @change="handleTemplateChange"
                  >
                    <el-option
                      v-for="template in templateList"
                      :key="template.id"
                      :label="template.name"
                      :value="template.id"
                    />
                  </el-select>
                </el-form-item>

                <el-form-item label="状态" prop="status">
                  <el-switch
                    v-model="formData.status"
                    inline-prompt
                    :active-value="1"
                    :inactive-value="2"
                    active-text="上架"
                    inactive-text="下架"
                  />
                </el-form-item>

                <el-form-item label="排序" prop="sort">
                  <el-input-number
                    v-model="formData.sort"
                    :min="0"
                    :max="9999"
                    controls-position="right"
                  />
                </el-form-item>

                <el-form-item
                  class="info-grid-full"
                  label="轮播图"
                  prop="slider_images"
                >
                  <XAttachmentPicker
                    v-model="formData.slider_images"
                    multiple
                    :limit="9"
                    title="选择轮播图"
                  />
                </el-form-item>

                <el-form-item label="商品视频" prop="video_url">
                  <div class="flex items-start gap-x-6">
                    <div class="flex flex-col gap-y-1">
                      <span class="text-xs text-(--el-text-color-secondary)"
                        >视频</span
                      >
                      <XAttachmentPicker
                        v-model="formData.video_url"
                        title="选择商品视频"
                      />
                    </div>
                    <div class="flex flex-col gap-y-1">
                      <span class="text-xs text-(--el-text-color-secondary)"
                        >封面</span
                      >
                      <XAttachmentPicker
                        v-model="formData.video_cover_url"
                        title="选择视频封面"
                      />
                    </div>
                  </div>
                </el-form-item>
              </div>

              <el-form-item label="规格项">
                <SpecEditor v-model="specList" @change="regenerate" />
              </el-form-item>

              <el-form-item label="SKU列表">
                <SkuTable
                  v-model:skus="skus"
                  v-model:default-sku-temp-id="defaultSkuTempId"
                  :spec-list="specList"
                  @regenerate="regenerate"
                />
              </el-form-item>
            </el-scrollbar>
          </el-tab-pane>

          <!-- 懒加载：编辑器需要可见区域才能正确计算高度，隐藏状态下创建会报
               "编辑区域高度 < 300px" 且 hoverbar 定位异常 -->
          <el-tab-pane label="商品详情" name="detail" lazy>
            <el-scrollbar height="100%">
              <el-form-item label="PC端详情" prop="detail_html">
                <XRichEditor
                  v-model="formData.detail_html"
                  placeholder="请输入 PC 端商品详情"
                />
              </el-form-item>

              <el-form-item label="移动端详情" prop="mobile_detail_html">
                <XRichEditor
                  v-model="formData.mobile_detail_html"
                  placeholder="请输入移动端商品详情"
                />
              </el-form-item>
            </el-scrollbar>
          </el-tab-pane>
        </el-tabs>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useMediaQuery } from "@vueuse/core";
import { Check, Close } from "@element-plus/icons-vue";
import XAttachmentPicker from "@/components/XAttachmentPicker/index.vue";
import XRichEditor from "@/components/XRichEditor/index.vue";
import SkuTable from "./components/SkuTable.vue";
import SpecEditor from "./components/SpecEditor.vue";
import { useProductForm } from "./composables/useProductForm";

defineOptions({
  name: "ProductForm"
});

/** 移动端断点与布局保持一致（<=760px 进入移动端布局） */
const isNarrow = useMediaQuery("(max-width: 760px)");

const {
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
  defaultSkuTempId,
  regenerate,
  handleTemplateChange,
  handleCancel,
  handleSave
} = useProductForm();
</script>

<style scoped>
/* 把整页高度锁在一屏内：扣除顶部导航+标签栏(81px)、页面上下外边距(32px)、
   页脚(约30px)并留少量余量。否则长表单会把整页撑高，整页滚动时顶部
   “保存/取消”操作栏会一起被滚出视野；滚动改由卡片内部承担 */
.product-form-page {
  max-height: calc(100vh - 148px);
}

/* el-card__body 默认不是 flex 容器，内部 flex-1 会失效、
   表单以自身内容高度撑开，滚动条跑到整页上；这里补成纵向 flex 容器 */
.content-card :deep(.el-card__body) {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.content-form {
  display: flex;
  flex-direction: column;
}

.content-tabs {
  display: flex;
  flex-direction: column;
}

/* 分页内容区撑满剩余高度，滚动条交给各分页内的 el-scrollbar */
.content-tabs :deep(.el-tabs__content) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.content-tabs :deep(.el-tab-pane) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.content-tabs :deep(.el-tab-pane) > .el-scrollbar {
  flex: 1;
  min-height: 0;
}

/* 基本信息两列栅格：用 grid + minmax(0,1fr) 替代 el-row/el-col，
   避免 gutter 的负边距在滚动容器内撑出横向滚动条 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 12px;
}

.info-grid > .el-form-item {
  min-width: 0;
}

.info-grid-full {
  grid-column: 1 / -1;
}

/* 移动端（断点与布局的 760px 保持一致）：表单项标签置顶、基本信息单列 */
@media screen and (max-width: 760px) {
  .content-card :deep(.el-card__body) {
    padding: 12px;
  }

  .info-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
