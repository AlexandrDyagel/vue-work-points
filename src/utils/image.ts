/**
 * Утилиты подготовки изображений к хранению.
 *
 * Фотографии заданий уменьшаются и перекодируются в JPEG — так десятки снимков
 * занимают минимум места в памяти устройства (Android/iOS) и в браузере,
 * при этом код не зависит от нативных плагинов и работает на всех платформах.
 */

/** Параметры сжатия изображения */
export interface CompressImageOptions {
  /** Максимальный размер большей стороны в пикселях (по умолчанию 1280) */
  maxSize?: number
  /** Качество JPEG, 0..1 (по умолчанию 0.72) */
  quality?: number
  /** Если изображение меньше этого размера (в байтах), оно не перекодируется */
  skipBelowBytes?: number
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

const DEFAULT_MAX_SIZE = 1280
const DEFAULT_QUALITY = 0.72
const DEFAULT_SKIP_BYTES = 150 * 1024

/** Есть ли в текущем окружении canvas (нужен для сжатия) */
function isCanvasSupported(): boolean {
  return typeof document !== 'undefined' && typeof document.createElement === 'function'
}

/**
 * Уменьшает изображение и перекодирует его в JPEG.
 * Если файл уже небольшой или его не удалось декодировать — возвращает исходный Blob.
 */
export async function compressImage(file: Blob, options: CompressImageOptions = {}): Promise<Blob> {
  const maxSize = options.maxSize ?? DEFAULT_MAX_SIZE
  const quality = options.quality ?? DEFAULT_QUALITY
  const skipBelowBytes = options.skipBelowBytes ?? DEFAULT_SKIP_BYTES

  if (!isCanvasSupported()) return file

  const decoded = await decodeImage(file)
  if (!decoded) return file

  try {
    const longestSide = Math.max(decoded.width, decoded.height)
    if (!longestSide) return file
    if (file.size <= skipBelowBytes && longestSide <= maxSize) return file

    const compressed = await drawToJpeg(decoded, maxSize, quality)
    return compressed ?? file
  } catch (error) {
    console.error('image: не удалось сжать изображение', error)
    return file
  } finally {
    decoded.release()
  }
}

/** Декодирование изображения с учётом EXIF-ориентации кадра */
async function decodeImage(file: Blob): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close(),
      }
    } catch {
      // Часть WebView не поддерживает опции — пробуем без них
      try {
        const bitmap = await createImageBitmap(file)
        return {
          source: bitmap,
          width: bitmap.width,
          height: bitmap.height,
          release: () => bitmap.close(),
        }
      } catch (error) {
        console.warn('image: createImageBitmap недоступен, используется <img>', error)
      }
    }
  }

  return decodeWithImageElement(file)
}

/** Резервный способ декодирования через <img> (для старых WebView) */
function decodeWithImageElement(file: Blob): Promise<DecodedImage | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      })

    image.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    image.src = url
  })
}

/** Отрисовка изображения в canvas и получение JPEG-Blob */
function drawToJpeg(decoded: DecodedImage, maxSize: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, maxSize / Math.max(decoded.width, decoded.height))
  const width = Math.max(1, Math.round(decoded.width * scale))
  const height = Math.max(1, Math.round(decoded.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)

  // Белый фон: JPEG не поддерживает прозрачность
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)

  context.drawImage(decoded.source, 0, 0, width, height)

  return new Promise((resolve) => {
    try {
      canvas.toBlob((blob) => resolve(blob && blob.size > 0 ? blob : null), 'image/jpeg', quality)
    } catch (error) {
      console.error('image: ошибка canvas.toBlob', error)
      resolve(null)
    }
  })
}

/**
 * Проверка, что файл можно декодировать как изображение.
 * Нужна для файлов без mime-типа: некоторые Android-провайдеры
 * отдают выбранные из галереи файлы без типа и без расширения.
 */
export async function isDecodableImage(file: Blob): Promise<boolean> {
  if (typeof createImageBitmap !== 'function' && !isCanvasSupported()) {
    return file.type.startsWith('image/')
  }

  const decoded = await decodeImage(file)
  if (!decoded) return false

  decoded.release()
  return true
}

/** Blob → dataURL (используется резервным хранилищем фотографий) */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error ?? new Error('Не удалось прочитать изображение'))
    reader.readAsDataURL(blob)
  })
}

/** dataURL → Blob (используется резервным хранилищем фотографий) */
export function dataUrlToBlob(dataUrl: string): Blob {
  const separatorIndex = dataUrl.indexOf(',')
  if (separatorIndex === -1) return new Blob([], { type: 'image/jpeg' })

  const meta = dataUrl.slice(0, separatorIndex)
  const payload = dataUrl.slice(separatorIndex + 1)
  const mimeType = meta.slice(meta.indexOf(':') + 1, meta.indexOf(';')) || 'image/jpeg'

  try {
    const binary = atob(payload)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index)
    }
    return new Blob([bytes], { type: mimeType })
  } catch (error) {
    console.error('image: не удалось восстановить изображение из dataURL', error)
    return new Blob([], { type: mimeType })
  }
}
