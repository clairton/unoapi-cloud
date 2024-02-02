// Composables
import { createRouter, createWebHistory } from 'vue-router'
// import from base from vite compiler
const BASE_URL = import.meta.env.BASE_URL

const routes = [
  {
    path: BASE_URL,
    component: () => import('@/layouts/default/Default.vue'),
    children: [
      {
        path: '',
        name: 'instances',
        component: () => import(/* webpackChunkName: "home" */ '@/views/Home.vue'),
      },
      {
        path: ':id',
        name: 'instance',
        component: () => import('@/views/Instance.vue'),
      },
    ],
  },
  {
    path: BASE_URL + 'doc',
    component: () => import('@/layouts/doc/Index.vue'),
    children: [
      {
        path: ':doc',
        name: 'doc',
        component: () => import('@/views/Doc.vue'),
      },
      {
        path: '',
        name: 'doc.index',
        component: () => import('@/views/Doc.vue'),
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: BASE_URL,
  },
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes,
})

export default router
