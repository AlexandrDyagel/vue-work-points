import { LocalStorageNames, TaskListSort } from '@/model/Enums.ts'
import { storage } from '@/utils/storage.ts'

/** Настройки отображения списка заданий */
export interface TasksViewSettings {
  /** Порядок заданий в списке */
  sort: TaskListSort
  /** Группировать задания по направлению */
  groupByDirection: boolean
  /** Компактный вид карточек */
  compact: boolean
}

const DEFAULT_SETTINGS: TasksViewSettings = {
  sort: TaskListSort.ADDED,
  groupByDirection: false,
  compact: false,
}

/**
 * Хранение настроек отображения списка заданий.
 * Настройки общие для устройства/аккаунта (как и выбранный фильтр поиска точек).
 */
export function useTasksViewSettings() {
  const getSettings = async (): Promise<TasksViewSettings> => {
    const stored = await storage.get<Partial<TasksViewSettings>>(LocalStorageNames.TASKS_VIEW)
    return { ...DEFAULT_SETTINGS, ...(stored ?? {}) }
  }

  const saveSettings = async (settings: TasksViewSettings): Promise<void> => {
    await storage.set(LocalStorageNames.TASKS_VIEW, settings)
  }

  return {
    getSettings,
    saveSettings,
  }
}
