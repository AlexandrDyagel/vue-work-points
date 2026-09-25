<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/vue/24/outline'
import { useBackButton, useBackDismiss } from '@/composables/useBackButton.ts'
import { useHaptics } from '@/composables/useHaptics.ts'
import {
  describeCameraError,
  grabVideoFrame,
  isVideoStreamLive,
  supportsLiveCamera,
  type CameraFacing,
} from '@/utils/camera.ts'
import { acquireCameraStream, releaseCameraStream } from '@/utils/cameraSession.ts'

/**
 * Съёмка фотографии камерой устройства прямо в приложении.
 *
 * Зачем не `<input type="file" capture="environment">`: в WebView (Telegram Mini App
 * на Android, часть системных браузеров) атрибут `capture` игнорируется — вместо
 * камеры открывается системный выбор файлов. Здесь камера открывается через
 * getUserMedia, кадр с превью переносится в canvas и отдаётся родителю JPEG-Blob'ом.
 *
 * После затвора снимок не уходит сразу: он показывается на весь экран, и пользователь
 * решает — «галочка» (добавить в задание) или «крестик» (не добавлять, вернуться к
 * камере). Так же ведёт себя системное приложение камеры.
 *
 * Состоянием владеет родитель (проп `open`): компонент сообщает событиями
 * `capture` (подтверждённый снимок), `cancel` (закрыли без снимка) и `fallback`
 * (живая камера недоступна — нужен системный выбор файла).
 *
 * Закрытие работает на всех платформах: крестик, Esc на десктопе и системная
 * кнопка «Назад» на Android (через общий стек оверлеев в useBackButton).
 *
 * Разрешение на камеру спрашивается один раз: поток живёт в тёплой сессии
 * (`utils/cameraSession.ts`) и переиспользуется. WebView (Telegram Mini App,
 * iOS) не запоминает решение пользователя и спрашивает доступ заново на каждый
 * getUserMedia — поэтому камера не гасится сразу после закрытия съёмки.
 */
const props = defineProps<{
  /** Камера открыта */
  open: boolean
}>()

const emit = defineEmits<{
  /** Пользователь сделал и подтвердил снимок (JPEG-Blob) */
  capture: [blob: Blob]
  /** Пользователь закрыл камеру, не сделав снимок */
  cancel: []
  /** Живая камера недоступна — нужен системный выбор файла */
  fallback: []
}>()

/** Сообщение, когда getUserMedia недоступен вовсе (не защищённый контекст) */
const UNSUPPORTED_MESSAGE = 'Камера недоступна в этом окружении.'

const videoRef = ref<HTMLVideoElement | null>(null)
const isStarting = ref(false)
const errorMessage = ref('')
const facing = ref<CameraFacing>('environment')

/**
 * Снимок, ожидающий подтверждения (как в системной камере: после затвора кадр
 * показывается пользователю, и он решает — добавить фото или переснять).
 * Кадр хранится Blob'ом, в `shotUrl` — его object URL для превью.
 */
const shotBlob = ref<Blob | null>(null)
const shotUrl = ref('')

const hasShot = computed(() => Boolean(shotUrl.value))

const haptics = useHaptics()

const isOpen = computed(() => props.open)

/**
 * Регистрация обработчика «Назад» вручную нужна один раз: во время просмотра
 * снимка обработчик из стека оверлеев уже снят (см. handleBack).
 */
const { registerBackHandler } = useBackButton()

/** Превью подтверждённого снимка: object URL нужно освобождать, иначе утечка памяти */
const clearShot = () => {
  if (shotUrl.value) URL.revokeObjectURL(shotUrl.value)
  shotUrl.value = ''
  shotBlob.value = null
}

/**
 * «Поколение» запуска: пока шёл getUserMedia, камеру могли закрыть или
 * переключить — тогда результат запроса уже не нужен.
 *
 * Самим потоком владеет тёплая сессия (`utils/cameraSession.ts`): она не гасит
 * камеру сразу после съёмки, поэтому в Telegram Mini App разрешение не
 * спрашивается заново на каждый снимок. Здесь поток только отвязывается от
 * `<video>`.
 */
let streamToken = 0

/** Отвязать поток от `<video>`, не выключая камеру: поток остаётся в сессии */
const detachStream = () => {
  streamToken += 1
  if (videoRef.value) videoRef.value.srcObject = null
}

