import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { useHapticFeedback } from 'vue-tg/8.0'
import { usePlatform } from '@/composables/usePlatform.ts'

/** Сила отклика при нажатии: одинаковые значения у Capacitor Haptics и Telegram WebApp */
export type HapticImpact = 'light' | 'medium' | 'heavy'

/** Соответствие силы отклика нативной шкале Android/iOS */
const NATIVE_IMPACT_STYLE: Record<HapticImpact, ImpactStyle> = {
  light: ImpactStyle.Light,
  medium: ImpactStyle.Medium,
  heavy: ImpactStyle.Heavy,
}

/**
 * Тактильный отклик интерфейса (вибрация на нажатия и важные события).
 *
 * Платформы:
 *  - native (Android/iOS, Capacitor) — плагин @capacitor/haptics: вибромотор устройства;
 *  - telegram (Mini App) — HapticFeedback из Telegram WebApp через vue-tg;
 *  - web — отклика нет: вибрация поддерживается не везде и мешает на десктопе.
 *
 * Методы безопасны к вызову в любой момент: если вибрация на платформе недоступна,
 * вызов молча игнорируется и никогда не ломает сценарий нажатия.
 * Вызывать композабл нужно внутри setup (так же, как остальные хуки vue-tg).
 */
export function useHaptics() {
  const { isNative, isTelegram } = usePlatform()
  const native = isNative()
  const inTelegram = !native && isTelegram()
  // Хук vue-tg бросает исключение вне Telegram, поэтому создаём его только внутри Mini App
  const telegramHaptics = inTelegram ? useHapticFeedback() : null

  /** Отказ плагина не должен превращаться в необработанное исключение в консоли */
  const silent = (pluginCall: Promise<void>): void => {
    void pluginCall.catch(() => undefined)
  }

  /** Лёгкий отклик на нажатие: главная кнопка, карточка, пункт меню */
  const tap = (impact: HapticImpact = 'light'): void => {
    if (native) {
      silent(Haptics.impact({ style: NATIVE_IMPACT_STYLE[impact] }))
      return
    }
    telegramHaptics?.impactOccurred(impact)
  }

  /** Успешное действие: точка добавлена, задание сохранено, удаление отменено */
  const success = (): void => {
    if (native) {
      silent(Haptics.notification({ type: NotificationType.Success }))
      return
    }
    telegramHaptics?.notificationOccurred('success')
  }

  /** Предупреждение: удаление или другое действие с подтверждением */
  const warning = (): void => {
    if (native) {
      silent(Haptics.notification({ type: NotificationType.Warning }))
      return
    }
    telegramHaptics?.notificationOccurred('warning')
  }

  /** Ошибка: действие выполнить не удалось */
  const error = (): void => {
    if (native) {
      silent(Haptics.notification({ type: NotificationType.Error }))
      return
    }
    telegramHaptics?.notificationOccurred('error')
  }

  /** Смена выбора: переключатель, сортировка, выбор фильтра */
  const selection = (): void => {
    if (native) {
      silent(Haptics.selectionChanged())
      return
    }
    telegramHaptics?.selectionChanged()
  }

  return {
    tap,
    success,
    warning,
    error,
    selection,
  }
}
