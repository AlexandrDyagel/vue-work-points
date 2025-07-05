import { LocalStorageNames, UserRole } from '@/model/Enums.ts'
import { useMiniApp } from 'vue-tg/8.0'
import { DEVELOPMENT } from '@/main.ts'

export function useUserRole() {

  const getUserRole = (): UserRole => {
    const cachedUserRole = localStorage.getItem(LocalStorageNames.USER_ROLE)
    const { initDataUnsafe } = useMiniApp()
    const userId = initDataUnsafe?.user?.id

    if (cachedUserRole) {
      return JSON.parse(cachedUserRole) as UserRole
    } else {
      if (userId === 1229865421 || DEVELOPMENT) {
        localStorage.setItem(LocalStorageNames.USER_ROLE, JSON.stringify(UserRole.ADMIN))
      } else {
        localStorage.setItem(LocalStorageNames.USER_ROLE, JSON.stringify(UserRole.USER))
      }
      return JSON.parse(localStorage.getItem(LocalStorageNames.USER_ROLE)!) as UserRole
    }
  }

  const clearUserRole = () => localStorage.removeItem(LocalStorageNames.USER_ROLE)

  return {
    getUserRole,
    clearUserRole
  }
}
