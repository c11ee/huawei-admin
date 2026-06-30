const originalWarn = console.warn;
console.warn = (...args: string[]) => {
  // 如果警告信息里包含 "No match found for location"，直接拦截，不打印
  if (
    typeof args[0] === "string" &&
    args[0].includes("No match found for location")
  ) {
    // 在获取动态路由前就已经提示了，这里直接拦截，不打印警告
    return;
  }
  // 其他正常的警告依然允许打印
  originalWarn(...args);
};
const originalError = console.error;
console.error = (...args: string[]) => {
  // 不使用, 而是使用 element-plus 提示
  if (
    typeof args[0] === "string" &&
    args[0].includes(
      '[vxe table v4.19.17] [table] 缺少 "vxe-tooltip" 组件，请检查是否正确安装。 '
    )
  ) {
    return;
  }
  originalError(...args);
};
