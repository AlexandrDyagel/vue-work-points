import { onBeforeUnmount, watch, type ComputedRef, type Ref } from 'vue'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'

/** Обработчик закрытия оверлея (bottom sheet, модальное окно, просмотрщик фото) */
type BackHandler = () => void

/** Что делать при «Назад», если открытых оверлеев нет */
export type BackTarget = 'history' | 'minimize'

/**
 * Стек открытых оверлеев: системная кнопка «Назад» закрывает верхний из них.
 * Состояние модульное — стек общий для всего приложения.
 */
const backHandlers: BackHandler[] = []

/** В истории браузера есть наша запись-перехватчик (нужна, чтобы «Назад» не уводил со страницы) */
let isGuardInHistory = false

/** Адрес, на котором была добавлена запись-перехватчик */
let guardUrl = ''

/** Пропустить ближайший popstate: он вызван нашим же history.back() */
let skipNextPopState = false

/** Обработчики popstate/Esc подключены */
let isWebReady = false

/** Подписка на hardware-кнопку «Назад» (Android) выполнена */
let isNativeReady = false

/**
 * Добавляем в историю лишнюю запись с текущим адресом.
 * Теперь системная кнопка «Назад» (Android) или жест/кнопка «Назад» в браузере
 * сначала выталкивает её, а не уводит на предыдущий маршрут.
 */
const pushBackGuard = () => {
  if (isGuardInHistory) return

  isGuardInHistory = true
  guardUrl = window.location.href
  // Состояние оставляем прежним: vue-router считает такую запись продолжением текущего маршрута
  window.history.pushState(window.history.state, '')
}

/** Убираем запись-перехватчик, когда открытых оверлеев больше нет */
const popBackGuard = () => {
  if (!isGuardInHistory) return

  isGuardInHistory = false

  // Маршрут уже сменился: запись уйдёт из истории вместе с ним,
  // а history.back() увёл бы пользователя ещё на шаг назад
  if (window.location.href !== guardUrl) return

  skipNextPopState = true
  window.history.back()
}

/**
 * Закрывает верхний оверлей. Обработчик снимает себя из стека сам
 * (watch внутри useBackDismiss), поэтому здесь только вызов close().
 * @returns false, если открытых оверлеев нет
 */
const closeTopOverlay = (): boolean => {
  const close = backHandlers[backHandlers.length - 1]
  if (!close) return false

  close()
  return true
}

/**
 * Выбор действия, когда открытых оверлеев нет:
 * - 'history' — уйти на предыдущий маршрут (или снять служебную запись-перехватчик);
 * - 'minimize' — свернуть приложение (пользователь уже на корневой странице).
 */
export const resolveBackTarget = (state: {
  /** WebView может уйти назад по своей истории */
  canGoBack: boolean
  /** У текущей записи истории есть предыдущий маршрут (vue-router) */
  hasRouterHistory: boolean
  /** В истории осталась служебная запись-перехватчик */
  hasGuard: boolean
}): BackTarget => (state.hasGuard || (state.canGoBack && state.hasRouterHistory) ? 'history' : 'minimize')

/** Системная кнопка «Назад»: закрываем верхний оверлей вместо ухода со страницы */
const onPopState = () => {
  if (skipNextPopState) {
    skipNextPopState = false
    return
  }

  // Запись-перехватчик вытолкнута, значит «Назад» нажали при открытом оверлее
  isGuardInHistory = false

  const close = backHandlers.pop()
  if (!close) return

  close()

  // Под закрытым оверлеем остался ещё один (например, подтверждение поверх шторки)
  if (backHandlers.length) pushBackGuard()
}

/**
 * Системная кнопка «Назад» на Android (нативная сборка Capacitor).
 * Приходит только от плагина App: пока открыт оверлей — закрываем его,
 * иначе уходим по истории маршрутов, а на корневой странице сворачиваем приложение.
 */
const onNativeBack = (event: { canGoBack: boolean }) => {
  // Оверлей перехватывает «Назад»: приложение при этом не сворачивается
  const close = backHandlers.pop()
  if (close) {
    close()
    return
  }

  const hasGuard = isGuardInHistory
  const target = resolveBackTarget({
    canGoBack: event.canGoBack,
    hasRouterHistory: Boolean(window.history.state?.back),
    hasGuard,
  })

  if (target === 'minimize') {
    void CapacitorApp.minimizeApp()
    return
  }

  // Убираем служебную запись, чтобы история вернулась в исходное состояние
  if (hasGuard) {
    skipNextPopState = true
    isGuardInHistory = false
  }

  window.history.back()
}

/** Escape на десктопе закрывает верхний оверлей — так же, как системная «Назад» */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (!closeTopOverlay()) return

  event.preventDefault()
}

export function useBackButton() {
  /** Оверлей открылся: системная «Назад» должна закрыть именно его */
  const registerBackHandler = (close: BackHandler) => {
    // Страховка на случай, если обработчики ещё не подключены из main.ts
    initBackButtonSupport()

    backHandlers.push(close)
    pushBackGuard()
  }

  /** Оверлей закрылся: обработчик больше не нужен */
  const unregisterBackHandler = (close: BackHandler) => {
    const index = backHandlers.lastIndexOf(close)
    if (index === -1) return

    backHandlers.splice(index, 1)
    if (backHandlers.length === 0) popBackGuard()
  }

  return {
    registerBackHandler,
    unregisterBackHandler,
  }
}

/**
 * Обработчик кнопки «Назад» в интерфейсе (например, нативная кнопка Telegram):
 * сначала закрывает открытый оверлей и только потом выполняет переход назад.
 */
export function createBackHandler(fallback: () => void): () => void {
  initBackButtonSupport()

  return () => {
    if (!closeTopOverlay()) fallback()
  }
}

/**
 * Пока `isOpen` === true, системная кнопка «Назад» на Android (и кнопка/жест
 * «Назад» в браузере) закрывает оверлей вместо ухода со страницы.
 */
export function useBackDismiss(isOpen: Ref<boolean> | ComputedRef<boolean>, close: BackHandler) {
  const { registerBackHandler, unregisterBackHandler } = useBackButton()

  // flush: 'sync' — закрытый оверлей должен снять обработчик сразу,
  // иначе он останется в стеке до следующего тика
  watch(
    isOpen,
    (open) => (open ? registerBackHandler(close) : unregisterBackHandler(close)),
    { immediate: true, flush: 'sync' },
  )

  onBeforeUnmount(() => unregisterBackHandler(close))
}

/**
 * Подключает обработчики системного «Назад»: popstate (браузер, Telegram)
 * и Esc. Идемпотентно — можно звать из main.ts и при первом открытии оверлея.
 */
export function initBackButtonSupport() {
  if (typeof window === 'undefined') return

  if (!isWebReady) {
    window.addEventListener('popstate', onPopState)
    // Esc нужен и на десктопе, и на Android с подключённой клавиатурой
    window.addEventListener('keydown', onKeydown)
    isWebReady = true
  }

  // Мост Capacitor может быть загружен ещё не полностью — тогда попробуем позже
  if (!isNativeReady && Capacitor.isNativePlatform()) {
    isNativeReady = true
    // Hardware «Назад» в нативной сборке (Android APK) перехватывает плагин App:
    // без него система завершает Activity (приложение «сворачивается»), а popstate не приходит
    void CapacitorApp.addListener('backButton', onNativeBack)
  }
}
