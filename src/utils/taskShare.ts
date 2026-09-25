/**
 * Отправка фотографий задания (точки) в мессенджеры одной «пачкой».
 *
 * Подпись к пачке — имя задания: в Telegram и WhatsApp она становится
 * подписью к снимкам, в остальных случаях вставляется в сообщение.
 *
 * Платформы:
 *  - нативная сборка Capacitor (Android/iOS) — плагин @capacitor/share:
 *    снимки пишутся во временную папку приложения (Cache) и передаются
 *    системному окну «Поделиться» вместе с подписью;
 *  - браузер с Web Share API (мобильный Chrome и др.) — navigator.share с
 *    файлами: окно «Поделиться» передаёт и снимки, и подпись;
 *  - Telegram Mini App, WebView и настольный браузер — файлы передать нечем:
 *    открываем окно выбора чата ссылкой мессенджера с подписью, а снимки
 *    сохраняем в память устройства, чтобы прикрепить их из галереи.
 *
 * Фотографии задания лежат в памяти приложения (IndexedDB), поэтому перед
 * отправкой они превращаются в файлы: blob-ссылка мессенджеру не годится.
 */

import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'
import { blobToBase64 } from '@/utils/image.ts'
import { buildPhotoFileName, savePhotoToDevice } from '@/utils/photoSave.ts'

/** Мессенджер, в который отправляем фотографии задания */
export type TaskShareTarget = 'telegram' | 'whatsapp' | 'max' | 'system'

/** Названия мессенджеров: попадают в подсказки и сообщения пользователю */
export const TASK_SHARE_TARGET_LABELS: Record<TaskShareTarget, string> = {
  telegram: 'Telegram',
  whatsapp: 'WhatsApp',
  max: 'МАКС',
  system: 'системное окно',
}

/** Открытие внешней ссылки средствами платформы */
export type TaskShareLinkOpener = (url: string) => Promise<boolean> | boolean

/** Что именно и куда отправляем */
export interface TaskSharePayload {
  /** Подпись к пачке снимков — имя задания (точки) */
  caption: string
  /** Фотографии задания */
  photos: Blob[]
  /** Выбранный мессенджер */
  target: TaskShareTarget
  /**
   * Открытие ссылки мессенджера средствами платформы.
   * Возвращает false, если ссылку открыть не удалось (нет приложения,
   * окно закрыто браузером) — тогда пользователю показывается ошибка.
   */
  openLink: TaskShareLinkOpener
}

/** Результат отправки: готовое сообщение показывается пользователю */
export interface TaskShareResult {
  /** Сообщение (или окно выбора чата) открыто */
  ok: boolean
  /** Текст для пользователя (пустая строка — сообщать нечего) */
  message: string
}

/** Подпись, если имя задания пустое */
const FALLBACK_CAPTION = 'Задание'

/** Папка во временном хранилище приложения: плагин Share отдаёт файлы только оттуда */
const SHARE_CACHE_FOLDER = 'task-share'

const FAILED_MESSAGE = 'Не удалось отправить задание'

/**
 * Отправка фотографий задания в мессенджер.
 * Ошибка отправки не прерывает работу карточки, поэтому исключения наружу не выходят.
 */
export async function shareTask({
  caption,
  photos,
  target,
  openLink,
}: TaskSharePayload): Promise<TaskShareResult> {
  const text = caption.trim() || FALLBACK_CAPTION
  const images = photos.filter((photo) => photo.size > 0)
  const label = TASK_SHARE_TARGET_LABELS[target]

  try {
    // Нативная сборка: системное окно с файлами открывает плагин Share
    if (Capacitor.isNativePlatform()) {
      return await shareTaskNative(images, text, target, label, openLink)
    }

    const files = images.map((photo, index) => toShareFile(photo, index))

    // Браузер с системным окном «Поделиться»: подпись и снимки уходят вместе
    if (files.length && canShareFiles(files)) {
      await navigator.share({ files, text })
      return { ok: true, message: 'Выберите чат в окне «Поделиться»' }
    }

    // Остальные окружения: ссылка мессенджера с подписью
    return await shareTaskByLink(text, images, target, label, openLink)
  } catch (error) {
    // Пользователь закрыл системное окно сам — сообщать нечего
    if (isAbortError(error)) return { ok: false, message: '' }

    console.error('taskShare: не удалось отправить задание', error)
    return { ok: false, message: FAILED_MESSAGE }
  }
}

/** Умеет ли окружение передавать снимки вместе с подписью */
export function canTransferPhotos(): boolean {
  if (Capacitor.isNativePlatform()) return true
  return canShareFiles([toShareFile(new Blob([], { type: 'image/jpeg' }), 0)])
}

/**
 * Снимки задания в виде Blob: в интерфейсе фотографии хранятся ссылками
 * (objectURL), мессенджеру же нужен сам файл.
 */
export async function loadPhotoBlobs(photos: TaskPhotoView[]): Promise<Blob[]> {
  const loaded = await Promise.all(photos.map((photo) => fetchBlob(photo.url)))
  return loaded.filter((blob): blob is Blob => blob !== null)
}

// --- Нативная сборка: плагин @capacitor/share ---

/**
 * Нативная отправка: снимки записываются во временную папку приложения
 * и передаются системному окну «Поделиться» файлами, вместе с подписью.
 * Если файлы подготовить не удалось, остаётся ссылка мессенджера.
 */
