/**
 * 不需要路由切换动画的路径名单（后端路由适用）
 *
 * 后端返回的路由无法在 meta 中直接配置 transition: false，
 * 在此数组中添加路由路径即可跳过过渡动画。
 */

const noTransitionRoutes: string[] = [
  // 在此添加需要跳过动画的路由路径，例如：
  // '/dashboard',
  // '/data/list',
  '/attachment'
];

export default noTransitionRoutes;
