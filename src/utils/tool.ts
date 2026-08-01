import { ElMessage } from "element-plus";

/** 复制文本 */
export function copyText(val: string) {
  if (window.isSecureContext && navigator.clipboard) {
    navigator.clipboard
      .writeText(val)
      .then(() => {
        ElMessage.success("复制成功");
      })
      .catch(() => {
        ElMessage.error("复制失败");
      });
  } else {
    const copyElem = document.createElement("textarea");
    const styles = copyElem.style;
    styles.position = "fixed";
    styles.zIndex = "0";
    styles.left = "-500px";
    styles.top = "-500px";
    copyElem.value = val;
    document.body.appendChild(copyElem);
    copyElem.focus();
    copyElem.select();
    let result = false;
    result = document.execCommand("copy");
    if (result) {
      ElMessage.success("复制成功");
      copyElem.remove();
    } else {
      ElMessage.error("复制失败");
    }
  }
}
