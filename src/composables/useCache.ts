import { PointResponse } from '@/model/PointResponse.ts'
import { getPoints } from '../../firebase/init.ts'

export function useCache() {
  if (typeof (Storage) !== 'undefined') {
    console.log('localStorage поддерживается')
  } else {
    console.log('localStorage не поддерживается')
  }

  const obtainCachedPoints = async (): Promise<PointResponse[]> => {
    // Пытаемся получить данные из localStorage по ключу 'cache_points'
    // localStorage.removeItem('cache_points')
    const cachedData = localStorage.getItem('cache_points')

    // Проверяем, существуют ли данные в кэше
    if (cachedData) {
      console.log('Данные из LocalStorage')
      // Если данные существуют, преобразуем их из строки в объект или массив и обрабатываем
      return JSON.parse(cachedData) as PointResponse[]
    } else {
      // Если данных в кэше нет, делаем запрос к серверу за данными
      await getPoints()
        .then(data => {
            // После получения данных сохраним их в localStorage для дальнейшего использования
            localStorage.setItem('cache_points', JSON.stringify(data as PointResponse[]))
          },
          error => {
            console.log(`Ошибка error: ${error}`)
          })
      const cachedData = localStorage.getItem('cache_points')!
      console.log("Данные из интернета и потом из localStorage")
      return JSON.parse(cachedData) as PointResponse[]
    }
  }

  const clearCachePoints = () => localStorage.removeItem('cache_points')

  return {
    obtainCachedPoints,
    clearCachePoints
  }
}
