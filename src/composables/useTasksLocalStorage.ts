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
  }
}
