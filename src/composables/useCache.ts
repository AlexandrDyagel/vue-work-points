import { PointResponse } from '@/model/PointResponse.ts'
import { getPoints, lastUpdatedPoints } from '../../firebase/init.ts'
import { LocalStorageNames } from '@/model/Enums.ts'
import { ref, type Ref } from 'vue'

export function useCache() {
  if (typeof Storage !== 'undefined') {
    console.log('localStorage поддерживается')
  } else {
    console.log('localStorage не поддерживается')
  }

  /**
   * Получаем данные из localStorage, если они есть.
   * Если данных нет, то получаем их из интернета, сохраняем в localStorage и получаем из localStorage.
   */
  const obtainCachedPoints = async (): Promise<PointResponse[]> => {
    // Пытаемся получить данные из localStorage по ключу 'cache_points' => LocalStorageNames.CACHE_POINTS
    const cachedData = localStorage.getItem(LocalStorageNames.CACHE_POINTS)

    // Проверяем, существуют ли данные в кэше
    if (cachedData) {
      console.log('Данные точек из LocalStorage')
      // Если данные существуют, преобразуем их из строки в объект или массив и обрабатываем
      return JSON.parse(cachedData) as PointResponse[]
    } else {
      // Если данных в кэше нет, делаем запрос к серверу за данными
      await getPoints()
        .then((data: PointResponse[]) => {
          localStorage.setItem(LocalStorageNames.CACHE_POINTS, JSON.stringify(data))
          console.log('Данные из интернета и потом из localStorage')
        })
        .catch((error) => {
          console.error(`Ошибка error getPoints(): ${error}`)
        })

      return JSON.parse(localStorage.getItem(LocalStorageNames.CACHE_POINTS)!) as PointResponse[]
    }
  }

  const clearCachePoints = () => {
    localStorage.removeItem(LocalStorageNames.CACHE_POINTS)
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

    const cachedLastUpdateTime = localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)

    // Проверяем, существуют ли данные в кэше
    if (cachedLastUpdateTime) {
      console.log('В localStorage существует запись времени последнего обновления данных')
      console.log('Время последнего обновления в приложении: ', cachedLastUpdateTime)

      return lastUpdateTime.value !== cachedLastUpdateTime
    } else {
      console.log('В localStorage не существует записи о времени последнего обновления данных')

      obtainCachedPoints().then((cachedDataPoints) => {
        const lastUpdatedAt = cachedDataPoints.sort(
          (a, b) => Number(b.updatedAt) - Number(a.updatedAt),
        )[0].updatedAt

        localStorage.setItem(LocalStorageNames.LAST_UPDATE_TIME, lastUpdatedAt)
        console.log('В localStorage добавлена запись о времени последнего обновления данных')
      })

      return lastUpdateTime.value !== localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)
    }
  }

  function setLastUpdateDataPoints(dateUpdate: string) {
    localStorage.setItem(LocalStorageNames.LAST_UPDATE_TIME, dateUpdate)
  }

  function removeLastUpdateDataPoints() {
    localStorage.removeItem(LocalStorageNames.LAST_UPDATE_TIME)
  }

  /*const checkForUpdate = async () => {
    const isNewUpdate = ref(false)
    const lastUpdate: Ref<LastUpdate> = ref(new LastUpdate())
    const cachedL
    astUpdateTime = localStorage.getItem(LocalStorageNames.LAST_UPDATE_TIME)

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
    clearCachePoints,
    checkForUpdate,
    setLastUpdateDataPoints,
    removeLastUpdateDataPoints,
  }
}
