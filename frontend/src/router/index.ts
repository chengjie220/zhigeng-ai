import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/BriefView.vue'),
      meta: { title: '今日简报' },
    },
    {
      path: '/notices',
      name: 'notices',
      component: () => import('@/views/HomeView.vue'),
      meta: { title: '全部通知' },
    },
    {
      path: '/notice/:id',
      name: 'notice-detail',
      component: () => import('@/views/NoticeDetail.vue'),
      meta: { title: '通知详情' },
    },
    {
      path: '/sources',
      name: 'sources',
      component: () => import('@/views/SourcesView.vue'),
      meta: { title: '信息源管理' },
    },
    {
      path: '/favorites',
      name: 'favorites',
      component: () => import('@/views/FavoritesView.vue'),
      meta: { title: '我的收藏' },
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('@/views/AboutView.vue'),
      meta: { title: '关于项目' },
    },
    // 未匹配路径回首页
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior(to) {
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 72 }
    return { top: 0 }
  },
})

router.afterEach((to) => {
  const base = '知更 AI · 校园机会雷达'
  document.title = to.meta.title ? `${to.meta.title} | ${base}` : base
})

export default router
