import type { Ref } from 'vue'

export interface BottomNavItem {
  readonly name: string
  readonly route: string
  isActive: boolean
  readonly icon: Ref
  /** На каких платформах показывать пункт меню. 'all' — везде (по умолчанию) */
  readonly platform?: 'telegram' | 'native' | 'all'
}
