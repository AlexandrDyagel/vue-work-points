import { LocalStorageNames } from '@/model/Enums.ts'
import { PointResponse } from '@/model/PointResponse.ts'

export function useTasksLocalStorage() {
  if (typeof (Storage) !== 'undefined') {
    console.log('localStorage поддерживается')
  } else {
    console.log('localStorage не поддерживается')
  }

  const getItems = (): PointResponse[] => {
    const cachedData = localStorage.getItem(LocalStorageNames.CACHE_TASKS)

    // Проверяем, существуют ли данные в кэше
    if (cachedData) {
      console.log('TasksLocalStorage: Данные из LocalStorage')
      return JSON.parse(cachedData) as PointResponse[]
    } else return [] as PointResponse[]
  }

  function setItems(taskItems: PointResponse[]): boolean {
    try {
      localStorage.setItem(LocalStorageNames.CACHE_TASKS, JSON.stringify(taskItems))
      return true
    } catch (error) {
      console.error('TasksLocalStorage: ', error)
      return false
    }
  }

  return {
    getItems,
    setItems,
  }
}
