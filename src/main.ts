import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import { autoAnimatePlugin } from '@formkit/auto-animate/vue'

import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'

const app = createApp(App)

const routes = [
  { path: '/', name: 'home', redirect: '/points' },
  { path: '/points', name: 'points', component: () => import((`@/pages/PointsView.vue`)) },
  { path: '/points/add', name: 'add_point', component: () => import((`@/pages/AddPointView.vue`)) },
  { path: '/points/edit', name: 'edit_point', component: () => import((`@/pages/EditPointView.vue`)) },
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
