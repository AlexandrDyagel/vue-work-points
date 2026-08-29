import { PointResponse } from '@/model/PointResponse.ts'
import { getPoints, lastUpdatedPoints } from '../../firebase/init.ts'
import { LocalStorageNames } from '@/model/Enums.ts'
import { ref, type Ref } from 'vue'
import { storage } from '@/utils/storage.ts'
import { getPointsFromJson } from '@/utils/getPointsFromJson.ts'

export function useCache() {
  /**
   * Получаем данные из хранилища, если они есть.
   * Если данных нет, то получаем их из интернета, сохраняем в хранилище и отдаём.
   */
  const obtainCachedPoints = async (): Promise<PointResponse[]> => {
    // Пытаемся получить данные из хранилища по ключу
    const cachedData = await storage.get<PointResponse[]>(LocalStorageNames.CACHE_POINTS)

    // Проверяем, существуют ли данные в кэше
    if (cachedData) {
      console.log('Данные точек из кэша')
      return cachedData
    } else {
      // Если данных в кэше нет, делаем запрос к серверу за данными
      try {
        const data = await getPoints()
        await storage.set(LocalStorageNames.CACHE_POINTS, data)
        console.log('Данные из интернета. Сохраняется в кэш')
        return data
      } catch (error) {
        console.error(`Ошибка error getPoints(): ${error}`)

        // Если не удалось получить данные с сервера, берём их из локального файла
        const dataFromJson = await getPointsFromJson()
        await storage.set(LocalStorageNames.CACHE_POINTS, dataFromJson)
        console.log('Данные из локального файла points.json')
        return dataFromJson
      }
    }
  }

  const clearCachePoints = async () => {
    await storage.remove(LocalStorageNames.CACHE_POINTS)
    console.log('Кэш точек очищен')
  }

  /**
   * Проверка последнего обновления данных
   * @returns true (есть обновления)
   */
  const checkForUpdate = async () => {
    const lastUpdateTime: Ref<string | null> = ref(null)

    await lastUpdatedPoints()
      .then((lastUpdateFromDb) => {
        lastUpdateTime.value = lastUpdateFromDb
      })
      .catch((error) => console.error('Ошибка получения времени последнего обновления: ', error))

    console.log('Время последнего обновления в БД: ', lastUpdateTime.value)

    const cachedLastUpdateTime = await storage.get<string>(LocalStorageNames.LAST_UPDATE_TIME)

    // Проверяем, существуют ли данные в кэше
    if (cachedLastUpdateTime) {
      console.log('В хранилище существует запись времени последнего обновления данных')
      console.log('Время последнего обновления в приложении: ', cachedLastUpdateTime)

      return lastUpdateTime.value !== cachedLastUpdateTime
    } else {
      console.log('В хранилище не существует записи о времени последнего обновления данных')

      const cachedDataPoints = await obtainCachedPoints()
      const lastUpdatedAt = cachedDataPoints.sort(
        (a, b) => Number(b.updatedAt) - Number(a.updatedAt),
      )[0]?.updatedAt

      if (lastUpdatedAt) {
        await storage.set(LocalStorageNames.LAST_UPDATE_TIME, lastUpdatedAt)
        console.log('В хранилище добавлена запись о времени последнего обновления данных')
      }

      const stored = await storage.get<string>(LocalStorageNames.LAST_UPDATE_TIME)
      return lastUpdateTime.value !== stored
    }
  }

  async function setLastUpdateDataPoints(dateUpdate: string) {
    await storage.set(LocalStorageNames.LAST_UPDATE_TIME, dateUpdate)
  }

  async function removeLastUpdateDataPoints() {
    await storage.remove(LocalStorageNames.LAST_UPDATE_TIME)
  }

  /**
   * Получение актуальных данных точек с сервера.
   * При ошибке сети возвращаем данные из локального файла points.json.
   */
  async function refreshPoints(): Promise<PointResponse[]> {
    try {
      const data = await getPoints()
      await storage.set(LocalStorageNames.CACHE_POINTS, data)
      console.log('Данные точек обновлены из Firestore')
      return data
    } catch (error) {
      console.error(`Ошибка getPoints(): ${error}`)

      const dataFromJson = await getPointsFromJson()
      await storage.set(LocalStorageNames.CACHE_POINTS, dataFromJson)
      console.log('Данные точек загружены из локального файла points.json')
      return dataFromJson
    }
  }

  /**
   * Время последнего обновления данных в БД.
   */
  async function getLastUpdateTime(): Promise<string | null> {
    try {
      return await lastUpdatedPoints()
    } catch (error) {
      console.error('Ошибка получения времени последнего обновления: ', error)
      return null
    }
  }

  return {
    obtainCachedPoints,
    clearCachePoints,
    checkForUpdate,
    setLastUpdateDataPoints,
    removeLastUpdateDataPoints,
    refreshPoints,
    getLastUpdateTime,
  }
}
