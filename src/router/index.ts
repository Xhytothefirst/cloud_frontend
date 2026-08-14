import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { getToken } from '../utils/token'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/Login.vue'),
    meta: { layout: 'plain' },
  },
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
  {
    path: '/role',
    name: 'role',
    component: () => import('../views/RoleManage.vue'),
  },
  {
    path: '/account',
    name: 'account',
    component: () => import('../views/AccountManage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const loggedIn = !!getToken()
  if (to.path === '/login') {
    return loggedIn ? { path: '/' } : true
  }
  if (!loggedIn) {
    return { path: '/login' }
  }
  return true
})

export default router