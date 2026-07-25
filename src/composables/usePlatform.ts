/**
 * Определяет платформу запуска приложения:
 *  - telegram: Telegram Mini App (встроенный браузер Telegram)
 *  - native: нативное Capacitor-приложение (Android/iOS)
 *  - web: обычный браузер (десктоп, PWA и т.п.)
 */
export function usePlatform() {
  const isNative = (): boolean => {
    return typeof (window as any)?.Capacitor !== 'undefined'
  }

  /**
   * Проверяет, запущено ли приложение внутри Telegram Mini App.
   * Telegram WebApp устанавливает window.Telegram.WebApp.
   */
  const isTelegram = (): boolean => {
    return typeof (window as any)?.Telegram?.WebApp !== 'undefined'
  }

  return {
    isNative,
    isTelegram,
  }
}
