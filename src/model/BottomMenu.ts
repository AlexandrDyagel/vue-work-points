import type { BottomNavItem } from '@/model/BottomNavItem.ts'
import { type Ref, ref, shallowRef, type UnwrapRef } from 'vue'
import ProfileIcon from '@/components/icons/ProfileIcon.vue'
import WhatsIsLocationIcon from '@/components/icons/WhatsIsLocationIcon.vue'
import { Routes as Route } from '@/model/Enums.ts'
import TaskIcon from '@/components/icons/TaskIcon.vue'
import ListIcon from '@/components/icons/ListIcon.vue'

const bottomNavItems: Ref<UnwrapRef<BottomNavItem[]>> = ref([
  {
    name: 'Точки',
    route: Route.Points,
    isActive: true,
    icon: shallowRef(ListIcon),
  },
  {
    name: 'Задания',
    route: Route.Tasks,
    isActive: false,
    icon: shallowRef(TaskIcon),
  },
  {
    name: 'Трекинг',
    route: Route.Search,
    isActive: false,
    icon: shallowRef(WhatsIsLocationIcon),
  },
  {
    name: 'Профиль',
    route: Route.Settings,
    isActive: false,
    icon: shallowRef(ProfileIcon),
  },
])

export { bottomNavItems }
