<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { CameraIcon, PhotoIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'
import { compressImage, isDecodableImage } from '@/utils/image.ts'

/** Максимальное количество фотографий на одно задание */
const DEFAULT_MAX_PHOTOS = 10

/** Расширения изображений: часть WebView не отдаёт mime-тип выбранного файла */
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif|tiff?)$/i

const props = withDefaults(
  defineProps<{
    photos?: TaskPhotoView[]
    /** Сколько фотографий можно прикрепить к заданию */
    maxPhotos?: number
  }>(),
  { photos: () => [], maxPhotos: DEFAULT_MAX_PHOTOS },
)

const emit = defineEmits<{
  /** Пользователь выбрал фотографии (уже сжатые Blob'ы) */
  add: [blobs: Blob[]]
  /** Пользователь удалил фотографию по id */
  remove: [id: string]
  /** Пользователь открыл просмотрщик фотографий */
  open: [index: number]
}>()

const galleryInputRef = ref<HTMLInputElement | null>(null)
const cameraInputRef = ref<HTMLInputElement | null>(null)
const isProcessing = ref(false)
const processingCount = ref(0)
const isDragging = ref(false)
const message = ref('')
const messageKind = ref<'error' | 'success'>('error')
let messageTimer: ReturnType<typeof setTimeout> | null = null

const remainingSlots = computed(() => Math.max(0, props.maxPhotos - props.photos.length))
const canAddMore = computed(() => remainingSlots.value > 0)
const processingLabel = computed(() =>
  processingCount.value > 1 ? `Обработка ${processingCount.value} фото...` : 'Обработка фото...',
)

function showMessage(text: string, kind: 'error' | 'success' = 'error', duration = 3000) {
  message.value = text
  messageKind.value = kind
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, duration)
}

/** Открытие системного выбора файлов: поддерживает множественный выбор на всех платформах */
function openGallery() {
  if (!canAddMore.value) {
    showMessage(`К заданию можно прикрепить не более ${props.maxPhotos} фото`)
    return
  }
  galleryInputRef.value?.click()
}

/** Открытие камеры устройства (одиночный снимок) */
function openCamera() {
  if (!canAddMore.value) {
    showMessage(`К заданию можно прикрепить не более ${props.maxPhotos} фото`)
    return
  }
  cameraInputRef.value?.click()
}

/**
 * Можно ли считать файл изображением.
 * Кроме mime-типа и расширения проверяется декодирование: некоторые
 * Android-провайдеры отдают выбранные файлы без типа и без расширения.
 */
async function isSupportedImage(file: File): Promise<boolean> {
  if (file.type.startsWith('image/')) return true
  if (IMAGE_EXTENSIONS.test(file.name)) return true
  if (!file.type) return isDecodableImage(file)
  return false
}

/** Обработка выбранных файлов: фильтрация, сжатие и передача родителю */
async function processFiles(files: File[]) {
  if (!files.length) return

  const images: File[] = []
  for (const file of files) {
    if (await isSupportedImage(file)) images.push(file)
  }

  if (!images.length) {
    showMessage('Можно прикрепить только изображения')
    return
  }

  if (!remainingSlots.value) {
    showMessage(`К заданию можно прикрепить не более ${props.maxPhotos} фото`)
    return
  }

  const accepted = images.slice(0, remainingSlots.value)
  isProcessing.value = true
  processingCount.value = accepted.length

  try {
    const blobs = await Promise.all(accepted.map((file) => compressImage(file)))
    emit('add', blobs)

    if (accepted.length < images.length) {
      showMessage(`Добавлено ${accepted.length} фото — лимит ${props.maxPhotos} на задание`)
    } else if (accepted.length > 1) {
      showMessage(`Добавлено ${accepted.length} фото`, 'success')
    }
  } catch (error) {
    console.error('TaskPhotoGallery: не удалось подготовить фотографии', error)
    showMessage('Не удалось обработать фотографии')
  } finally {
    isProcessing.value = false
    processingCount.value = 0
  }
}

/** Файлы, выбранные в системном окне (может вернуться сразу несколько) */
async function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  // Сбрасываем input, чтобы можно было выбрать те же файлы повторно
  input.value = ''
  await processFiles(files)
}

// --- Перетаскивание файлов (десктопный браузер) ---

// Счётчик входов/выходов курсора: нужен, чтобы подсветка не мигала на дочерних элементах
let dragDepth = 0

function onDragEnter() {
  if (!canAddMore.value || isProcessing.value) return
  dragDepth += 1
  isDragging.value = true
}

function onDragLeave() {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragging.value = false
}

async function onDrop(event: DragEvent) {
  dragDepth = 0
  isDragging.value = false
  if (!canAddMore.value) {
    showMessage(`К заданию можно прикрепить не более ${props.maxPhotos} фото`)
    return
  }
  await processFiles(Array.from(event.dataTransfer?.files ?? []))
}

function removePhoto(id: string) {
  emit('remove', id)
}

