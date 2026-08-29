import { LocalStorageNames } from '@/model/Enums.ts'
import { PointResponse } from '@/model/PointResponse.ts'
import { storage } from '@/utils/storage.ts'

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

  return {
    getItems,
    setItems,
    removeItems,
    getCompletedTasks,
    setCompletedTask,
  }
}