async function shareTaskNative(
  images: Blob[],
  caption: string,
  target: TaskShareTarget,
  label: string,
  openLink: TaskShareLinkOpener,
): Promise<TaskShareResult> {
  const files = await writePhotosToCache(images)

  if (!files.length) return await shareTaskByLink(caption, images, target, label, openLink)

  await Share.share({
    title: caption,
    text: caption,
    files,
    dialogTitle: `Отправить фотографии задания в ${label}`,
  })

  return { ok: true, message: 'Выберите чат в системном окне' }
}

/**
 * Запись снимков во временную папку приложения: файлы нужны только на время
 * отправки, доступ к ним получает выбранное приложение (FileProvider).
 *
 * Записанные файлы не удаляем: получатель может читать их ещё несколько секунд
 * после закрытия системного окна, а временную папку чистит система.
 */
async function writePhotosToCache(images: Blob[]): Promise<string[]> {
  const uris: string[] = []

  for (const [index, photo] of images.entries()) {
    const path = `${SHARE_CACHE_FOLDER}/${toShareFileName(index)}`

    try {
      await Filesystem.writeFile({
        path,
        data: await blobToBase64(photo),
        directory: Directory.Cache,
        recursive: true,
      })

      const { uri } = await Filesystem.getUri({ path, directory: Directory.Cache })
      uris.push(uri)
    } catch (error) {
      console.error('taskShare: не удалось подготовить снимок к отправке', error)
    }
  }

  return uris
}

// --- Браузер: системное окно «Поделиться» с файлами ---

/** Снимок задания в виде файла: имя файла видит получатель и система */
function toShareFile(photo: Blob, index: number): File {
  return new File([photo], toShareFileName(index), { type: photo.type || 'image/jpeg' })
}

/**
 * Имя снимка в пачке: время отправки разводит снимки между собой,
 * а порядковый номер сохраняет их порядок в галерее задания.
 */
function toShareFileName(index: number): string {
  return buildPhotoFileName(new Date(), String(index + 1))
}

/** Поддерживает ли браузер передачу файлов через системное окно «Поделиться» */
function canShareFiles(files: File[]): boolean {
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
    return false
  }

  try {
    return navigator.canShare({ files })
  } catch (error) {
    console.warn('taskShare: проверка системного окна «Поделиться» не удалась', error)
    return false
  }
}

// --- Telegram Mini App, WebView и настольный браузер: ссылка мессенджера ---

/**
 * Окружения, которым файлы передать нечем: открываем окно выбора чата ссылкой
 * мессенджера (подпись подставляется в сообщение), а снимки сохраняем в память
 * устройства — из галереи их можно прикрепить к тому же сообщению.
 */
async function shareTaskByLink(
  caption: string,
  images: Blob[],
  target: TaskShareTarget,
  label: string,
  openLink: TaskShareLinkOpener,
): Promise<TaskShareResult> {
  const saved = images.length ? await savePhotosForManualAttach(images) : null

  // Системного окна нет: подпись кладём в буфер обмена
  if (target === 'system') {
    const copied = await copyToClipboard(caption)

    if (!saved) {
      return copied
        ? { ok: true, message: 'Подпись скопирована в буфер обмена' }
        : { ok: false, message: 'Системное окно «Поделиться» недоступно' }
    }

    return {
      ok: true,
      message: copied
        ? `Снимки сохранены: ${saved}, подпись — в буфере обмена`
        : `Снимки сохранены: ${saved}`,
    }
  }

  const opened = await openLink(messengerUrl(target, caption))
  if (!opened) return { ok: false, message: `Не удалось открыть ${label}` }

  return {
    ok: true,
    message: saved
      ? `Открывается ${label}. Снимки сохранены: ${saved} — прикрепите их к сообщению`
      : `Открывается ${label}: подпись уже вставлена в сообщение`,
  }
}

/** Ссылка «поделиться» выбранного мессенджера: открывает его окно выбора чата */
function messengerUrl(target: TaskShareTarget, caption: string): string {
  const text = encodeURIComponent(caption)

  switch (target) {
    case 'telegram':
      // В нативной сборке приложение открывается напрямую, в браузере и Mini App — по https
      return Capacitor.isNativePlatform()
        ? `tg://msg_url?text=${text}`
        : `https://t.me/share/url?text=${text}`
    case 'whatsapp':
      return `https://wa.me/?text=${text}`
    case 'max':
      return `https://max.ru/:share?text=${text}`
    default:
      return ''
  }
}

/**
 * Сохранение снимков в память устройства для прикрепления вручную.
 * Возвращает место сохранения (для сообщения) — null, если сохранить не удалось.
 */
async function savePhotosForManualAttach(images: Blob[]): Promise<string | null> {
  let location: string | null = null

  for (const [index, photo] of images.entries()) {
    const saved = await savePhotoToDevice(photo, toShareFileName(index))
    if (saved.ok && saved.location) location = saved.location
  }

  return location
}

/** Подпись в буфер обмена: в окружениях без системного окна это единственный выход */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (error) {
    console.warn('taskShare: не удалось скопировать подпись', error)
    return false
  }
}

/** Чтение снимка по внутренней ссылке приложения (objectURL) */
async function fetchBlob(url: string): Promise<Blob | null> {
  try {
    const response = await fetch(url)
    return await response.blob()
  } catch (error) {
    console.error('taskShare: не удалось прочитать снимок задания', error)
    return null
  }
}

/** Пользователь закрыл системное окно сам — это не ошибка */
function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError'
}
