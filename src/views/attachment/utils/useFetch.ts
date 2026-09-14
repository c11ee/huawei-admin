import { getAttachmentList, getFolderTree } from "@/api/attachment";
import { reactive, ref, type Ref } from "vue";
import { TableV2SortOrder } from "element-plus";
import { getName, createRootFolderNode } from "@/utils/attachment/common";
import { useRoute, useRouter } from "vue-router";
import { AttachmentNode, FolderNode } from "@/api/types/attachment";

/** 文件树缓存数据（模块级变量，组件重建后不重置） */
let cachedTreeData: FolderNode[] = [];
/** 是否已请求过文件夹列表 */
let folderFetched = false;

export const useFetch = ({
  allFileList,
  clearSelectedMaps
}: {
  allFileList: Ref<AttachmentNode[]>;
  clearSelectedMaps: () => void;
}) => {
  const router = useRouter();
  const route = useRoute();
  const folderLoading = ref(false);
  const fileListLoading = ref(false);

  const params = reactive({
    keyword: "",
    orderBy: TableV2SortOrder.DESC as TableV2SortOrder | undefined,
    folder_id: 0
  });

  const treeRef = ref();
  const treeFileList = ref<FolderNode[]>(cachedTreeData);
  const originalFileList = ref<AttachmentNode[]>([]);

  /** 处理树节点切换 */
  const handleCurrentChange = (data: FolderNode) => {
    if (params.folder_id === data.id) return;
    treeRef.value?.setCurrentKey(data.id);
    router.replace({
      path: route.path,
      query: { folder_id: data.id }
    });
  };

  /** 前端排序 */
  const handleSort = (orderBy?: TableV2SortOrder) => {
    params.orderBy = orderBy;
    allFileList.value = sortFiles(allFileList.value, orderBy);
  };

  const sortFiles = (files: AttachmentNode[], order?: TableV2SortOrder) => {
    if (!order) return files;
    return [...files].sort((a, b) => {
      const t1 = a.updated_at_ts;
      const t2 = b.updated_at_ts;
      return order === TableV2SortOrder.ASC ? t1 - t2 : t2 - t1;
    });
  };

  /** 获取文件夹树（首次调用走缓存，force=true 可强制刷新） */
  const fetchFolderList = async (force = false) => {
    if (!force && folderFetched) return;
    folderLoading.value = true;
    getFolderTree().then(res => {
      const treeData: FolderNode[] = [
        createRootFolderNode("全部", 0),
        ...res.data,
        createRootFolderNode("回收站", -1)
      ];
      treeFileList.value = treeData;
      cachedTreeData = treeData;
      folderFetched = true;
      folderLoading.value = false;
    });
  };

  /** 获取当前目录文件列表 */
  const fetchData = async () => {
    fileListLoading.value = true;
    clearSelectedMaps();
    return new Promise((resolve, reject) => {
      getAttachmentList(params)
        .then(res => {
          allFileList.value = res.data;
          originalFileList.value = allFileList.value.slice();
          treeRef.value?.setCurrentKey(params.folder_id);
          fileListLoading.value = false;
          resolve(1);
        })
        .catch(() => {
          fileListLoading.value = false;
          reject(2);
        });
    });
  };

  const handleReset = () => {
    params.keyword = "";
    allFileList.value = originalFileList.value.slice();
    handleSort(TableV2SortOrder.DESC);
  };

  const handleSearch = () => {
    if (originalFileList.value.length === 0) {
      fetchData();
      return;
    }
    const keyword = params.keyword.trim();
    allFileList.value = originalFileList.value.filter(item =>
      getName(item).includes(keyword)
    );
  };

  return {
    params,
    treeRef,
    treeFileList,
    fetchFolderList,
    fetchData,
    handleCurrentChange,
    handleSort,
    handleReset,
    handleSearch
  };
};
