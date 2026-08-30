import { Capacitor } from '@capacitor/core'

/**
 * Определяет платформу запуска приложения:
 *  - telegram: Telegram Mini App (встроенный браузер Telegram)
 *  - native: нативное Capacitor-приложение (Android/iOS)
 *  - web: обычный браузер (десктоп, PWA и т.п.)
 */
export function usePlatform() {
  /**
   * Определяем платформу
   */
  const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

  const isNative = (): boolean => {
    if (Capacitor.isNativePlatform()) {
      console.log(`Запущено на нативной платформе: ${platform}`)
      return true
    }
    console.log('Запущено в обычном веб-браузере')
    return false
  }

  /**
   * Проверяет, запущено ли приложение внутри Telegram Mini App.
   * Telegram WebApp устанавливает window.Telegram.WebApp.
   */
  const isTelegram = (): boolean => {
    if (typeof window === 'undefined') return false

    const telegram = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
    return Boolean(telegram?.WebApp?.initData)
  }

  return {
    isNative,
    isTelegram,
  }
}
