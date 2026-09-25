<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ChevronUpIcon, EllipsisVerticalIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'
import { useHaptics } from '@/composables/useHaptics.ts'

/**
 * Панель действий задания: столбик кнопок в правом верхнем углу карточки.
 *
 * Развёрнута по умолчанию — фото, заметка, «выполнено» и удаление видны сразу.
 * Кнопка-триггер сворачивает столбик до одной кнопки и разворачивает обратно.
 * В компактном виде карточки панель показывается свёрнутой и раскрывается
 * обратно вместе с возвратом к обычному виду.
 *
 * Анимация: высота панели меняется через grid-template-rows (0fr → 1fr), поэтому
 * карточка плавно меняет высоту без рывка и без измерения высоты в JS; кнопки
 * внутри появляются и уходят поочерёдно (transition-delay): при раскрытии —
 * сверху вниз, при сворачивании — в обратном порядке, как будто столбик
 * складывается в триггер. Иконки триггера меняются крест-накрест.
 *
 * Свёрнутая панель убирается из обхода клавиатурой (tabindex="-1" и aria-hidden),
 * иначе Tab попадал бы в невидимые кнопки.
 *
 * Компонент ничего не меняет сам: он только сообщает о нажатиях (emit),
 * состоянием задания управляет карточка (ItemTaskView).
 */
const props = defineProps<{
  /** Идентификатор задания: связывает триггер и панель (aria-controls) */
  taskUid: string
  /** Задание выполнено */
  isCompleted?: boolean
  /** У задания есть заметка */
  hasNote?: boolean
  /** Сколько фотографий прикреплено к заданию */
  photoCount?: number
  /** Компактный вид карточки: панель свёрнута, пока её не раскроют вручную */
  compact?: boolean
}>()

const emit = defineEmits<{
  openPhotos: []
  openNote: []
  toggleCompleted: []
  delete: []
}>()

const { tap } = useHaptics()

/**
 * В обычном виде панель развёрнута, в компактном — свёрнута,
 * чтобы короткие строки списка не растягивались в высоту.
 */
const isOpen = ref(!props.compact)

/** Смена вида карточек управляет панелью: компактный вид сворачивает её, обычный — раскрывает */
watch(
  () => props.compact,
  (compact) => {
    isOpen.value = !compact
  },
)

/** Корень панели: карточка проверяет по нему клики, чтобы не закрывать редактор заметки */
const root = ref<HTMLElement | null>(null)

const panelId = computed(() => `task-actions-${props.taskUid}`)

/** Сколько кнопок в панели — нужно для расчёта поочерёдного появления */
const ACTION_COUNT = 4

/** Шаг задержки анимации между кнопками */
const STAGGER_STEP = 40

/** Задержка анимации кнопки: раскрытие — сверху вниз, сворачивание — в обратном порядке */
const stagger = (index: number): string => {
  const delay = isOpen.value ? index * STAGGER_STEP : (ACTION_COUNT - index - 1) * STAGGER_STEP
  return `${delay}ms`
}

/** Общий вид кнопки действия: у всех четырёх одинаковая анимация и состояния нажатия */
const actionClass =
  'h-11 w-11 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300 ease-out active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] motion-reduce:transition-none'

/** Появление и уход кнопок столбика */
const actionMotionClass = computed(() =>
  isOpen.value ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-1.5 scale-90',
)

/** Кнопки свёрнутой панели не должны попадать в обход клавиатурой */
const actionTabIndex = computed(() => (isOpen.value ? undefined : -1))

const toggle = () => {
  tap()
  isOpen.value = !isOpen.value
}

const onOpenPhotos = () => {
  tap()
  emit('openPhotos')
}

const onOpenNote = () => {
  tap()
  emit('openNote')
}

const onToggleCompleted = () => {
  tap()
  emit('toggleCompleted')
}

const onDelete = () => {
  tap('medium')
  emit('delete')
}

defineExpose({ root })
</script>

