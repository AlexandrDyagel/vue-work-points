import { ref, type Ref } from 'vue'
import { LocalStorageNames } from '@/model/Enums.ts'
import { storage } from '@/utils/storage.ts'

/** Настройки сохранения снимков камеры */
export interface PhotoSaveSettings {
  /**
   * Сохранять снимок камеры в память устройства (папка `Perehody-Tonneli`
   * в галерее/файлах) в дополнение к фотографии задания.
   */
  saveToDevice: boolean
}

const DEFAULT_SETTINGS: PhotoSaveSettings = { saveToDevice: true }

/**
 * Текущие настройки. Состояние модульное — как счётчик модальных окон в
 * `useModalLayer`: значение общее для всего приложения, потому что его читает и
 * страница настроек (переключатель), и съёмка (`TaskPhotoGallery`), а решение
 * «сохранять или нет» принимается синхронно в момент снимка.
 */
const settings: Ref<PhotoSaveSettings> = ref({ ...DEFAULT_SETTINGS })

/** Настройки уже прочитаны из хранилища */
let isLoaded = false

/** Незавершённое чтение: параллельные вызовы ждут одно и то же */
let loading: Promise<PhotoSaveSettings> | null = null

/**
 * Хранение настройки «сохранять снимки в память устройства».
 *
 * Настройка общая для устройства (как и остальные настройки приложения) и
 * по умолчанию включена: системная камера сохраняет снимки сама, а съёмка
 * внутри приложения — только по нашей просьбе.
 */
export function usePhotoSaveSettings() {
  /** Чтение настроек из хранилища. Ошибка хранилища настройку не ломает */
  const loadSettings = async (): Promise<PhotoSaveSettings> => {
    try {
      const stored = await storage.get<Partial<PhotoSaveSettings>>(LocalStorageNames.PHOTO_SAVE)
      settings.value = { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
    } catch (error) {
      console.error('photoSaveSettings: не удалось прочитать настройки', error)
      settings.value = { ...DEFAULT_SETTINGS }
    }

    isLoaded = true
    return settings.value
  }

  /** Прочитать настройки один раз за запуск (повторные вызовы переиспользуют чтение) */
  const ensureSettings = async (): Promise<PhotoSaveSettings> => {
    if (isLoaded) return settings.value

    loading ??= loadSettings().finally(() => {
      loading = null
    })

    await loading
    return settings.value
  }

  const saveSettings = async (next: PhotoSaveSettings): Promise<void> => {
    settings.value = { ...next }
    isLoaded = true
    await storage.set(LocalStorageNames.PHOTO_SAVE, settings.value)
  }

  /** Переключатель в настройках: включить или выключить сохранение снимков */
  const setSaveToDevice = async (value: boolean): Promise<void> =>
    saveSettings({ ...settings.value, saveToDevice: value })

  /** Сброс к значению по умолчанию (полный сброс настроек в TgSettingsAppView) */
  const resetSettings = async (): Promise<void> => {
    settings.value = { ...DEFAULT_SETTINGS }
    isLoaded = true
    await storage.remove(LocalStorageNames.PHOTO_SAVE)
  }

  /**
   * Сохранять ли снимок в память устройства. Читается синхронно: в момент
   * съёмки решение нужно сразу, без ожидания хранилища.
   */
  const shouldSaveToDevice = (): boolean => settings.value.saveToDevice

  return {
    /** Текущие настройки: страница настроек показывает по ним переключатель */
    settings,
    loadSettings,
    ensureSettings,
    saveSettings,
    setSaveToDevice,
    resetSettings,
    shouldSaveToDevice,
  }
}
