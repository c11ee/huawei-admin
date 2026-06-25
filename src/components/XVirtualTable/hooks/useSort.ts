export function useSort(emit: any) {
  const handleSortChange = ({ property, order }: any) => {
    // 组装成后端通用识别的经典格式 field:desc 或 field:asc
    const orderBy = order ? `${property}:${order}` : "";
    emit("sort-change", {
      field: property,
      order: order || null,
      orderBy: orderBy
    });
  };

  return {
    handleSortChange
  };
}
