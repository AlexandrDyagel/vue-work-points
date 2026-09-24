import { LocalStorageNames } from '@/model/Enums.ts'
import type { TaskPhoto } from '@/model/TaskPhoto.ts'
import { blobToDataUrl, dataUrlToBlob } from '@/utils/image.ts'
import { storage } from '@/utils/storage.ts'

/**
 * Хранилище фотографий заданий.
 *
 * Основное хранилище — IndexedDB: оно доступно в обычном браузере,
 * в Telegram Mini App и в WebView нативной сборки Capacitor (Android/iOS),
 * и позволяет держать изображения бинарным Blob'ом, не переполняя localStorage.
 *
 * Если IndexedDB недоступна (приватный режим, ограничения WebView),
 * используется резервный вариант — storage (Preferences/localStorage) с dataURL.
 */

const DB_NAME = 'vue-work-points'
const DB_VERSION = 1
const STORE_NAME = 'task_photos'
const UID_INDEX = 'uid'

/** Запись фотографии в резервном хранилище */
interface FallbackPhoto {
  id: string
  uid: string
  createdAt: number
  dataUrl: string
}

let dbPromise: Promise<IDBDatabase | null> | null = null

/** Доступна ли IndexedDB в текущем окружении */
function isIndexedDbAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null
  } catch {
    return false
  }
}

/** Открытие базы данных (создаётся при первом запуске) */
function openDatabase(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve) => {
    if (!isIndexedDbAvailable()) {
      console.warn('photoStorage: IndexedDB недоступна, используется резервное хранилище')
      resolve(null)
      return
    }

    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = () => {
        const db = request.result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
          store.createIndex(UID_INDEX, 'uid', { unique: false })
        }
      }

      request.onsuccess = () => {
        const db = request.result
        db.onversionchange = () => db.close()
        resolve(db)
      }

      request.onerror = () => {
        console.error('photoStorage: ошибка открытия IndexedDB', request.error)
        resolve(null)
      }

      request.onblocked = () => {
        console.warn('photoStorage: открытие IndexedDB заблокировано')
        resolve(null)
      }
    } catch (error) {
      console.error('photoStorage: IndexedDB недоступна', error)
      resolve(null)
    }
  })

  return dbPromise
}

/** Promise-обёртка для IDBRequest */
function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** Выполнение операции в IndexedDB: null, если база недоступна или операция упала */
async function withDatabase<T>(operation: (db: IDBDatabase) => Promise<T>): Promise<T | null> {
  const db = await openDatabase()
  if (!db) return null

  try {
    return await operation(db)
  } catch (error) {
    console.error('photoStorage: ошибка операции IndexedDB', error)
    return null
  }
}

/** Сортировка фотографий по времени добавления */
function sortPhotos(photos: TaskPhoto[]): TaskPhoto[] {
  return [...photos].sort((first, second) => first.createdAt - second.createdAt)
}

function createPhotoId(): string {
  return `photo_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

// --- Резервное хранилище (storage: Preferences/localStorage) ---

async function getFallbackPhotos(): Promise<FallbackPhoto[]> {
  const records = await storage.get<FallbackPhoto[]>(LocalStorageNames.TASK_PHOTOS)
  return records ?? []
}

async function saveFallbackPhotos(records: FallbackPhoto[]): Promise<void> {
  await storage.set(LocalStorageNames.TASK_PHOTOS, records)
}

async function fallbackToTaskPhoto(record: FallbackPhoto): Promise<TaskPhoto> {
  return {
    id: record.id,
    uid: record.uid,
    createdAt: record.createdAt,
    blob: dataUrlToBlob(record.dataUrl),
  }
}

// --- Публичное API ---

/** Добавление фотографии к заданию */
export async function addPhoto(uid: string, blob: Blob): Promise<TaskPhoto> {
  const photo: TaskPhoto = { id: createPhotoId(), uid, createdAt: Date.now(), blob }

  const added = await withDatabase(async (db) => {
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
    await requestToPromise(store.add(photo))
    return true
  })

  if (added) return photo

  const records = await getFallbackPhotos()
  records.push({
    id: photo.id,
    uid,
    createdAt: photo.createdAt,
    dataUrl: await blobToDataUrl(blob),
  })
  await saveFallbackPhotos(records)
  return photo
}

/** Все фотографии одного задания */
export async function getPhotos(uid: string): Promise<TaskPhoto[]> {
  const photos = await withDatabase(async (db) => {
    const index = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).index(UID_INDEX)
    return await requestToPromise<TaskPhoto[]>(index.getAll(uid))
  })

  if (photos) return sortPhotos(photos)

  const records = await getFallbackPhotos()
  const fallback = await Promise.all(
    records.filter((record) => record.uid === uid).map(fallbackToTaskPhoto),
  )
  return sortPhotos(fallback)
}

/** Все фотографии заданий (используется при открытии списка заданий) */
export async function getAllPhotos(): Promise<TaskPhoto[]> {
  const photos = await withDatabase(async (db) => {
    const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME)
    return await requestToPromise<TaskPhoto[]>(store.getAll())
  })

  if (photos) return sortPhotos(photos)

  const records = await getFallbackPhotos()
  return sortPhotos(await Promise.all(records.map(fallbackToTaskPhoto)))
}

/** Удаление одной фотографии */
export async function deletePhoto(id: string): Promise<void> {
  const deletedFromDatabase = await withDatabase(async (db) => {
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
    await requestToPromise(store.delete(id))
    return true
  })

  // Если основное хранилище доступно, резервное не трогаем
  if (deletedFromDatabase) return

  const records = await getFallbackPhotos()
  const rest = records.filter((record) => record.id !== id)
  if (rest.length !== records.length) await saveFallbackPhotos(rest)
}

/** Удаление всех фотографий одного задания */
export async function deletePhotosByUid(uid: string): Promise<void> {
  const deletedFromDatabase = await withDatabase(async (db) => {
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
    const keys = await requestToPromise<IDBValidKey[]>(store.index(UID_INDEX).getAllKeys(uid))
    await Promise.all(keys.map((key) => requestToPromise(store.delete(key))))
    return true
  })

  // Если основное хранилище доступно, резервное не трогаем
  if (deletedFromDatabase) return

  const records = await getFallbackPhotos()
  const rest = records.filter((record) => record.uid !== uid)
  if (rest.length !== records.length) await saveFallbackPhotos(rest)
}

/** Полная очистка фотографий (например, при удалении всех заданий) */
export async function clearPhotos(): Promise<void> {
  await withDatabase(async (db) => {
    const store = db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME)
    await requestToPromise(store.clear())
    return true
  })

  // Чистим и резервное хранилище: там могли остаться данные с прошлых запусков
  try {
    await storage.remove(LocalStorageNames.TASK_PHOTOS)
  } catch (error) {
    console.error('photoStorage: не удалось очистить резервное хранилище', error)
  }
}