const startStream = async () => {
  detachStream()
  errorMessage.value = ''

  if (!supportsLiveCamera()) {
    isStarting.value = false
    errorMessage.value = UNSUPPORTED_MESSAGE
    return
  }

  const token = streamToken
  isStarting.value = true

  try {
    const next = await acquireCameraStream(facing.value)

    // Камеру закрыли или переключили, пока шёл запрос — поток не нужен
    // (сессия сама погасит его, если он остался без потребителя)
    if (token !== streamToken || !props.open) return

    await nextTick()

    const video = videoRef.value
    if (!video) return

    video.srcObject = next
    await video.play().catch(() => undefined)
  } catch (error) {
    console.error('CameraCapture: не удалось открыть камеру', error)
    // Камеру могли закрыть или переключить, пока шёл запрос — ошибку не показываем
    if (token !== streamToken) return
    errorMessage.value = describeCameraError(error)
  } finally {
    if (token === streamToken) isStarting.value = false
  }
}

/**
 * Затвор: кадр с превью переносится в canvas и показывается пользователю на
 * подтверждение. К родителю снимок уходит только после «галочки», поэтому в
 * карточку задания он не попадает случайно.
 */
const takePhoto = async () => {
  const video = videoRef.value
  if (!video || isStarting.value || errorMessage.value || hasShot.value) return

  // Система могла отобрать камеру (фон, другое приложение) — тогда в превью
  // застывший кадр. Поднимаем камеру заново, а не отдаём старое изображение
  if (!isVideoStreamLive(video)) {
    await startStream()
    return
  }

  // Кадр фронтальной камеры отражаем: её превью зеркальное. Кадр берём в родном
  // разрешении камеры (`preserveSize`) — этот же снимок уходит в память устройства
  // как оригинал, а для карточки задания его ужимает конвейер фотографий.
  const blob = await grabVideoFrame(video, {
    mirror: facing.value === 'user',
    preserveSize: true,
  })
  if (!blob) {
    haptics.error()
    errorMessage.value = 'Не удалось сохранить снимок. Попробуйте ещё раз.'
    return
  }

  haptics.tap('medium')
  shotBlob.value = blob
  shotUrl.value = URL.createObjectURL(blob)
}

/** «Галочка»: снимок подтверждён — уходит родителю и добавляется в задание */
const confirmShot = () => {
  const blob = shotBlob.value
  if (!blob) return

  clearShot()
  haptics.success()
  emit('capture', blob)
}

/** «Крестик»: снимок не добавляем, возвращаемся к живой камере (можно переснять) */
const discardShot = () => {
  clearShot()
  haptics.tap()
}

const close = () => {
  clearShot()
  haptics.tap()
  emit('cancel')
}

/**
 * Системная «Назад» (Android) и Esc: во время просмотра снимка они отменяют его
 * и возвращают к камере (как в системном приложении камеры), а закрывают камеру
 * только когда подтверждать нечего.
 */
const handleBack = () => {
  if (hasShot.value) {
    // Путь «Назад» пришёл из стека оверлеев, и наш обработчик из него уже снят.
    // Ставим его обратно: следующее нажатие должно закрыть камеру, а не увести
    // пользователя со страницы.
    discardShot()
    registerBackHandler(handleBack)
    return
  }

  emit('cancel')
}

/** Живая камера не подошла (нет разрешения и т.п.) — системный выбор файла */
const useSystemPicker = () => {
  haptics.tap()
  emit('fallback')
}

const retry = () => {
  haptics.tap()
  void startStream()
}

const switchCamera = () => {
  haptics.selection()
  facing.value = facing.value === 'environment' ? 'user' : 'environment'
  void startStream()
}

// Системная кнопка «Назад» (Android) и Esc: отменяют просмотр снимка, а затем
// закрывают камеру — не уводя со страницы
useBackDismiss(isOpen, handleBack)

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      clearShot()
      detachStream()
      // Камера гасится не сразу: пока поток тёплый, следующее открытие съёмки
      // не спрашивает разрешение заново (в Telegram Mini App это критично)
      releaseCameraStream()
      errorMessage.value = ''
      isStarting.value = false
      facing.value = 'environment'
      return
    }

    // Кадр снимаем после появления <video> в DOM
    await nextTick()
    await startStream()
  },
  { immediate: true },
)

