import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { Environment, Routes as Route } from '@/model/Enums.ts'

export const DEV_VERSION = '2.62'
// export const ENVIRONMENT = Environment.PRODUCTION
export const ENVIRONMENT = Environment.DEVELOPMENT

const app = createApp(App)

const routes = [
  { path: Route.Home, name: 'home', redirect: Route.Points },
  { path: Route.Points, name: 'points', component: () => import(`@/pages/PointsView.vue`) },
  { path: Route.AddPoint, name: 'add_point', component: () => import(`@/pages/AddPointView.vue`) },
  {
    path: Route.EditPoint,
    name: 'edit_point',
    component: () => import(`@/pages/EditPointView.vue`),
  },
  { path: Route.Tasks, name: 'tasks', component: () => import(`@/pages/TasksView.vue`) },
  { path: Route.TaskMap, name: 'tasks_map', component: () => import(`@/pages/TaskMapView.vue`) },
  {
    path: Route.Search,
    name: 'search_point',
    component: () => import(`@/pages/SearchPointView.vue`),
  },
  { path: Route.Settings, name: 'settings', component: () => import(`@/pages/DigittoedView.vue`) },
  { path: Route.TgSettingApp, name: 'tg_settings_app', component: () => import(`@/pages/TgSettingsAppView.vue`) },
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
