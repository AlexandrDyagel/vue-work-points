/**
 * Сохранение снимка в память устройства.
 *
 * Снимок, сделанный камерой внутри приложения, попадает не только в задание
 * (IndexedDB / локальное хранилище), но и в обычную память устройства: так
 * фотографию можно найти в галерее или файловом менеджере сразу после съёмки,
 * а также отправить её кому угодно без запуска приложения.
 *
 * Способы сохранения зависят от платформы:
 *  - нативная сборка Capacitor (Android/iOS) — плагин Filesystem: файл пишется
 *    в папку `Perehody-Tonneli` в «Картинках» (Pictures), на Android он попадает
 *    в индекс медиа (MediaScanner), поэтому виден в галерее;
 *  - обычный браузер — скачивание файла (папка «Загрузки»);
 *  - Telegram Mini App — системное окно «Поделиться» (родное окно загрузки
 *    Telegram работает только по https-ссылке на файл), затем скачивание.
 *
 * Снимок сохраняется в том разрешении, в котором его отдала камера: уменьшения
 * при съёмке нет (`grabVideoFrame` с `preserveSize`), в память устройства
 * попадает полноразмерный оригинал. Отдельно снимок задания ужимается общим
 * конвейером фотографий (`compressImage`).
 */

import { Capacitor } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { blobToBase64 } from '@/utils/image.ts'

/**
 * Имя папки со снимками в памяти устройства.
 * Латиница намеренно: с таким именем снимки видны в галерее и файловых
 * менеджерах одинаково на всех устройствах, без сбоев кодировки.
 */
export const PHOTO_SAVE_FOLDER = 'Perehody-Tonneli'

/** Префикс имени файла: папку и снимки в ней легко узнать по общему имени */
const PHOTO_FILE_PREFIX = 'IMG-PT'

/** Сколько живёт blob-ссылка на снимок: браузер может читать файл не мгновенно */
const OBJECT_URL_LIFETIME_MS = 60_000

/** Результат сохранения: готовое сообщение показывается пользователю */
export interface SavePhotoResult {
  /** Снимок сохранён на устройстве */
  ok: boolean
  /** Текст для пользователя (пустая строка — сообщать нечего) */
  message: string
  /**
   * Куда попал снимок: «Картинки/Perehody-Tonneli», «Загрузки» и т.п.
   * Нужно там, где о месте сохранения сообщает вызывающий код (отправка
   * пачки фотографий задания в мессенджер).
   */
  location?: string
}

const NOT_SAVED_MESSAGE = 'Не удалось сохранить снимок в память устройства'

/**
 * Имя файла снимка: понятное человеку и уникальное (дата и время съёмки).
 * `suffix` разводит снимки одной пачки (фотографии задания отправляются
 * несколькими файлами, и без него они затирали бы друг друга).
 */
export function buildPhotoFileName(date: Date = new Date(), suffix = ''): string {
  const pad = (value: number): string => String(value).padStart(2, '0')
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const time = `${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`
  const tail = suffix ? `_${suffix}` : ''
  return `${PHOTO_FILE_PREFIX}_${day}_${time}${tail}.jpg`
}

/**
 * Сохраняет снимок в память устройства.
 * Ошибка сохранения не прерывает съёмку, поэтому исключения наружу не выходят.
 */
export async function savePhotoToDevice(
  blob: Blob,
  fileName: string = buildPhotoFileName(),
): Promise<SavePhotoResult> {
  try {
    if (!blob.size) return { ok: false, message: NOT_SAVED_MESSAGE }

    return Capacitor.isNativePlatform()
      ? await savePhotoNative(blob, fileName)
      : await savePhotoWeb(blob, fileName)
  } catch (error) {
    console.error('photoSave: не удалось сохранить снимок в память устройства', error)
    return { ok: false, message: NOT_SAVED_MESSAGE }
  }
}

// --- Нативная сборка (Android/iOS): плагин Filesystem ---

/** Папка общих изображений устройства: её содержимое показывают галереи */
const PICTURES_FOLDER = 'Pictures'

