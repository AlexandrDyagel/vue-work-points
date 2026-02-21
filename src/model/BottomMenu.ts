import type { BottomNavItem } from '@/model/BottomNavItem.ts'
import { type Ref, ref, shallowRef, type UnwrapRef } from 'vue'
import ProfileIcon from '@/components/icons/ProfileIcon.vue'
import WhatsIsLocationIcon from '@/components/icons/WhatsIsLocationIcon.vue'
import { NavItemName, Routes as Route } from '@/model/Enums.ts'
import TaskIcon from '@/components/icons/TaskIcon.vue'
import ListIcon from '@/components/icons/ListIcon.vue'

const bottomNavItems: Ref<UnwrapRef<BottomNavItem[]>> = ref([
  {
    name: NavItemName.Points,
    route: Route.Points,
    isActive: true,
    icon: shallowRef(ListIcon),
  },
  {
    name: NavItemName.Tasks,
    route: Route.Tasks,
    isActive: false,
    icon: shallowRef(TaskIcon),
  },
  {
    name: NavItemName.Tracking,
    route: Route.Tracking,
    isActive: false,
    icon: shallowRef(WhatsIsLocationIcon),
  },
  {
    name: NavItemName.Profile,
    route: Route.Settings,
    isActive: false,
    icon: shallowRef(ProfileIcon),
  },
])

export { bottomNavItems }