function openViewer(index: number) {
  emit('open', index)
}

onBeforeUnmount(() => {
  if (messageTimer) clearTimeout(messageTimer)
})

defineExpose({
  openGallery,
  openCamera,
})
</script>

<template>
  <div
    class="relative mt-2"
    @dragover.prevent
    @dragenter.prevent="onDragEnter"
    @dragleave.prevent="onDragLeave"
    @drop.prevent="onDrop"
  >
    <!-- Заголовок: количество фото и подсказка о множественном выборе -->
    <div class="flex flex-wrap items-center gap-x-2 mb-1.5">
      <div class="flex items-center gap-1.5">
        <PhotoIcon class="h-3.5 w-3.5 text-[#61646b]" />
        <span class="text-[11px] text-[#999]">Фото: {{ photos.length }} / {{ maxPhotos }}</span>
      </div>
      <span v-if="canAddMore" class="text-[10px] text-[#61646b]">можно выбрать сразу несколько</span>
    </div>

    <div v-auto-animate class="flex flex-wrap items-center gap-2">
      <!-- Множественный выбор фотографий из галереи устройства -->
      <button
        v-if="canAddMore && !isProcessing"
        type="button"
        class="h-14 px-3 rounded-lg border border-dashed border-[#4d4d4d] text-[#9aa0a6] flex items-center gap-2 transition-colors active:opacity-60 cursor-pointer"
        aria-label="Выбрать фотографии, можно несколько"
        @mousedown.prevent
        @click="openGallery"
      >
        <PhotoIcon class="h-4 w-4" />
        <span class="text-[11px] text-left leading-tight">
          Выбрать фото
          <span class="block text-[9px] text-[#61646b]">можно несколько</span>
        </span>
      </button>

      <!-- Одиночный снимок камерой устройства -->
      <button
        v-if="canAddMore && !isProcessing"
        type="button"
        class="w-14 h-14 rounded-lg border border-dashed border-[#4d4d4d] text-[#61646b] flex flex-col items-center justify-center gap-1 transition-colors active:opacity-60 cursor-pointer"
        aria-label="Сделать один снимок камерой"
        @mousedown.prevent
        @click="openCamera"
      >
        <CameraIcon class="h-4 w-4" />
        <span class="text-[9px] leading-none">Камера</span>
      </button>

      <!-- Индикатор сжатия выбранных фотографий -->
      <div
        v-if="isProcessing"
        class="h-14 px-3 rounded-lg border border-[#3d3e43] bg-[#2a2a2e] text-[#999] flex items-center gap-2"
      >
        <div class="h-4 w-4 rounded-full border-2 border-[#3d7eff] border-t-transparent animate-spin"></div>
        <span class="text-[10px]">{{ processingLabel }}</span>
      </div>

      <!-- Превью прикреплённых фотографий -->
      <div v-for="(photo, index) in photos" :key="photo.id" class="relative w-14 h-14">
        <button
          type="button"
          class="w-full h-full rounded-lg overflow-hidden border border-[#3d3e43] cursor-pointer active:opacity-70"
          aria-label="Открыть фотографию"
          @mousedown.prevent
          @click="openViewer(index)"
        >
          <img :src="photo.url" alt="Фотография задания" class="w-full h-full object-cover" />
        </button>

        <button
          type="button"
          class="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-[#1e1e21] border border-[#444] text-[#ccc] flex items-center justify-center transition-colors active:opacity-60 cursor-pointer after:absolute after:-inset-1.5 after:content-['']"
          aria-label="Удалить фотографию"
          @mousedown.prevent
          @click.stop="removePhoto(photo.id)"
        >
          <XMarkIcon class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <Transition
      enter-active-class="transition-opacity duration-200 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <p
        v-if="message"
        class="mt-1.5 text-[11px]"
        :class="messageKind === 'success' ? 'text-[#5fb336]' : 'text-[#ff5b4d]'"
      >
        {{ message }}
      </p>
    </Transition>

    <!-- Подсветка области при перетаскивании файлов (десктоп) -->
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150 ease-in"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isDragging"
        class="pointer-events-none absolute -inset-1 rounded-lg border-2 border-dashed border-[#3d7eff] bg-[#3d7eff]/10 flex items-center justify-center"
      >
        <span class="text-[11px] text-[#9cc0ff]">Отпустите, чтобы добавить фото</span>
      </div>
    </Transition>

    <!-- Скрытые input'ы на базе стандартного выбора файлов: работают в браузере,
         в Telegram Mini App и в WebView нативной сборки Capacitor.
         multiple => множественный выбор (Capacitor на Android передаёт в системное
         окно EXTRA_ALLOW_MULTIPLE и обрабатывает ClipData с несколькими файлами). -->
    <input ref="galleryInputRef" type="file" accept="image/*" multiple class="hidden" @change="onFilesSelected" />
    <input
      ref="cameraInputRef"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onFilesSelected"
    />
  </div>
</template>
