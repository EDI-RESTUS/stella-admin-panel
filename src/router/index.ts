import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import AuthLayout from '../layouts/AuthLayout.vue'
import AppLayout from '../layouts/AppLayout.vue'
import axios from 'axios'
const routes: Array<RouteRecordRaw> = [
  {
    name: 'loader',
    path: '/loader/:paymentId',
    component: () => import('../pages/loader/index.vue'),
    meta: { roles: ['admin', 'super-admin', 'caller', 'editor', 'supervisor'] },
  },
  {
    name: 'admin',
    path: '/',
    component: AppLayout,
    meta: { roles: ['admin', 'super-admin', 'caller', 'editor', 'caller-editor', 'supervisor'] },
    redirect: { name: 'login' },
    children: [
      {
        name: 'dashboard',
        path: 'dashboard',
        component: () => import('../pages/admin/dashboard/Dashboard.vue'),
        meta: { roles: ['admin', 'super-admin', 'caller', 'editor', 'caller-editor', 'supervisor'] },
      },
      {
        name: 'stellaUsers',
        path: 'stellaUsers',
        component: () => import('../pages/stellaUsers/index.vue'),
        meta: { roles: ['super-admin'] },
      },
      {
        name: 'outletUsers',
        path: 'outletUsers',
        component: () => import('../pages/outletUsers/index.vue'),
        meta: { roles: ['admin', 'super-admin'] },
      },
      {
        name: 'areas',
        path: 'areas',
        component: () => import('../pages/areas/index.vue'),
        meta: { roles: ['admin', 'super-admin'] },
      },
      {
        name: 'deletedArticles',
        path: 'deletedArticles',
        component: () => import('../pages/deletedArticles/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
      },
      {
        name: 'payments',
        path: 'payments',
        component: () => import('../pages/payments/index.vue'),
        meta: { roles: ['admin', 'super-admin'] },
      },
      {
        name: 'employees',
        path: 'employees',
        component: () => import('../pages/employees/index.vue'),
        meta: { roles: ['admin', 'super-admin'] },
      },
      {
        name: 'deliveryZone',
        path: 'deliveryZone',
        component: () => import('../pages/deliveryZone/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'supervisor'] },
      },
      {
        name: 'organizeMenu',
        path: 'organizeMenu',
        component: () => import('../pages/organizeMenu.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
      },
      {
        name: 'categories',
        path: 'categories',
        component: () => import('../pages/categories/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
      },
      {
        name: 'articles',
        path: 'articles',
        component: () => import('../pages/articles/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor', 'supervisor'] },
      },
      {
        name: 'articlesOptions',
        path: 'articlesOptions',
        component: () => import('../pages/articlesOptions/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor', 'supervisor'] },
        children: [
          {
            name: 'articlesOptionsList',
            path: 'list',
            component: () => import('../pages/articlesOptionsList/index.vue'),
            meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor', 'supervisor'] },
          },
          {
            name: 'articlesOptionsGroups',
            path: 'groups',
            component: () => import('../pages/articlesOptionsGroups/index.vue'),
            meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
          },
        ],
      },
      {
        name: 'offers',
        path: 'offers',
        component: () => import('../pages/offers/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor', 'supervisor'] },
      },
      {
        name: 'offerGiftRules',
        path: 'offerGiftRules',
        component: () => import('../pages/offerGiftRules/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'supervisor'] },
      },
      {
        name: 'promotions',
        path: 'promotions',
        component: () => import('../pages/promotions/index.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
      },
      {
        name: 'allergens',
        path: 'allergens',
        component: () => import('../pages/allergens.vue'),
        meta: { roles: ['admin', 'super-admin', 'editor', 'caller-editor'] },
      },
      {
        name: 'callCenters',
        path: 'callCenters',
        component: () => import('../pages/callCenters/index.vue'),
        meta: { roles: ['caller', 'admin', 'super-admin', 'caller-editor', 'supervisor'] },
      },
      {
        name: 'callCenterLogs',
        path: 'callCenterLogs',
        component: () => import('../pages/callCenterLogs/index.vue'),
        meta: { roles: ['admin', 'super-admin'] },
      },
      {
        name: 'outlets',
        path: 'outlets',
        children: [
          {
            name: 'list',
            path: 'list',
            component: () => import('../pages/service-zone/index.vue'),
            meta: { roles: ['super-admin'] },
          },
          {
            name: 'create-outlet',
            path: 'create',
            component: () => import('../pages/service-zone/form.vue'),
            meta: { roles: ['super-admin'] },
          },
          {
            name: 'update-outlet',
            path: 'update/:id?',
            component: () => import('../pages/service-zone/form.vue'),
            meta: { roles: ['admin', 'super-admin'] },
          },
          {
            name: 'admin-update-outlet',
            path: 'admin/update/:id?',
            component: () => import('../pages/service-zone/form.vue'),
            meta: { roles: ['super-admin'] },
          },
        ],
      },
    ],
  },
  {
    path: '/auth',
    component: AuthLayout,
    children: [
      {
        name: 'login',
        path: 'login',
        component: () => import('../pages/auth/Login.vue'),
      },
      {
        name: 'logout',
        path: 'logout',
        beforeEnter: (to, from, next) => {
          window.sessionStorage.removeItem('selectedRest'), window.sessionStorage.removeItem('token')
          next('/auth/login')
        },
      },
      {
        name: 'signup',
        path: 'signup',
        component: () => import('../pages/auth/Signup.vue'),
      },
      {
        name: 'recover-password',
        path: 'recover-password',
        component: () => import('../pages/auth/RecoverPassword.vue'),
      },
      {
        name: 'recover-password-email',
        path: 'recover-password-email',
        component: () => import('../pages/auth/CheckTheEmail.vue'),
      },
    ],
  },
  {
    name: '404',
    path: '/404',
    component: () => import('../pages/404.vue'),
  },
  {
    name: '403',
    path: '/403',
    component: () => import('../pages/403.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    // For some reason using documentation example doesn't scroll on page navigation.
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' }
    } else {
      window.scrollTo(0, 0)
    }
  },
  routes,
})

const token = (config) => {
  config.headers.Authorization = 'Bearer ' + window.sessionStorage.getItem('token')
  return config
}

const activeInterceptor = ''

async function setToken() {
  if (!activeInterceptor) {
    const interceptorObj = axios.interceptors.request.use(token)
    window.sessionStorage.setItem('activeInterceptor', JSON.stringify(interceptorObj))
  }
}

async function removeToken() {
  axios.interceptors.request.eject(
    axios.interceptors.request.use(JSON.parse(window.sessionStorage.getItem('activeInterceptor'))),
  )
  window.sessionStorage.removeItem('activeInterceptor')
}

router.beforeEach((to, from, next) => {
  const userAlreadyLoggedIn: any = window.sessionStorage.getItem('token')
  const userRole = window.sessionStorage.getItem('role') || ''

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        window.sessionStorage.removeItem('token')
        router.push('/auth/login')
      }
      return Promise.reject(error)
    },
  )

  if (to.name === '403' || to.name === '404') {
    next()
  }

  if (!userAlreadyLoggedIn) {
    removeToken()
    if (
      to.name !== 'login' &&
      to.name !== 'signup' &&
      to.name !== 'recover-password' &&
      to.name !== 'recover-password-email'
    ) {
      next('/auth/login')
    } else {
      next()
    }
  } else {
    setToken()

    const allowedRoles = to.meta?.roles as string[] | undefined
    if (Array.isArray(allowedRoles) && !allowedRoles.includes(userRole)) {
      return next('/403')
    }

    const roleDefaultPages: Record<string, string> = {
      admin: 'articles',
      'super-admin': 'list',
      editor: 'articles',
      caller: 'callCenters',
      'caller-editor': 'callCenters',
      supervisor: 'callCenters',
    }

    const defaultPage = roleDefaultPages[userRole] || 'articles'

    // If user lands on `/dashboard`, redirect them to their default page
    if (to.name === 'dashboard') {
      return next({ name: defaultPage })
    }

    if (to.path === '/' || (!to.name && from.name === undefined)) {
      return next({ name: defaultPage })
    }

    if (to.name === 'login') {
      return next({ name: defaultPage })
    } else {
      next()
    }
  }
})
export default router
