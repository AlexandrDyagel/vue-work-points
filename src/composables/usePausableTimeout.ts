import { onScopeDispose, watch, type ComputedRef, type Ref } from 'vue'

/** Что делать, когда время вышло */
type ExpireHandler = () => void

/**
 * Обратный отсчёт, который можно поставить на паузу. Пока `isPaused` === true,
 * время не течёт: после снятия паузы отсчёт продолжается с сохранённого остатка,
 * а не начинается заново.
 *
 * Нужен для коротких окон возможностей (например, снакбар отмены удаления),
 * которые на время перекрывает модальное окно: под окном кнопка всё равно
 * недоступна, поэтому время такой возможности не должно сгорать.
 */
export function usePausableTimeout(
  isPaused: Ref<boolean> | ComputedRef<boolean>,
  onExpire: ExpireHandler,
) {
  /** Текущий таймер (null — отсчёт стоит) */
  let timer: ReturnType<typeof setTimeout> | null = null
  /** Сколько времени осталось, мс */
  let remaining = 0
  /** Когда начался текущий отсчёт: нужен, чтобы вычесть прошедшее время при паузе */
  let startedAt = 0

  /** Запускает отсчёт на остаток времени */
  const run = () => {
    startedAt = Date.now()
    timer = setTimeout(() => {
      timer = null
      remaining = 0
      onExpire()
    }, remaining)
  }

  /** Ставит отсчёт на паузу, сохраняя остаток времени */
  const pause = () => {
    if (!timer) return

    clearTimeout(timer)
    timer = null
    remaining = Math.max(0, remaining - (Date.now() - startedAt))
  }

  /** Продолжает отсчёт с сохранённого остатка (если он был запущен и ещё не истёк) */
  const resume = () => {
    if (timer || remaining <= 0) return

    run()
  }

  /** Останавливает отсчёт и забывает остаток: окно возможности закрыто */
  const cancel = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    remaining = 0
  }

  /** Начинает отсчёт заново на `durationMs` (под паузой ждёт её снятия) */
  const start = (durationMs: number) => {
    cancel()
    remaining = durationMs

    // Перекрытая кнопка недоступна: отсчёт стартует сразу после снятия паузы
    if (!isPaused.value) run()
  }

  // Пауза и продолжение — по внешнему условию (например, открылось модальное окно)
  watch(isPaused, (paused) => (paused ? pause() : resume()))

  // Компонент (или внешний scope) закрылся — незачем держать таймер живым
  onScopeDispose(cancel)

  return { start, pause, resume, cancel }
}
