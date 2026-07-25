import { Environment, LocalStorageNames, UserRole } from '@/model/Enums.ts'
import { useMiniApp } from 'vue-tg/8.0'
import { ENVIRONMENT } from '@/main.ts'
import { storage } from '@/utils/storage.ts'

/**
 * Хеш секретного пароля для активации админа на Android.
 * Значение вычисляется заранее: SHA-256 от секретного пароля.
 * Чтобы получить хеш для нового пароля, используй crypto.subtle.digest('SHA-256', new TextEncoder().encode('твой-пароль'))
 *    и преобразуй ArrayBuffer в hex-строку.
 *
 * Текущий хеш соответствует паролю «admin2024!».
 */
const ADMIN_SECRET_HASH = '0324af1d693e5f40984ec96b14b8efe2f38d3f003403dccbb55ecdbcba7e33f1'

export function useUserRole() {
  const getUserRole = async (): Promise<UserRole> => {
    const cachedUserRole = await storage.get<UserRole>(LocalStorageNames.USER_ROLE)

    if (cachedUserRole) {
      return cachedUserRole
    }

    // --- Telegram Mini Apps: проверяем userId ---
    const { initDataUnsafe } = useMiniApp()
    const userId = initDataUnsafe?.user?.id

    if (userId === 1229865421 || ENVIRONMENT === Environment.DEVELOPMENT) {
      await storage.set(LocalStorageNames.USER_ROLE, UserRole.ADMIN)
    } else {
      // --- Native (Android/Capacitor): проверяем флаг активации админа ---
      const isAdminDevice = await storage.get<boolean>(LocalStorageNames.ADMIN_DEVICE)
      if (isAdminDevice === true) {
        await storage.set(LocalStorageNames.USER_ROLE, UserRole.ADMIN)
      } else {
        await storage.set(LocalStorageNames.USER_ROLE, UserRole.USER)
      }
    }
    return (await storage.get<UserRole>(LocalStorageNames.USER_ROLE))!
  }

  /**
   * Активирует админ-режим на текущем устройстве, если передан правильный секретный пароль.
   * Возвращает true при успешной активации, false при неверном пароле.
   */
  const tryActivateAdmin = async (password: string): Promise<boolean> => {
    const encoder = new TextEncoder()
    const data = encoder.encode(password)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    if (hashHex === ADMIN_SECRET_HASH) {
      await storage.set(LocalStorageNames.ADMIN_DEVICE, true)
      await storage.set(LocalStorageNames.USER_ROLE, UserRole.ADMIN)
      return true
    }
    return false
  }

  /**
   * Деактивирует админ-режим на устройстве (сбрасывает флаг и удаляет кеш роли).
   */
  const deactivateAdmin = async (): Promise<void> => {
    await storage.remove(LocalStorageNames.ADMIN_DEVICE)
    await storage.remove(LocalStorageNames.USER_ROLE)
  }

  const clearUserRole = async () => storage.remove(LocalStorageNames.USER_ROLE)

  return {
    getUserRole,
    clearUserRole,
    tryActivateAdmin,
    deactivateAdmin,
  }
}