// Карточка (или страница) закрылась вместе с оверлеем — освобождаем камеру и превью
onBeforeUnmount(() => {
  clearShot()
  detachStream()

  // Камеру отпускаем только со своей открытой съёмки: соседняя карточка могла
  // размонтироваться в фоне и не должна гасить работающий поток
  if (props.open) releaseCameraStream(0)
})
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
        v-if="open"
        role="dialog"
        aria-modal="true"
        aria-label="Съёмка фотографии камерой"
        class="fixed inset-0 z-[10000] flex flex-col select-none bg-black"
      >
        <!-- Верхняя панель: закрыть, подпись камеры, переключение камеры -->
        <div class="relative z-10 flex shrink-0 items-center justify-between gap-3 px-4 pt-4 pb-2">
          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-[#333] bg-[#1e1e21]/80 text-[#ccc] transition-colors active:opacity-60 cursor-pointer"
            aria-label="Закрыть камеру"
            @click="close"
          >
            <XMarkIcon class="h-5 w-5" />
          </button>

          <span class="text-xs text-[#999]">
            {{ facing === 'user' ? 'Фронтальная камера' : 'Основная камера' }}
          </span>

          <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-full border border-[#333] bg-[#1e1e21]/80 text-[#ccc] transition-colors active:opacity-60 cursor-pointer disabled:opacity-30 disabled:cursor-default"
            aria-label="Переключить камеру"
            :disabled="isStarting || !!errorMessage || hasShot"
            @click="switchCamera"
          >
            <ArrowPathIcon class="h-5 w-5" />
          </button>
        </div>

        <!-- Превью камеры -->
        <div class="relative min-h-0 flex-1 overflow-hidden bg-black">
          <video
            ref="videoRef"
            v-show="!hasShot"
            autoplay
            playsinline
            muted
            class="h-full w-full object-contain transition-opacity duration-300"
            :class="[
              facing === 'user' ? '-scale-x-100' : '',
              isStarting || errorMessage ? 'opacity-0' : 'opacity-100',
            ]"
          ></video>

          <!-- Снимок готов: показываем кадр и ждём решения пользователя -->
          <Transition
            enter-active-class="transition-opacity duration-200 ease-out"
            enter-from-class="opacity-0"
            leave-active-class="transition-opacity duration-150 ease-in"
            leave-to-class="opacity-0"
          >
            <div v-if="shotUrl" class="absolute inset-0 z-10 bg-black">
              <img :src="shotUrl" alt="Сделанный снимок" class="h-full w-full object-contain" />
            </div>
          </Transition>

          <!-- Идёт запуск камеры -->
          <div
            v-if="isStarting"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center"
          >
            <div
              class="h-6 w-6 animate-spin rounded-full border-2 border-[#3d7eff] border-t-transparent"
            ></div>
            <p class="text-sm text-[#999]">Включаем камеру...</p>
          </div>

          <!-- Камера недоступна: повтор или системный выбор файла -->
          <div
            v-else-if="errorMessage"
            class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 px-6 text-center"
          >
            <ExclamationTriangleIcon class="h-8 w-8 text-amber-400" />
            <p class="text-sm text-[#c9c9d1]">{{ errorMessage }}</p>

            <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                class="min-h-11 rounded-xl bg-[#3d7eff] px-4 text-sm font-medium text-white transition-colors active:opacity-70 cursor-pointer"
                @click="retry"
              >
                Повторить
              </button>
              <button
                type="button"
                class="min-h-11 rounded-xl border border-[#3d3e43] px-4 text-sm font-medium text-[#c9c9d1] transition-colors active:opacity-70 cursor-pointer"
                @click="useSystemPicker"
              >
                Выбрать из галереи
              </button>
            </div>
          </div>
        </div>

        <!-- Нижняя панель: затвор или решение по снимку -->
        <div v-if="!errorMessage" class="flex shrink-0 flex-col items-center gap-3 px-4 pt-4 pb-8">
          <!-- Снимок сделан: «крестик» — не добавлять, «галочка» — добавить в задание -->
          <div v-if="hasShot" class="flex items-center gap-16">
            <button
              type="button"
              class="flex h-14 w-14 items-center justify-center rounded-full border border-[#3d3e43] bg-[#1e1e21] text-[#e4e4e7] transition-transform active:scale-95 cursor-pointer"
              aria-label="Не добавлять фото"
              @click="discardShot"
            >
              <XMarkIcon class="h-7 w-7" />
            </button>

            <button
              type="button"
              class="flex h-16 w-16 items-center justify-center rounded-full bg-[#3d7eff] text-white transition-transform active:scale-95 cursor-pointer"
              aria-label="Добавить фото"
              @click="confirmShot"
            >
              <CheckIcon class="h-8 w-8" />
            </button>
          </div>

          <!-- Съёмка: затвор -->
          <button
            v-else
            type="button"
            class="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-white transition-transform active:scale-95 cursor-pointer disabled:opacity-40 disabled:cursor-default"
            aria-label="Сделать снимок"
            :disabled="isStarting"
            @click="takePhoto"
          >
            <span class="h-12 w-12 rounded-full bg-white"></span>
          </button>

          <p class="text-center text-[11px] text-[#61646b]">
            {{
              hasShot
                ? 'Проверьте снимок: «Добавить» — отправить, «Не добавлять» — переснять'
                : 'Наведите камеру на объект и нажмите кнопку'
            }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
