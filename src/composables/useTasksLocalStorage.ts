import { LocalStorageNames, TaskTag } from '@/model/Enums.ts'
import { PointResponse } from '@/model/PointResponse.ts'
import { storage } from '@/utils/storage.ts'
import { clearPhotos } from '@/utils/photoStorage.ts'

export function useTasksLocalStorage() {
  const getItems = async (): Promise<PointResponse[]> => {
    const cachedData = await storage.get<PointResponse[]>(LocalStorageNames.CACHE_TASKS)

    if (cachedData) {
      console.log('TasksLocalStorage: Данные из хранилища')
      return cachedData
    } else return [] as PointResponse[]
  }

  async function setItems(taskItems: PointResponse[]): Promise<boolean> {
    try {
      await storage.set(LocalStorageNames.CACHE_TASKS, taskItems)
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  async function removeItems(): Promise<boolean> {
    try {
      await storage.remove(LocalStorageNames.CACHE_TASKS)
      await storage.remove(LocalStorageNames.COMPLETED_TASKS)
      await storage.remove(LocalStorageNames.TASK_TAGS)
      await storage.remove(LocalStorageNames.TASK_NOTES)
      await clearPhotos()
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  async function getCompletedTasks(): Promise<string[]> {
    const completed = await storage.get<string[]>(LocalStorageNames.COMPLETED_TASKS)
    return completed ?? []
  }

  async function setCompletedTask(uid: string, completed: boolean): Promise<boolean> {
    try {
      const completedTasks = await getCompletedTasks()
      const updated = completed
        ? Array.from(new Set([...completedTasks, uid]))
        : completedTasks.filter((item) => item !== uid)
      await storage.set(LocalStorageNames.COMPLETED_TASKS, updated)
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  async function getTaskTags(): Promise<Record<string, TaskTag>> {
    const tags = await storage.get<Record<string, TaskTag>>(LocalStorageNames.TASK_TAGS)
    return tags ?? {}
  }

  async function setTaskTag(uid: string, tag: TaskTag | null): Promise<boolean> {
    try {
      const tags = await getTaskTags()
      if (tag) {
        tags[uid] = tag
      } else {
        delete tags[uid]
      }
      await storage.set(LocalStorageNames.TASK_TAGS, tags)
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  async function getTaskNotes(): Promise<Record<string, string>> {
    const notes = await storage.get<Record<string, string>>(LocalStorageNames.TASK_NOTES)
    return notes ?? {}
  }

  async function setTaskNote(uid: string, note: string | null): Promise<boolean> {
    try {
      const notes = await getTaskNotes()
      if (note) {
        notes[uid] = note
      } else {
        delete notes[uid]
      }
      await storage.set(LocalStorageNames.TASK_NOTES, notes)
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  return {
    getItems,
    setItems,
    removeItems,
    getCompletedTasks,
    setCompletedTask,
    getTaskTags,
    setTaskTag,
    getTaskNotes,
    setTaskNote,
  }
}
