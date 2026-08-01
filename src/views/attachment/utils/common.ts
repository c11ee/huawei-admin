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
import type { AttachmentNode } from "@/api/types/attachment";

/** 文件后缀 → 图标映射 */
export const iconExtMap: Record<string, string> = {
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

/** 获取文件展示图标/缩略图 */
export const getFileUrl = (item: AttachmentNode): string => {
  if (item.type === "folder") return folderIcon;
  if (item.mime_type.startsWith("image/")) return item.file_url;
  return iconExtMap[item.extension] ?? imageIcon;
};

/** 获取展示名称（文件夹用 name，文件用 original_name） */
export const getName = (item: AttachmentNode): string => {
  return item.type === "folder" ? item.name : item.original_name;
};