<template>
  <div ref="root" class="flex flex-col items-center gap-1">
    <!-- Триггер: в развёрнутом виде сворачивает столбик, в свёрнутом — раскрывает -->
    <button
      type="button"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      :aria-label="isOpen ? 'Свернуть действия задания' : 'Действия с заданием'"
      class="relative h-11 w-11 flex items-center justify-center rounded-xl border border-white/5 text-[#c9c9d1] cursor-pointer transition-all duration-300 ease-out active:scale-95 active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3d7eff] motion-reduce:transition-none"
      :class="isOpen ? 'bg-white/5' : 'bg-white/10'"
      @click="toggle"
    >
      <!-- Иконки меняются крест-накрест: «⋯» — свёрнуто, «стрелка вверх» — развёрнуто -->
      <span class="relative h-5 w-5">
        <EllipsisVerticalIcon
          class="absolute inset-0 h-5 w-5 transition-all duration-300 ease-out motion-reduce:transition-none"
          :class="isOpen ? 'opacity-0 scale-50 rotate-90' : 'opacity-100 scale-100 rotate-0'"
        />
        <ChevronUpIcon
          class="absolute inset-0 h-5 w-5 transition-all duration-300 ease-out motion-reduce:transition-none"
          :class="isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-50'"
        />
      </span>

      <!-- Количество фото видно и в свёрнутом виде, когда кнопка фото скрыта -->
      <span
        v-if="!isOpen && photoCount"
        class="absolute -top-1 -end-1 min-w-[14px] px-1 rounded-full bg-[#3d7eff] text-white text-[9px] font-bold leading-[14px] text-center"
      >
        {{ photoCount }}
      </span>
    </button>

    <!-- Столбик действий: высота панели анимируется, кнопки появляются поочерёдно -->
    <div
      :id="panelId"
      class="grid w-full transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none"
      :class="isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'"
      :aria-hidden="!isOpen"
    >
      <div class="min-h-0 overflow-hidden flex flex-col items-center gap-0.5">
        <!-- Фотографии задания -->
        <button
          type="button"
          class="relative"
          :class="[
            actionClass,
            actionMotionClass,
            photoCount ? 'text-[#3d7eff]' : 'text-[#61646b]',
          ]"
          :style="{ transitionDelay: stagger(0) }"
          :tabindex="actionTabIndex"
          :aria-label="`Фотографии задания: ${photoCount}`"
          @click="onOpenPhotos"
        >
          <PhotoIcon class="h-5 w-5" />
          <span
            v-if="photoCount"
            class="absolute top-0.5 end-0.5 min-w-[14px] px-1 rounded-full bg-[#3d7eff] text-white text-[9px] font-bold leading-[14px] text-center"
          >
            {{ photoCount }}
          </span>
        </button>

        <!-- Заметка задания -->
        <button
          type="button"
          :class="[actionClass, actionMotionClass, hasNote ? 'text-[#3d7eff]' : 'text-[#61646b]']"
          :style="{ transitionDelay: stagger(1) }"
          :tabindex="actionTabIndex"
          :aria-label="hasNote ? 'Редактировать заметку' : 'Добавить заметку'"
          @click="onOpenNote"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 -960 960 960"
            fill="currentColor"
          >
            <path
              d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm360-520v-200H200v560h560v-360H560Zm-280 400h400v-80H280v80Zm0-160h400v-80H280v80Zm-80-320v560-560Z"
            />
          </svg>
        </button>

        <!-- Отметка «выполнено» -->
        <button
          type="button"
          :class="[
            actionClass,
            actionMotionClass,
            isCompleted ? 'text-[#5fb336]' : 'text-[#61646b]',
          ]"
          :style="{ transitionDelay: stagger(2) }"
          :tabindex="actionTabIndex"
          :aria-label="isCompleted ? 'Снять отметку «выполнено»' : 'Отметить задание выполненным'"
          @click="onToggleCompleted"
        >
          <CheckCircleIcon />
        </button>

        <!-- Удаление задания -->
        <button
          type="button"
          :class="[actionClass, actionMotionClass, 'text-red-400']"
          :style="{ transitionDelay: stagger(3) }"
          :tabindex="actionTabIndex"
          aria-label="Удалить задание"
          @click="onDelete"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            viewBox="0 -960 960 960"
            fill="currentColor"
          >
            <path
              d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"
            />
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>
