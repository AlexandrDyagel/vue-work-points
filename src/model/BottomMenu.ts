import type { BottomNavItem } from '@/model/BottomNavItem.ts'
import { type Ref, ref, shallowRef, type UnwrapRef } from 'vue'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import AddIcon from '@/components/icons/AddIcon.vue'
import HistoryIcon from '@/components/icons/HistoryIcon.vue'
import ProfileIcon from '@/components/icons/ProfileIcon.vue'
import { Routes as Route } from './Routes'

const bottomNavItems: Ref<UnwrapRef<BottomNavItem[]>> = ref([
  {
    name: 'Точки',
    route: Route.Points,
    isActive: true,
    icon: shallowRef(HomeIcon)
  },
  {
    name: 'Задания',
    route: Route.Tasks,
    isActive: false,
    icon: shallowRef(AddIcon)
  },
  {
    name: 'Карта',
    route: Route.Map,
    isActive: false,
    icon: shallowRef(HistoryIcon)
  },
  {
    name: 'Настройки',
    route: Route.Settings,
    isActive: false,
    icon: shallowRef(ProfileIcon)
  }
])

export { bottomNavItems }
