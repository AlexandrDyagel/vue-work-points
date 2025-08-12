import type { BottomNavItem } from '@/model/BottomNavItem.ts'
import { type Ref, ref, shallowRef, type UnwrapRef } from 'vue'
import HomeIcon from '@/components/icons/HomeIcon.vue'
import AddIcon from '@/components/icons/AddIcon.vue'
import HistoryIcon from '@/components/icons/HistoryIcon.vue'
import ProfileIcon from '@/components/icons/ProfileIcon.vue'
import SearchIcon from '@/components/icons/SearchIcon.vue'
import { Routes as Route } from '@/model/Enums.ts'

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
    name: 'Определить',
    route: Route.Search,
    isActive: false,
    icon: shallowRef(SearchIcon)
  },
  {
    name: 'Настройки',
    route: Route.Settings,
    isActive: false,
    icon: shallowRef(ProfileIcon)
  }
])

export { bottomNavItems }
