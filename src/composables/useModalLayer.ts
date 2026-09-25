import { computed, ref } from 'vue'

/**
 * Сколько модальных окон (ConfirmDialog) сейчас открыто. Состояние модульное —
 * счётчик общий для всего приложения, как и стек оверлеев в useBackButton.
 */
const openModalCount = ref(0)

/**
 * Открыто ли модальное окно. Пока оно на экране, «мягкие» оверлеи (снакбар
 * отмены удаления, короткие сообщения) уступают ему место: на низких экранах
 * они всё равно недоступны для нажатия, а поверх окна перекрывали бы кнопки.
 */
export const isModalOpen = computed(() => openModalCount.value > 0)

/**
 * Регистрирует открытое модальное окно и возвращает функцию отзыва регистрации.
 * Повторный вызов возвращённой функции ничего не делает — счётчик не «утечёт».
 */
export const registerModalLayer = (): (() => void) => {
  openModalCount.value += 1
  let isRegistered = true

  return () => {
    if (!isRegistered) return

    isRegistered = false
    openModalCount.value = Math.max(0, openModalCount.value - 1)
  }
}
