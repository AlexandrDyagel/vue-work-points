<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'

const props = defineProps<{
  /** Список фотографий задания */
  photos: TaskPhotoView[]
  /** Индекс открытой фотографии или null, если просмотрщик закрыт */
  index: number | null
}>()

const emit = defineEmits<{
  close: []
  remove: [id: string]
  'update:index': [index: number]
}>()

const rotation = ref(0)
const showDeleteConfirm = ref(false)

const isOpen = computed(() => props.index !== null && props.photos.length > 0)
const total = computed(() => props.photos.length)
const current = computed(() => (props.index === null ? null : (props.photos[props.index] ?? null)))
const hasPrev = computed(() => (props.index ?? 0) > 0)
const hasNext = computed(() => (props.index ?? 0) < total.value - 1)

watch(
  () => props.index,
  () => {
    rotation.value = 0
    showDeleteConfirm.value = false
  },
)

function close() {
  showDeleteConfirm.value = false
  emit('close')
}

function showAt(nextIndex: number) {
  if (nextIndex < 0 || nextIndex >= total.value) return
  rotation.value = 0
  emit('update:index', nextIndex)
}

function showPrev() {
  showAt((props.index ?? 0) - 1)
}

function showNext() {
  showAt((props.index ?? 0) + 1)
}

/** Поворот фотографии на 90° (только в просмотрщике, файл не меняется) */
function rotate() {
  rotation.value = (rotation.value + 90) % 360
}

function requestRemove() {
  showDeleteConfirm.value = true
}

function cancelRemove() {
  showDeleteConfirm.value = false
}

function confirmRemove() {
  const photo = current.value
  showDeleteConfirm.value = false
  if (!photo) return

  emit('remove', photo.id)

  // После удаления показываем следующий кадр или закрываем просмотрщик
  if (total.value <= 1) {
    close()
    return
  }
  emit('update:index', Math.min(props.index ?? 0, total.value - 2))
}

// --- Свайпы для перелистывания фотографий ---
let touchStartX = 0
let touchStartY = 0

function onTouchStart(event: TouchEvent) {
  const touch = event.changedTouches[0]
  touchStartX = touch ? touch.clientX : 0
  touchStartY = touch ? touch.clientY : 0
}

function onTouchEnd(event: TouchEvent) {
  const touch = event.changedTouches[0]
  if (!touch) return

  const deltaX = touch.clientX - touchStartX
  const deltaY = touch.clientY - touchStartY
  if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY)) return

  if (deltaX < 0) showNext()
  else showPrev()
}

/** Управление с клавиатуры (десктоп) */
function onKeydown(event: KeyboardEvent) {
  if (!isOpen.value) return

  switch (event.key) {
    case 'Escape':
      if (showDeleteConfirm.value) cancelRemove()
      else close()
      break
    case 'ArrowRight':
      showNext()
      break
    case 'ArrowLeft':
      showPrev()
      break
  }
}

onMounted(() => document.addEventListener('keydown', onKeydown))

onBeforeUnmount(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && current"
        class="fixed inset-0 z-[9999] flex flex-col bg-black/95"
        @touchstart.passive="onTouchStart"
        @touchend="onTouchEnd"
      >
        <!-- Верхняя панель -->
        <div class="flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
          <button
            type="button"
            class="h-9 w-9 rounded-full bg-[#1e1e21] border border-[#333] text-[#ccc] flex items-center justify-center transition-colors active:opacity-60 cursor-pointer"
            aria-label="Закрыть просмотр"
            @click="close"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>

          <span class="text-xs text-[#999]">{{ (index ?? 0) + 1 }} из {{ total }}</span>

          <button
            type="button"
            class="h-9 w-9 rounded-full bg-[#1e1e21] border border-[#333] text-[#ccc] flex items-center justify-center transition-colors active:opacity-60 cursor-pointer"
            aria-label="Повернуть фотографию"
            @click="rotate"
          >
            <ArrowPathIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Фотография -->
        <div class="flex flex-1 min-h-0 items-center justify-center px-2">
          <img
            :src="current.url"
            alt="Фотография задания"
            class="max-w-full max-h-full object-contain select-none transition-transform duration-300 ease-out"
            :style="{ transform: `rotate(${rotation}deg)` }"
          />
        </div>

        <!-- Нижняя панель -->
        <div class="flex shrink-0 items-center justify-center gap-4 px-4 pt-3 pb-2">
          <button
            type="button"
            :disabled="!hasPrev"
            class="h-10 w-10 rounded-full bg-[#1e1e21] border border-[#333] text-[#ccc] flex items-center justify-center transition-colors active:opacity-60 disabled:opacity-30 cursor-pointer disabled:cursor-default"
            aria-label="Предыдущая фотография"
            @click="showPrev"
          >
            <ChevronLeftIcon class="h-5 w-5" />
          </button>

          <button
            type="button"
            class="flex items-center gap-2 rounded-xl border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 transition-colors active:opacity-60 cursor-pointer"
            @click="requestRemove"
          >
            <TrashIcon class="h-4 w-4" />
            Удалить
          </button>

          <button
            type="button"
            :disabled="!hasNext"
            class="h-10 w-10 rounded-full bg-[#1e1e21] border border-[#333] text-[#ccc] flex items-center justify-center transition-colors active:opacity-60 disabled:opacity-30 cursor-pointer disabled:cursor-default"
            aria-label="Следующая фотография"
            @click="showNext"
          >
            <ChevronRightIcon class="h-5 w-5" />
          </button>
        </div>

        <p class="shrink-0 pb-4 text-center text-[11px] text-[#61646b]">
          Свайп влево или вправо — перелистывание
        </p>
      </div>
    </Transition>

    <!-- Подтверждение удаления фотографии -->
    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div v-if="showDeleteConfirm" class="fixed inset-0 z-[10000]">
        <div class="absolute inset-0 bg-black/60" @click="cancelRemove"></div>

        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]"
        >
          <h2 class="text-lg font-bold text-white mb-2 text-center">Удалить фотографию?</h2>
          <p class="text-gray-400 text-sm text-center mb-5">Это действие нельзя отменить.</p>

          <button
            type="button"
            class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2 cursor-pointer"
            @click="confirmRemove"
          >
            Удалить
          </button>
          <button
            type="button"
            class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
            @click="cancelRemove"
          >
            Отмена
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
