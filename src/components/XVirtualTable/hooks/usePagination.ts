import { useElementSize } from "@vueuse/core";
import { computed, Ref, ref } from "vue";

export const usePagination = (
  paginationProps: Ref<{
    total: number;
    page: number;
    limit: number;
  }>
) => {
  const wrapRef = ref<HTMLDivElement>(null);
  const { width } = useElementSize(wrapRef);

  const paginationBind = computed(() => {
    const w = width.value;

    return {
      total: paginationProps.value.total,
      currentPage: paginationProps.value.page,
      pageSize: paginationProps.value.limit,
      // size: "small" as const,
      background: true,
      pageSizes: [20, 100, 200, 500, 1000],
      layout: getLayoutByWidth(w),
      pagerCount: getPagerCountByWidth(w)
    };
  });

  const getLayoutByWidth = (width: number) => {
    if (width >= 507) {
      return "total, sizes, prev, pager, next";
    } else if (width >= 400) {
      return "total, sizes, pager";
    } else if (width >= 340) {
      return "sizes, pager";
    } else {
      return "pager";
    }
  };

  const getPagerCountByWidth = (width: number) => {
    if (width >= 507) {
      return 7;
    } else {
      // 最小为 5
      return 5;
    }
  };

  return {
    wrapRef,
    paginationBind
  };
};