/** Вариант сохранения снимка в память устройства */
interface NativeSaveTarget {
  /** Папка из набора Capacitor Filesystem */
  directory: Directory
  /** Путь к файлу относительно папки */
  path: string
  /** Запрашивать ли разрешение на запись в общую память (Android 10 и старше) */
  askPermissions: boolean
  /** Расположение файла для сообщения пользователю */
  location: string
}

/**
 * Нативная сборка: файл пишется на диск средствами плагина Filesystem.
 *
 * Варианты идут от лучшего к запасному. «Картинки» и «Документы» — общая память
 * устройства: плагин доиндексирует записанный файл (MediaScanner), поэтому снимок
 * виден и в галерее, и в файловом менеджере. Личная папка приложения — последний
 * рубеж, доступный на любой версии Android.
 *
 * Целевая платформа проекта — Android; на iOS «Документы» означают личную папку
 * приложения, доступную из «Файлов» только при её открытии приложением.
 */
async function savePhotoNative(blob: Blob, fileName: string): Promise<SavePhotoResult> {
  const data = await blobToBase64(blob)
  if (!data) return { ok: false, message: NOT_SAVED_MESSAGE }

  const targets: NativeSaveTarget[] = [
    {
      // «Картинки» (Pictures) — общая папка изображений: снимок сразу в галерее
      directory: Directory.ExternalStorage,
      path: `${PICTURES_FOLDER}/${PHOTO_SAVE_FOLDER}/${fileName}`,
      askPermissions: true,
      location: `Картинки/${PHOTO_SAVE_FOLDER}`,
    },
    {
      // «Документы» (Documents) — общая папка документов: снимок виден в файлах
      directory: Directory.Documents,
      path: `${PHOTO_SAVE_FOLDER}/${fileName}`,
      askPermissions: true,
      location: `Документы/${PHOTO_SAVE_FOLDER}`,
    },
    {
      // Личная папка приложения: доступна всегда, но не видна в галерее
      directory: Directory.External,
      path: `${PHOTO_SAVE_FOLDER}/${fileName}`,
      askPermissions: false,
      location: 'папка приложения',
    },
  ]

  for (const target of targets) {
    const saved = await writeNativeFile(target.path, data, target.directory, target.askPermissions)
    if (saved) {
      return {
        ok: true,
        message: `Снимок сохранён на устройство: ${target.location}`,
        location: target.location,
      }
    }
  }

  return { ok: false, message: NOT_SAVED_MESSAGE }
}

/**
 * Запись файла плагином Filesystem.
 * Если запись не удалась, а разрешение ещё не выдано — запрашивает его и
 * повторяет попытку: на Android 10 и старше без него доступ к памяти закрыт.
 */
async function writeNativeFile(
  path: string,
  data: string,
  directory: Directory,
  askPermissions: boolean,
): Promise<boolean> {
  const write = (): Promise<unknown> =>
    Filesystem.writeFile({ path, data, directory, recursive: true })

  try {
    await write()
    return true
  } catch (error) {
    console.warn(`photoSave: не удалось записать снимок в ${directory}`, error)
  }

  if (!askPermissions) return false
  if (!(await requestStoragePermission())) return false

  try {
    await write()
    return true
  } catch (error) {
    console.warn(`photoSave: запись снимка в ${directory} не удалась и после разрешения`, error)
    return false
  }
}

/** Разрешение на запись в общую память (нужно только Android 10 и старше) */
async function requestStoragePermission(): Promise<boolean> {
  try {
    const status = await Filesystem.checkPermissions()
    if (status.publicStorage === 'granted') return true

    const requested = await Filesystem.requestPermissions()
    return requested.publicStorage === 'granted'
  } catch (error) {
    console.warn('photoSave: не удалось получить доступ к памяти устройства', error)
    return false
  }
}

// --- Браузер, Telegram Mini App и WebView: средствами веб-платформы ---

