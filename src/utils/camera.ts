/**
 * Утилиты съёмки камерой устройства.
 *
 * Зачем нужна живая съёмка: в WebView (Telegram Mini App на Android, часть
 * системных браузеров) атрибут `capture` у `<input type="file">` игнорируется —
 * вместо камеры открывается системный выбор файлов/галерея. Чтобы кнопка «Камера»
 * всегда вызывала камеру, кадр снимается через getUserMedia: изображение с `<video>`
 * переносится в canvas и сохраняется как JPEG. Код не зависит от нативных плагинов
 * и работает на всех платформах.
 */

/** Направление камеры: основная (сзади) или фронтальная */
export type CameraFacing = 'environment' | 'user'

/** Максимальный размер кадра по большей стороне до сжатия (пиксели) */
const DEFAULT_FRAME_MAX_SIZE = 2048

/** Качество JPEG кадра до сжатия, 0..1 */
const DEFAULT_FRAME_QUALITY = 0.92

export interface GrabFrameOptions {
  /** Максимальный размер большей стороны кадра в пикселях (по умолчанию 2048) */
  maxSize?: number
  /** Качество JPEG, 0..1 (по умолчанию 0.92) */
  quality?: number
  /**
   * Отразить кадр по горизонтали. Нужно для фронтальной камеры: её превью
   * показывается зеркально, и без отражения снимок в превью подтверждения
   * «переворачивался» бы на глазах у пользователя.
   */
  mirror?: boolean
}

/**
 * Доступна ли живая съёмка. getUserMedia работает только в защищённом контексте
 * (https или localhost) — в Telegram Mini App и нативной сборке это выполняется.
 */
export function supportsLiveCamera(): boolean {
  if (typeof navigator === 'undefined') return false
  return typeof navigator.mediaDevices?.getUserMedia === 'function'
}

/**
 * Жив ли поток у `<video>`.
 *
 * Поток может умереть незаметно для пользователя: система отбирает камеру, когда
 * приложение уходит в фон или её забирает другое приложение. `<video>` при этом
 * продолжает показывать застывший кадр, и затвор снял бы его как «новое» фото.
 */
export function isVideoStreamLive(video: HTMLVideoElement): boolean {
  const source: unknown = video.srcObject
  if (!source || typeof (source as MediaStream).getVideoTracks !== 'function') return false

  const tracks = (source as MediaStream).getVideoTracks()
  return tracks.some((track) => track.readyState === 'live')
}

/** Понятное пользователю объяснение отказа камеры */
export function describeCameraError(error: unknown): string {
  const name = error instanceof Error ? error.name : ''

  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return 'Доступ к камере запрещён. Разрешите камеру в настройках и попробуйте снова.'
    case 'NotFoundError':
    case 'OverconstrainedError':
      return 'Камера не найдена на этом устройстве.'
    case 'NotReadableError':
    case 'AbortError':
      return 'Камера занята другим приложением. Закройте его и попробуйте снова.'
    case 'NotSupportedError':
      return 'Камера недоступна в этом окружении.'
    default:
      return 'Не удалось открыть камеру.'
  }
}

/**
 * Кадр с `<video>` в JPEG-Blob.
 *
 * Кадр уменьшается до `maxSize` по большей стороне: полноразмерный снимок
 * (12 Мп) занимал бы десятки мегабайт памяти на слабых Android-устройствах,
 * а дальнейшее сжатие до 1280 px делает общий конвейер фотографий
 * (`compressImage`).
 */
export function grabVideoFrame(
  video: HTMLVideoElement,
  options: GrabFrameOptions = {},
): Promise<Blob | null> {
  const maxSize = options.maxSize ?? DEFAULT_FRAME_MAX_SIZE
  const quality = options.quality ?? DEFAULT_FRAME_QUALITY
  const mirror = options.mirror ?? false

  const width = video.videoWidth
  const height = video.videoHeight
  if (!width || !height) return Promise.resolve(null)
  if (typeof document === 'undefined') return Promise.resolve(null)

  const scale = Math.min(1, maxSize / Math.max(width, height))

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)

  // Зеркальный кадр: рисуем слева направо с отражением (передняя камера)
  if (mirror) {
    context.translate(canvas.width, 0)
    context.scale(-1, 1)
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), 'image/jpeg', quality)
    } catch (error) {
      console.error('camera: не удалось сохранить кадр', error)
      resolve(null)
    }
  })
}
