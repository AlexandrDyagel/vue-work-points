<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { BackButton } from 'vue-tg'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { useAdvancedImageRotation } from '@/composables/useAdvancedImageRotation.ts'


const router = useRouter()
const {
  rotation,
  isRotating,
  rotationCount,
  isVertical,
  objectFitClass,
  containerClasses,
  imageClasses,
  rotate90,
  setRotation,
  resetRotation
} = useAdvancedImageRotation()
const imageRef = ref<HTMLImageElement>()

const selectedImage = ref<string | null>(null)
const opacity = ref<number>(100)
const cameraActive = ref<boolean>(false)
const capturedPhoto = ref<string | null>(null)

const videoRef = ref<HTMLVideoElement | null>(null)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
let stream: MediaStream | null = null

const inputTopAppBarStore = useInputFocus()

// Запуск камеры
const startCamera = async () => {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      cameraActive.value = true
    }
  } catch (err) {
    console.error('Ошибка доступа к камере:', err)
    alert('Не удалось получить доступ к камере. Пожалуйста, разрешите доступ к камере.')
  }
}

// Выбор изображения
const handleImageSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImage.value = e.target?.result as string
      capturedPhoto.value = null
    }
    reader.readAsDataURL(file)
  }
}

// Открыть диалог выбора файла
const triggerFileInput = () => {
  fileInputRef.value?.click()
}

// Сделать снимок
const capturePhoto = () => {
  if (videoRef.value && canvasRef.value) {
    const video = videoRef.value
    const canvas = canvasRef.value

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(video, 0, 0)
      capturedPhoto.value = canvas.toDataURL('image/jpeg')
    }
  }
}

// Остановка камеры при размонтировании
const stopCamera = () => {
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
}

onMounted(() => {
  startCamera()
  inputTopAppBarStore.changeFocus(true)
})

onUnmounted(() => {
  stopCamera()
  inputTopAppBarStore.changeFocus(false)
})
</script>

<template>
  <BackButton @click="router.back" />

  <div class="min-h-screen bg-gray-900 flex flex-col">

    <!-- Основной контент -->
    <div class="flex-1 relative overflow-hidden">
      <!-- Видео с камеры (фоновый слой) -->
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        class="absolute inset-0 w-full h-full object-cover"
      />

      <!-- Захваченное фото (если есть) -->
      <div
        v-if="capturedPhoto"
        class="absolute inset-0 bg-black flex items-center justify-center"
      >
        <img
          :src="capturedPhoto"
          alt="Captured"
          class="max-w-full max-h-full object-contain"
        />
      </div>

      <!-- Выбранное изображение с прозрачностью -->
      <div
        v-if="selectedImage"
        class="absolute inset-0 flex items-center justify-center"
        :class="containerClasses"
        :style="{ opacity: opacity / 100 }"
      >
        <img
          ref="imageRef"
          :src="selectedImage"
          alt="Selected"
          :class="imageClasses"
        />
      </div>

      <!-- Сообщение, если нет изображения -->
      <div
        v-if="!selectedImage && !capturedPhoto"
        class="absolute inset-0 flex items-center justify-center"
      >
        <div class="text-white text-center bg-black bg-opacity-50 p-6 rounded-lg">
          <svg
            class="w-16 h-16 mx-auto mb-4 opacity-50"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <p class="text-lg">Выберите фото из галереи</p>
        </div>
      </div>

      <!-- Скрытый canvas для захвата фото -->
      <canvas ref="canvasRef" class="hidden" />
    </div>

    <!-- Панель управления -->
    <div class="bg-gray-800 p-6 space-y-4">
      <!-- Ползунок прозрачности -->
      <div v-if="selectedImage" class="space-y-2">
        <label class="text-white text-sm font-medium flex items-center justify-between">
          <span>Прозрачность фото</span>
          <span class="text-blue-400">{{ opacity }}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="100"
          v-model.number="opacity"
          class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
      </div>

      <!-- Кнопки -->
      <div class="grid grid-cols-2 gap-3">
        <!-- Кнопка выбора фото -->
        <button
          @click="triggerFileInput"
          class="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          Выбрать фото
        </button>

        <!-- Кнопка снимка -->
        <button
          @click="capturePhoto"
          :disabled="!cameraActive"
          class="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Снимок
        </button>
      </div>

      <!-- Если есть захваченное фото, показать кнопку возврата -->
      <button
        v-if="capturedPhoto"
        @click="capturedPhoto = null"
        class="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
      >
        Вернуться к камере
      </button>
    </div>

    <!-- Скрытый input для выбора файла -->
    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      @change="handleImageSelect"
      class="hidden"
    />
  </div>
  <button
    @click="rotate90"
    class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
  >
    <svg
      class="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    Повернуть на 90°
  </button>
</template>

<style scoped>
/* Стили для ползунка прозрачности */
input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}
</style>