/** Веб: сохранение доступными браузеру способами (от лучшего к запасному) */
async function savePhotoWeb(blob: Blob, fileName: string): Promise<SavePhotoResult> {
  const file = new File([blob], fileName, { type: blob.type || 'image/jpeg' })

  // В Telegram Mini App первым идёт системное окно «Поделиться»: обычное
  // скачивание ссылок в WebView работает не всегда, а в этом окне снимок можно
  // и сохранить в файлы, и отправить в любой чат
  if (isTelegramMiniApp()) {
    const sharedInTelegram = await sharePhotoFile(file)
    if (sharedInTelegram) return sharedInTelegram
  }

  // Обычный браузер: скачивание файла в папку «Загрузки»
  if (supportsDownloadAttribute()) {
    downloadBlob(blob, fileName)
    return {
      ok: true,
      message: 'Снимок сохранён на устройство: папка «Загрузки»',
      location: 'папка «Загрузки»',
    }
  }

  // Мобильные WebView без скачивания: системное окно «Поделиться»
  const shared = await sharePhotoFile(file)
  if (shared) return shared

  // Последний вариант: снимок открывается в новом окне,
  // сохранить его можно долгим нажатием
  return openPhotoInNewTab(blob)
}

/**
 * Запущено ли приложение внутри Telegram Mini App.
 *
 * Родное окно Telegram «скачать файл» (WebApp.downloadFile, Bot API 8.0) здесь не
 * помогает: клиенту передаётся ссылка на файл, и telegram-web-app.js принимает
 * только https (blob и data URL он отвергает с WebAppDownloadFileParamInvalid).
 * Снимок у нас хранится в памяти, поэтому в Mini App сохраняем его средствами
 * браузера, как и в обычном WebView.
 *
 * Проверка повторяет usePlatform: initData заполняется только при запуске из Telegram.
 */
function isTelegramMiniApp(): boolean {
  if (typeof window === 'undefined') return false

  const telegram = (window as { Telegram?: { WebApp?: { initData?: string } } }).Telegram
  return Boolean(telegram?.WebApp?.initData)
}

/** Умеет ли браузер скачивать файл по ссылке (папка «Загрузки») */
function supportsDownloadAttribute(): boolean {
  return typeof document !== 'undefined' && 'download' in document.createElement('a')
}

/** Скачивание файла ссылкой с атрибутом download */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.rel = 'noopener'
  link.style.display = 'none'

  document.body.appendChild(link)
  link.click()
  link.remove()
  releaseObjectUrl(url)
}

/**
 * Системное окно «Поделиться»: пользователь сам выбирает, куда сохранить снимок.
 * Возвращает null, если окно недоступно, и пустое сообщение, если пользователь
 * закрыл его, ничего не выбрав (это не ошибка и сообщать о ней не нужно).
 */
async function sharePhotoFile(file: File): Promise<SavePhotoResult | null> {
  if (!canShareFiles(file)) return null

  try {
    await navigator.share({ files: [file] })
    return { ok: true, message: 'Снимок сохранён на устройство' }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return { ok: false, message: '' }

    console.warn('photoSave: не удалось поделиться снимком', error)
    return null
  }
}

/** Поддерживает ли браузер передачу файлов через системное окно «Поделиться» */
function canShareFiles(file: File): boolean {
  if (typeof navigator.canShare !== 'function' || typeof navigator.share !== 'function') {
    return false
  }

  try {
    return navigator.canShare({ files: [file] })
  } catch (error) {
    console.warn('photoSave: проверка системного окна «Поделиться» не удалась', error)
    return false
  }
}

/** Крайний случай: снимок в новом окне, сохранить его можно долгим нажатием */
function openPhotoInNewTab(blob: Blob): SavePhotoResult {
  const url = URL.createObjectURL(blob)
  const opened = window.open(url, '_blank')
  releaseObjectUrl(url)

  if (!opened) return { ok: false, message: NOT_SAVED_MESSAGE }

  return { ok: true, message: 'Снимок открыт в новом окне — сохраните его долгим нажатием' }
}

/** Освобождение blob-ссылки: браузер читает файл по ней не мгновенно */
function releaseObjectUrl(url: string) {
  setTimeout(() => URL.revokeObjectURL(url), OBJECT_URL_LIFETIME_MS)
}
