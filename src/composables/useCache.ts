import { PointResponse } from '@/model/PointResponse.ts'
import { getPoints } from '../../firebase/init.ts'
import { LocalStorageNames } from '@/model/Enums.ts'

export function useCache() {
  if (typeof (Storage) !== 'undefined') {
    console.log('localStorage поддерживается')
  } else {
    console.log('localStorage не поддерживается')
  }

  const obtainCachedPoints = async (): Promise<PointResponse[]> => {
    // Пытаемся получить данные из localStorage по ключу 'cache_points' => LocalStorageNames.CACHE_POINTS
    const cachedData = localStorage.getItem(LocalStorageNames.CACHE_POINTS)

    // Проверяем, существуют ли данные в кэше
    if (cachedData) {
      console.log('obtainCachedPoints: Данные из LocalStorage')
      // Если данные существуют, преобразуем их из строки в объект или массив и обрабатываем
      return JSON.parse(cachedData) as PointResponse[]
    } else {
      // Если данных в кэше нет, делаем запрос к серверу за данными
      await getPoints()
        .then((data: PointResponse[]) => {
            // После получения данных сохраним их в localStorage для дальнейшего использования
            localStorage.setItem(LocalStorageNames.CACHE_POINTS, JSON.stringify(data))
          },
          error => {
            console.log(`Ошибка error getPoints(): ${error}`)
          })
      const cachedData = localStorage.getItem(LocalStorageNames.CACHE_POINTS)!
      console.log('obtainCachedPoints: Данные из интернета и потом из localStorage')
      return JSON.parse(cachedData) as PointResponse[]
    }
  }

  const clearCachePoints = () => localStorage.removeItem(LocalStorageNames.CACHE_POINTS)

  /*const checkForUpdate = async () => {
    const isNewUpdate = ref(false)
    const lastUpdate: Ref<LastUpdate> = ref(new LastUpdate())
    const cachedLastUpdateTime = localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)

    if (typeof cachedLastUpdateTime !== 'undefined' && cachedLastUpdateTime) {
      const lastUpdateTimeStorage = JSON.parse(cachedLastUpdateTime) as LastUpdate
      console.log('lastUpdateTimeStorage.lastForUpdate ' + JSON.parse(localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)!))

      await lastUpdateTime()
        .then((data: LastUpdate) => {
            lastUpdate.value = data

            if (lastUpdateTimeStorage.lastForUpdate === lastUpdate.value.lastForUpdate && typeof lastUpdate.value.lastForUpdate !== undefined ) {
              console.log('Нет новых обновлений')
              isNewUpdate.value = false
            } else {

              console.log('1 - ' + lastUpdateTimeStorage.lastForUpdate)
              console.log('2 - ' + lastUpdate.value.lastForUpdate)
              isNewUpdate.value = true
            }
          },
          error => {
            console.log(`Ошибка error lastUpdateTime(): ${error}`)
          })

      if (isNewUpdate.value) {
        console.log('Обновление данных...')

        await getPoints()
          .then((data: PointResponse[]) => {
              // После получения данных сохраним их в localStorage для дальнейшего использования
              clearCachePoints()
              localStorage.setItem(LocalStorageNames.CACHE_POINTS, JSON.stringify(data))
              localStorage.setItem(LocalStorageNames.LAST_UPDATE_TIME, JSON.stringify(lastUpdate))
            },
            error => {
              console.log(`Ошибка error getPoints(): ${error}`)
            })
      }
    } else {

      // При первом запуске приложения сохранит в кэш время последнего обновления данных в интернете
      await lastUpdateTime()
        .then((data: LastUpdate) => {
            localStorage.setItem(LocalStorageNames.LAST_UPDATE_TIME, JSON.stringify(data))
          },
          error => {
            console.log(`Ошибка error lastUpdateTime(): ${error}`)
          })
    }
  }

  const obtainLastUpdate = async () => {
    // Пытаемся получить данные из localStorage по ключу 'cache_points' => LocalStorageNames.CACHE_POINTS
    const cachedLastUpdate = localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)

    // Проверяем, существуют ли данные в кэше
    if (cachedLastUpdate) {
      console.log('obtainLastUpdate: Данные из LocalStorage')
      // Если данные существуют, преобразуем их из строки в объект или массив и обрабатываем
      return JSON.parse(cachedLastUpdate) as LastUpdate
    } else {
      // Если данных в кэше нет, делаем запрос к серверу за данными
      await lastUpdateTime()
        .then((data: LastUpdate) => {
            localStorage.setItem(LocalStorageNames.LAST_UPDATE_TIME, JSON.stringify(data))
          },
          error => {
            console.log(`Ошибка error lastUpdateTime(): ${error}`)
          })
      const cachedLastUpdate = localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)!
      console.log('cachedLastUpdate: Данные из интернета и потом из localStorage')
      return JSON.parse(cachedLastUpdate) as LastUpdate
    }
  }*/

  return {
    obtainCachedPoints,
    clearCachePoints
  }
}
