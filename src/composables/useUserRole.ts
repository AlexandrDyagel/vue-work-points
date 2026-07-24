import { Environment, LocalStorageNames, UserRole } from '@/model/Enums.ts'
import { useMiniApp } from 'vue-tg/8.0'
import { ENVIRONMENT } from '@/main.ts'
import { storage } from '@/utils/storage.ts'

export function useUserRole() {
  const getUserRole = async (): Promise<UserRole> => {
    const cachedUserRole = await storage.get<UserRole>(LocalStorageNames.USER_ROLE)
    const { initDataUnsafe } = useMiniApp()
    const userId = initDataUnsafe?.user?.id

    if (cachedUserRole) {
      return cachedUserRole
    } else {
      if (userId === 1229865421 || ENVIRONMENT === Environment.DEVELOPMENT) {
        await storage.set(LocalStorageNames.USER_ROLE, UserRole.ADMIN)
      } else {
        await storage.set(LocalStorageNames.USER_ROLE, UserRole.USER)
      }
      return (await storage.get<UserRole>(LocalStorageNames.USER_ROLE))!
    }
  }

  const clearUserRole = async () => storage.remove(LocalStorageNames.USER_ROLE)

  return {
    getUserRole,
    clearUserRole,
  }
}
