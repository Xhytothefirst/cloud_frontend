import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue'),
  },
  {
    path: '/inbound',
    name: 'inbound',
    component: () => import('../views/Inbound.vue'),
  },
  {
    path: '/brand',
    name: 'brand',
    component: () => import('../views/BrandManage.vue'),
  },
  {
    path: '/log',
    name: 'log',
    component: () => import('../views/Log.vue'),
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router