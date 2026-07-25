import type { BottomNavItem } from '@/model/BottomNavItem.ts'
import { type Ref, ref, shallowRef, type UnwrapRef } from 'vue'
import MapIcon from '@/components/icons/MapIcon.vue'
import WhatsIsLocationIcon from '@/components/icons/WhatsIsLocationIcon.vue'
import { NavItemName, Routes as Route } from '@/model/Enums.ts'
import TaskIcon from '@/components/icons/TaskIcon.vue'
import ListIcon from '@/components/icons/ListIcon.vue'
import SettingsIcon from '@/components/icons/SettingsIcon.vue'

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
    name: NavItemName.Map,
    route: Route.Map,
    isActive: false,
    icon: shallowRef(MapIcon),
  },
  {
    name: 'Настройки',
    route: Route.TgSettingApp,
    isActive: false,
    icon: shallowRef(SettingsIcon),
    platform: 'native',
  },
])

export { bottomNavItems }
