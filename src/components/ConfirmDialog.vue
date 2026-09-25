<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useBackDismiss } from '@/composables/useBackButton.ts'
import { registerModalLayer } from '@/composables/useModalLayer.ts'

/**
 * Единое окно подтверждения действия: удаление задания/фотографии,
 * выход из редактора заметки с несохранёнными изменениями.
 *
 * Состоянием окна владеет родитель (проп `open`), компонент только сообщает
 * событиями `confirm` / `cancel`, что выбрал пользователь.
 *
 * Закрытие работает на всех платформах: клик по фону, Esc на десктопе
 * и системная кнопка «Назад» на Android закрывают окно, не уводя со страницы
 * (через общий стек оверлеев в useBackButton). Фокус зациклен внутри окна.
 *
 * Пока окно открыто, оно сообщает об этом в useModalLayer: «мягкие» оверлеи
 * (снакбар отмены, короткие сообщения) уступают ему место и не перекрывают кнопки.
 */
const props = withDefaults(
  defineProps<{
    /** Окно открыто */
    open: boolean
    /** Вопрос в заголовке */
    title: string
    /** Пояснение: имя удаляемого объекта, предупреждение и т.п. */
    message?: string
    /** Текст кнопки подтверждения */
    confirmLabel?: string
    /** Текст кнопки отмены */
    cancelLabel?: string
    /** Красная кнопка (удаление) или акцентная (например, сохранение) */
    tone?: 'danger' | 'primary'
  }>(),
  {
    message: '',
    confirmLabel: 'Удалить',
    cancelLabel: 'Отмена',
    tone: 'danger',
  },
)

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

/** Уникальный суффикс id: на странице может быть несколько карточек с окнами */
const uid = getCurrentInstance()?.uid ?? 0
const titleId = `confirm-dialog-title-${uid}`
const messageId = `confirm-dialog-message-${uid}`

const dialogRef = ref<HTMLElement | null>(null)
const cancelButtonRef = ref<HTMLButtonElement | null>(null)

/** Элемент, на который вернём фокус после закрытия окна */
let lastFocusedElement: HTMLElement | null = null

/** Отзыв регистрации модального слоя: снимается при закрытии окна и при размонтировании */
let unregisterModalLayer: (() => void) | null = null

/** Цвет кнопки подтверждения: удаление — красный, остальное — акцентный */
const confirmButtonClass = computed(() =>
  props.tone === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#3d7eff] hover:bg-blue-600',
)

const onCancel = () => emit('cancel')
const onConfirm = () => emit('confirm')

// Клик по фону, Esc и системная «Назад» отменяют действие
useBackDismiss(
  computed(() => props.open),
  onCancel,
)

/** Элементы, доступные для фокуса внутри окна */
const focusableElements = (): HTMLElement[] =>
  Array.from(
    dialogRef.value?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? [],
  )

/** Tab и Shift+Tab ходят по кругу: фокус не уходит на страницу под окном */
const onKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Tab') return

  const elements = focusableElements()
  const first = elements[0]
  const last = elements[elements.length - 1]
  if (!first || !last) return

  const active = document.activeElement
  if (!active || !dialogRef.value?.contains(active)) {
    event.preventDefault()
    first.focus()
    return
  }

  if (event.shiftKey && active === first) {
    event.preventDefault()
    last.focus()
    return
  }
  if (!event.shiftKey && active === last) {
    event.preventDefault()
    first.focus()
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      unregisterModalLayer?.()
      unregisterModalLayer = null

      // Возвращаем фокус туда, откуда окно открыли
      const target = lastFocusedElement
      lastFocusedElement = null
      if (target?.isConnected) target.focus()
      return
    }

    // Окно модальное: «мягкие» оверлеи на время его показа скрываются
    unregisterModalLayer = registerModalLayer()

    lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null

    await nextTick()
    // Фокус на «Отмене»: случайное подтверждение удаления исключено
    cancelButtonRef.value?.focus()
  },
  { immediate: true },
)

// Компонент закрывается вместе со страницей (или карточкой) — снимаем регистрацию,
// иначе счётчик модальных окон останется больше нуля и снакбары будут скрыты всегда
onBeforeUnmount(() => {
  unregisterModalLayer?.()
  unregisterModalLayer = null
})
</script>

<template>
  <Teleport to="body">
    <!-- Затемнение: выше просмотрщика фото (z-[9999]) и снакбаров, но ниже самого окна -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="fixed inset-0 z-[10001] bg-black/60"
        aria-hidden="true"
        @click="onCancel"
      ></div>
    </Transition>

    <!-- Окно подтверждения -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      leave-active-class="transition duration-150 ease-in"
      leave-to-class="opacity-0 scale-95"
    >
      <div
        v-if="open"
        ref="dialogRef"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        :aria-describedby="message ? messageId : undefined"
        class="fixed left-1/2 top-1/2 z-[10002] w-[90%] max-w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#333] bg-[#1e1e21] p-6 shadow-2xl"
        @keydown="onKeydown"
      >
        <h2 :id="titleId" class="mb-2 text-center text-lg font-bold text-white">{{ title }}</h2>

        <p
          v-if="message"
          :id="messageId"
          class="mb-5 text-center text-sm break-words text-gray-400"
        >
          {{ message }}
        </p>

        <button
          type="button"
          class="mb-2 w-full min-h-11 rounded-xl px-4 py-2.5 font-medium text-white transition-colors cursor-pointer"
          :class="confirmButtonClass"
          @click="onConfirm"
        >
          {{ confirmLabel }}
        </button>

        <button
          ref="cancelButtonRef"
          type="button"
          class="w-full min-h-11 rounded-xl px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white cursor-pointer"
          @click="onCancel"
        >
          {{ cancelLabel }}
        </button>
      </div>
    </Transition>
  </Teleport>
</template>
