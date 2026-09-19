const Layout = () => import("@/layout/index.vue");

export default [
  {
    path: "/login",
    name: "Login",
    component: () => import("@/views/login/index.vue"),
    meta: {
      title: "登录",
      showLink: false
    }
  },
  // 全屏403（无权访问）页面
  {
    path: "/access-denied",
    name: "AccessDenied",
    component: () => import("@/views/error/403.vue"),
    meta: {
      title: "403",
      showLink: false
    }
  },
  // 全屏500（服务器出错）页面
  {
    path: "/server-error",
    name: "ServerError",
    component: () => import("@/views/error/500.vue"),
    meta: {
      title: "500",
      showLink: false
    }
  },
  {
    path: "/redirect",
    component: Layout,
    meta: {
      title: "加载中...",
      showLink: false
    },
    children: [
      {
        path: "/redirect/:path(.*)",
        name: "Redirect",
        component: () => import("@/layout/redirect.vue")
      }
    ]
  },
  // 商品添加/编辑（从商品列表页进入，不显示在菜单）
  {
    path: "/product/product-form",
    component: Layout,
    meta: {
      title: "商品编辑",
      showLink: false
    },
    children: [
      {
        path: "",
        name: "ProductForm",
        component: () => import("@/views/product/product-form/index.vue"),
        meta: {
          title: "商品编辑",
          showLink: false
        }
      }
    ]
  }
] satisfies Array<RouteConfigsTable>;
