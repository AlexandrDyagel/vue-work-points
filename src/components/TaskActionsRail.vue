<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ChevronUpIcon, EllipsisVerticalIcon, PhotoIcon } from '@heroicons/vue/24/outline'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'
import ShareIcon from '@/components/icons/ShareIcon.vue'
import { useHaptics } from '@/composables/useHaptics.ts'

/**
 * Панель действий задания: столбик кнопок в правом верхнем углу карточки.
 *
 * Развёрнута по умолчанию — фото, заметка, отправка, «выполнено» и удаление видны сразу.
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
 * Высоту карточки задаёт только её содержимое: панель вынесена из потока
 * (absolute, см. ItemTaskView) и получает max-height по высоте карточки.
 * Поэтому, когда столбик выше карточки, нижние кнопки скрываются за её краем,
 * а прокручивается сама панель (overflow-y-auto). Кнопки столбика не сжимаются
 * (shrink-0 в actionClass): иначе флексбокс ужимал бы их до высоты иконок,
 * столбик всегда «влезал» бы в панель — прокрутки не было бы, а расстояние
 * между иконками зависело бы от высоты карточки. Триггер тоже не сжимается
 * и всегда закреплён сверху; полоса прокрутки спрятана, чтобы не сужать иконки.
 *
 * О том, что столбик прокручивается, сообщает растушёвка нижнего края панели: пока
 * под видимой областью остались кнопки, низ панели растворяется в фоне карточки
 * (mask-image, см. panelMaskClass). Прокрутили столбик до конца — растушёвка уходит.
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
  share: []
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

/** Панель со столбиком кнопок: она же контейнер прокрутки */
const panel = ref<HTMLElement | null>(null)

/** Под видимым краем панели остались кнопки — растушёвываем низ */
const hasMoreBelow = ref(false)

/**
 * Запас при сравнении прокрутки: clientHeight и scrollHeight браузер округляет
 * до целых, а scrollTop может быть дробным (высоты кнопок и иконок кратны 4 px,
 * но DPR у телефонов нецелый).
 */
const SCROLL_EDGE_EPSILON = 1.5

/** Пересчёт растушёвки: она нужна только у раскрытой панели, прокрученной не до конца */
const updateOverflowHint = () => {
  const el = panel.value
  if (!el || !isOpen.value) {
    hasMoreBelow.value = false
    return
  }
  hasMoreBelow.value = el.scrollHeight - el.scrollTop - el.clientHeight > SCROLL_EDGE_EPSILON
}

/**
 * Маска панели: когда внизу есть ещё кнопки — нижние 20 px растворяются в фоне карточки.
 *
 * Это mask-image, а не градиент-накладка поверх панели: маска не зависит от цвета фона
 * (карточка бывает подсвечена после перехода к заданию или затемнена поверх «Выполнено»)
 * и остаётся приклеенной к нижнему краю панели, а не к её содержимому. В обоих состояниях
 * градиент одной структуры, поэтому растушёвка появляется и уходит через transition.
 */
const panelMaskClass = computed(() =>
  hasMoreBelow.value
    ? 'mask-[linear-gradient(to_bottom,black_calc(100%_-_20px),transparent)]'
    : 'mask-[linear-gradient(to_bottom,black_100%,transparent)]',
)

/** Панель растягивается по высоте карточки, поэтому следим за изменением её размеров */
let panelSizeObserver: ResizeObserver | undefined

onMounted(() => {
  updateOverflowHint()
  if (panel.value && typeof ResizeObserver !== 'undefined') {
    panelSizeObserver = new ResizeObserver(updateOverflowHint)
    panelSizeObserver.observe(panel.value)
  }
})

onBeforeUnmount(() => {
  panelSizeObserver?.disconnect()
  panelSizeObserver = undefined
})

/** Раскрытие и сворачивание меняют высоту панели: пересчитываем растушёвку после отрисовки */
watch(isOpen, async () => {
  await nextTick()
  updateOverflowHint()
})

/** Сколько кнопок в панели — нужно для расчёта поочерёдного появления */
const ACTION_COUNT = 5

/** Шаг задержки анимации между кнопками */
const STAGGER_STEP = 40

/** Задержка анимации кнопки: раскрытие — сверху вниз, сворачивание — в обратном порядке */
const stagger = (index: number): string => {
  const delay = isOpen.value ? index * STAGGER_STEP : (ACTION_COUNT - index - 1) * STAGGER_STEP
  return `${delay}ms`
}

/** Общий вид кнопки действия: у всех кнопок одинаковая анимация и состояния нажатия.
 *  shrink-0 обязателен: в столбике-флексе кнопка иначе сжимается по высоте до иконки,
 *  и тогда вместо прокрутки столбик просто ужимается (см. комментарий компонента). */
const actionClass =
  'h-11 w-11 shrink-0 flex items-center justify-center rounded-xl cursor-pointer transition-all duration-300 ease-out active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] motion-reduce:transition-none'

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

/** Отправка фотографий задания в мессенджеры: кнопка активнее, когда снимки есть */
const onShare = () => {
  tap()
  emit('share')
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
      class="relative h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-white/5 text-[#c9c9d1] cursor-pointer transition-all duration-300 ease-out active:scale-95 active:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#3d7eff] motion-reduce:transition-none"
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

    <!--
      Столбик действий: высота панели анимируется, кнопки появляются поочерёдно.
      Прокручивается сама панель: кнопки не сжимаются по высоте, поэтому столбик
      выше панели на короткой карточке — лишние кнопки обрезаются, а прокрутка
      открывает их; полоса прокрутки скрыта, чтобы не отнимать ширину у иконок (44 px).
      Пока под нижним краем остались кнопки, край растушёвывается (panelMaskClass):
      видно, что столбик продолжается и его можно прокрутить.
    -->
    <div
      :id="panelId"
      ref="panel"
      class="grid w-full min-h-0 transition-[grid-template-rows,mask-image] duration-300 ease-out motion-reduce:transition-none"
      :class="[
        isOpen
          ? 'grid-rows-[1fr] overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'
          : 'grid-rows-[0fr] overflow-hidden',
        panelMaskClass,
      ]"
      :aria-hidden="!isOpen"
      @scroll.passive="updateOverflowHint"
    >
      <div class="min-h-0 flex flex-col items-center gap-0.5">
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

        <!-- Отправка фотографий задания в мессенджеры -->
        <button
          type="button"
          :class="[
            actionClass,
            actionMotionClass,
            photoCount ? 'text-[#3d7eff]' : 'text-[#61646b]',
          ]"
          :style="{ transitionDelay: stagger(2) }"
          :tabindex="actionTabIndex"
          aria-label="Отправить фотографии задания в мессенджеры"
          @click="onShare"
        >
          <ShareIcon class="h-5 w-5" />
        </button>

        <!-- Отметка «выполнено» -->
        <button
          type="button"
          :class="[
            actionClass,
            actionMotionClass,
            isCompleted ? 'text-[#5fb336]' : 'text-[#61646b]',
          ]"
          :style="{ transitionDelay: stagger(3) }"
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
          :style="{ transitionDelay: stagger(4) }"
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
