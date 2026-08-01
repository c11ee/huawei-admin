import pdfIcon from "@/assets/images/PDF@2x.png";
import excelIcon from "@/assets/images/EXCEL@2x.png";
import excelIcon2 from "@/assets/images/EXCEL@2x-2.png";
import wordIcon from "@/assets/images/WORD@2x.png";
import pptIcon from "@/assets/images/PPT@2x.png";

export const iconMap = [
  { ext: ".pdf", icon: pdfIcon },
  { ext: ".ppt", icon: pptIcon },
  { ext: ".xls", icon: excelIcon },
  { ext: ".xlsx", icon: excelIcon2 },
  { ext: ".doc", icon: wordIcon },
  { ext: ".docx", icon: wordIcon },
];

export const getFileIcon = (url: string) => {
  const lower = url.toLowerCase();
  for (const { ext, icon } of iconMap) {
    if (lower.endsWith(ext)) return icon;
  }
  return url;
};

/**
 * 获取最小图片 URL
 * @param url 图片 URL
 * @returns 最小图片 URL
 */
export function getMinImageUrl(url: string) {
  if (!url) return url;

  // 👇 关键：只有 阿里云OSS + 没有任何参数 ? 时，才压缩
  if (url.includes("aliyuncs.com") && !url.includes("?")) {
    return (
      url + "?x-oss-process=image/resize,w_200/format,webp/quality,q_30/strip"
    );
  }

  // 有参数 或 不是阿里云 → 直接返回原 URL，不修改
  return url;
}

/** 格式化文件名, 获取最后一个 / 后的字符串 */
export function formatFileName(name: string) {
  return name.split("/").pop() || name;
}
