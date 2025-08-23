import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { Routes as Route } from '@/model/Enums.ts'

export const DEV_VERSION = '2.27'
export const DEVELOPMENT = false
// export const DEVELOPMENT = true

const app = createApp(App)

const routes = [
  { path: '/', name: 'home', redirect: '/points' },
  { path: Route.Points, name: 'points', component: () => import((`@/pages/PointsView.vue`)) },
  { path: Route.AddPoint, name: 'add_point', component: () => import((`@/pages/AddPointView.vue`)) },
  { path: Route.EditPoint, name: 'edit_point', component: () => import((`@/pages/EditPointView.vue`)) },
  { path: Route.Tasks, name: 'tasks', component: () => import((`@/pages/TasksView.vue`)) },
  { path: Route.Search, name: 'search_point', component: () => import((`@/pages/SearchPointView.vue`)) },
  { path: Route.Settings, name: 'settings', component: () => import((`@/pages/SettingsView.vue`)) },
]

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
})

const pinia = createPinia()

app.use(router)
app.use(pinia)
app.use(autoAnimatePlugin)
app.mount('#app')
