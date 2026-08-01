import { getAttachmentList, getFolderTree } from "@/api/attachment";
import { computed, reactive, ref } from "vue";
import folderIcon from "@/assets/attachment/FOLDER.png";
import docIcon from "@/assets/attachment/DOC.png";
import pdfIcon from "@/assets/attachment/PDF.png";
import pptIcon from "@/assets/attachment/PPT.png";
import xlsIcon from "@/assets/attachment/XLS.png";
import mp3Icon from "@/assets/attachment/MP3.png";
import videoIcon from "@/assets/attachment/VIDEO.png";
import textIcon from "@/assets/attachment/TEXT.png";
import zipIcon from "@/assets/attachment/ZIP.png";
import imageIcon from "@/assets/attachment/IMAGE.png";
import { TableV2SortOrder } from "element-plus";
import { getMinImageUrl } from "./common";
import { useRoute, useRouter } from "vue-router";
import {
  AttachmentListRequest,
  AttachmentNode,
  FolderNode
} from "@/api/types/attachment";

/** 文件树缓存数据（模块级变量，组件重建后不重置） */
let cachedTreeData: FolderNode[] = [];
/** 是否已请求过文件夹列表 */
let folderFetched = false;

export const useFetch = ({
  clearSelectedMaps
}: {
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

  /** 树型数据引用 */
  const treeRef = ref();

  /** 单独区分文件列表作为文件树型数据 */
  const treeFileList = ref<FolderNode[]>(cachedTreeData);

  /** 包含文件夹和文件的数据 */
  const allFileList = ref<AttachmentNode[]>([]);
  /** 原始数据, 用于处理前端排序 */
  const originalFileList = ref<AttachmentNode[]>([]);

  /** 处理当前选中节点变化 */
  const handleCurrentChange = (data: FolderNode) => {
    if (params.folder_id === data.id) return;
    // 立即高亮，不等路由切换后的异步流程
    treeRef.value?.setCurrentKey(data.id);
    // 修改路由参数
    router.replace({
      path: route.path,
      query: {
        folder_id: data.id
      }
    });
  };

  /** 前端根据上传时间排序, 不用管文件夹 */
  const handleSort = (orderBy?: TableV2SortOrder) => {
    params.orderBy = orderBy;

    allFileList.value = sortFiles(allFileList.value, orderBy);
  };
  const sortFiles = (files: AttachmentNode[], order?: TableV2SortOrder) => {
    if (!order) return files;

    return files.sort((a, b) => {
      const t1 = a.updated_at_ts;
      const t2 = b.updated_at_ts;
      return order === TableV2SortOrder.ASC ? t1 - t2 : t2 - t1;
    });
  };

  /** 获取文件夹列表（仅首次调用生效，传 force=true 可强制重新请求） */
  const fetchFolderList = async (force = false) => {
    if (!force && folderFetched) return;
    folderLoading.value = true;
    getFolderTree().then(res => {
      const TEMP = {
        user_id: 0,
        parent_id: 0,
        sort: 0,
        type: "folder" as const,
        children: [] as FolderNode[],
        updated_at: "",
        created_at: "",
        created_at_ts: 0,
        updated_at_ts: 0
      };
      // 构建树
      const treeData: FolderNode[] = [
        {
          name: "全部",
          id: 0,
          ...TEMP
        },
        ...res.data,
        {
          name: "回收站",
          id: -1,
          ...TEMP
        }
      ];
      treeFileList.value = treeData;
      cachedTreeData = treeData;
      folderFetched = true;
      folderLoading.value = false;
    });
  };

  const getName = (item: AttachmentNode) => {
    return item.type == "folder" ? item.name : item.original_name;
  };

  /** 获取当前目录文件列表 */
  const fetchData = async () => {
    fileListLoading.value = true;
    clearSelectedMaps();
    return new Promise((resolve, reject) => {
      getAttachmentList(params)
        .then(res => {
          allFileList.value = res.data;

          originalFileList.value = allFileList.value.slice(); // 不需要 cloneDeep

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
    allFileList.value = originalFileList.value.filter(item => {
      return getName(item).includes(keyword);
    });
  };

  /** 后缀 → 图标映射 */
  const iconExtMap: Record<string, string> = {
    doc: docIcon,
    docx: docIcon,
    wps: docIcon,
    pdf: pdfIcon,
    ppt: pptIcon,
    pptx: pptIcon,
    xls: xlsIcon,
    xlsx: xlsIcon,
    csv: xlsIcon,
    mp3: mp3Icon,
    wav: mp3Icon,
    flac: mp3Icon,
    aac: mp3Icon,
    ogg: mp3Icon,
    wma: mp3Icon,
    mp4: videoIcon,
    avi: videoIcon,
    mov: videoIcon,
    wmv: videoIcon,
    flv: videoIcon,
    mkv: videoIcon,
    webm: videoIcon,
    zip: zipIcon,
    rar: zipIcon,
    "7z": zipIcon,
    tar: zipIcon,
    gz: zipIcon,
    txt: textIcon,
    md: textIcon,
    json: textIcon,
    xml: textIcon,
    log: textIcon,
    html: textIcon,
    htm: textIcon,
    css: textIcon,
    js: textIcon,
    jsx: textIcon,
    ts: textIcon,
    tsx: textIcon
  };

  const getFileUrl = (item: AttachmentNode) => {
    if (item.type === "folder") return folderIcon;
    // 图片直接展示原图
    if (item.mime_type.startsWith("image/")) return item.file_url;
    // 其他文件展示对应图标，无匹配则兜底用 IMAGE.png
    return iconExtMap[item.extension] ?? imageIcon;
  };

  return {
    params,
    treeRef,
    allFileList,
    treeFileList,
    fetchFolderList,
    fetchData,
    handleCurrentChange,
    handleSort,
    handleReset,
    handleSearch,
    getName,
    getFileUrl
  };
};
