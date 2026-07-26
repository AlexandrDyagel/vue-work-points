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
  const osPlatform = navigator.userAgentData?.platform || navigator.platform

  const isNative = (): boolean => {
    return osPlatform !== 'Android' && osPlatform !== 'iOS'
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
