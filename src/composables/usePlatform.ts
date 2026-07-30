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
    } else {
      if (platform === 'android' || platform == 'ios') return false
      console.log('Запущено в обычном веб-браузере')
      const osPlatform = navigator?.userAgentData.platform
      if (osPlatform === 'Android' || osPlatform === 'iOS') return false
      return true
    }
  }

  /**
   * Проверяет, запущено ли приложение внутри Telegram Mini App.
   * Telegram WebApp устанавливает window.Telegram.WebApp.
   */
  const isTelegram = (): boolean => {
    return osPlatform === 'Android' && osPlatform === 'iOS'
  }

  return {
    isNative,
    isTelegram,
  }
}
