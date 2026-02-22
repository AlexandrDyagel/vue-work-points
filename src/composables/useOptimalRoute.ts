import { computed, ref, watch } from 'vue'
import type { PointResponse } from '@/model/PointResponse.ts'
import type { GeoPoint } from '@/model/GeoPoint.ts'

export function useOptimalRoute() {

  const points = ref<PointResponse[]>([])
  const startPointId = ref<string>('')
  const isLoading = ref(false)
  const cachedRoute = ref<PointResponse[]>([])

  // Вспомогательная функция для конвертации строк в числа
  const parseCoordinate = (coord: string): number => {
    return parseFloat(coord)
  }

  // Расчет расстояния между двумя точками (формула гаверсинуса)
  const calculateDistance = (point1: GeoPoint, point2: GeoPoint): number => {
    const R = 6371 // Радиус Земли в км

    const lat1 = parseCoordinate(point1.latitude) * Math.PI / 180
    const lat2 = parseCoordinate(point2.latitude) * Math.PI / 180
    const lng1 = parseCoordinate(point1.longitude) * Math.PI / 180
    const lng2 = parseCoordinate(point2.longitude) * Math.PI / 180

    const dLat = lat2 - lat1
    const dLng = lng2 - lng1

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  // Расчет общей дистанции маршрута
  const calculateTotalDistance = (route: PointResponse[]): number => {
    let total = 0
    for (let i = 0; i < route.length - 1; i++) {
      if (route[i].location.toRegion.longitude.length !== 0) {
        total += calculateDistance(route[i].location.toRegion, route[i + 1].location.toRegion)
      } else {
        total += calculateDistance(route[i].location.fromRegion, route[i + 1].location.fromRegion)
      }
    }
    return total
  }

  // Оптимизированный алгоритм ближайшего соседа (жадный алгоритм)
  const findRouteNearestNeighbor = (startIndex: number): PointResponse[] => {
    const n = points.value.length
    const visited = new Array(n).fill(false)
    const route: PointResponse[] = []

    let currentIndex = startIndex
    visited[currentIndex] = true
    route.push(points.value[currentIndex])

    for (let i = 1; i < n; i++) {
      let nearestIndex = -1
      let minDistance = Infinity

      for (let j = 0; j < n; j++) {
        if (!visited[j]) {
          let distance
          if (points.value[currentIndex].location.toRegion.latitude.length !== 0) {
            if (points.value[j].location.toRegion.latitude.length !== 0){
              distance = calculateDistance(points.value[currentIndex].location.toRegion, points.value[j].location.toRegion)
            } else {
              distance = calculateDistance(points.value[currentIndex].location.toRegion, points.value[j].location.fromRegion)
            }
          } else {
            if (points.value[j].location.toRegion.latitude.length !== 0) {
              distance = calculateDistance(points.value[currentIndex].location.fromRegion, points.value[j].location.toRegion)
            } else {
              distance = calculateDistance(points.value[currentIndex].location.fromRegion, points.value[j].location.fromRegion)
            }
          }

          if (distance < minDistance) {
            minDistance = distance
            nearestIndex = j
          }
        }
      }

      if (nearestIndex !== -1) {
        visited[nearestIndex] = true
        route.push(points.value[nearestIndex])
        currentIndex = nearestIndex
      }
    }
    return route
  }

  // Улучшенный алгоритм с 2-opt оптимизацией
  const optimizeRouteWith2Opt = (route: PointResponse[]): PointResponse[] => {
    let improved = true
    let bestRoute = [...route]
    let bestDistance = calculateTotalDistance(bestRoute)

    while (improved) {
      improved = false

      for (let i = 1; i < bestRoute.length - 2; i++) {
        for (let j = i + 1; j < bestRoute.length - 1; j++) {
          // Создаем новый маршрут с переворотом сегмента
          const newRoute = [
            ...bestRoute.slice(0, i),
            ...bestRoute.slice(i, j + 1).reverse(),
            ...bestRoute.slice(j + 1)
          ]

          const newDistance = calculateTotalDistance(newRoute)

          if (newDistance < bestDistance) {
            bestRoute = newRoute
            bestDistance = newDistance
            improved = true
          }
        }
      }
    }

    return bestRoute
  }

  // Поиск оптимального маршрута
  const findOptimalRoute = async (startIndex: number): Promise<PointResponse[]> => {
    return new Promise((resolve) => {
      isLoading.value = true

      // Используем setTimeout для асинхронности, чтобы не блокировать UI
      setTimeout(() => {
        // Находим начальный маршрут жадным алгоритмом
        const initialRoute = findRouteNearestNeighbor(startIndex)

        // Оптимизируем его с помощью 2-opt
        const optimizedRoute = optimizeRouteWith2Opt(initialRoute)

        isLoading.value = false
        resolve(optimizedRoute)
      }, 10)
    })
  }

  // Оптимальный маршрут с кэшированием
  /*const optimalRoute = computed(() => {
    if (points.value.length < 2 || !startPointId.value) return []
    return cachedRoute.value
  })*/
  const optimalRoute = computed(() => {
    if (points.value.length < 2) return []
    return cachedRoute.value
  })

  // Общая дистанция
  const totalDistance = computed(() => {
    if (optimalRoute.value.length < 2) return 0
    return calculateTotalDistance(optimalRoute.value)
  })

  // Удаление точки
  const removePoint = async (id: string) => {
    points.value = points.value.filter(point => point.uid !== id)
    if (startPointId.value === id) {
      startPointId.value = ''
      cachedRoute.value = []
    }
  }

  // Обновление маршрута при изменении точек или стартовой точки
  watch([points, startPointId], async () => {
    if (points.value.length >= 2 && startPointId.value) {
      const startIndex = points.value.findIndex(p => p.uid === startPointId.value)
      if (startIndex !== -1) {
        cachedRoute.value = await findOptimalRoute(startIndex)
      }
    } else {
      cachedRoute.value = []
    }
  }, { deep: true })

  const init = async () => {
    if (points.value.length >= 2) {
      const startIndex = points.value.findIndex(p => p.uid === startPointId.value)
      if (startIndex !== -1) {
        cachedRoute.value = await findOptimalRoute(startIndex)
        //console.log(`chachedRoute: ${JSON.stringify(cachedRoute.value)}`)
        console.log(cachedRoute)
      }
    } else {
      cachedRoute.value = []
    }
  }

  return {
    points,
    startPointId,
    isLoading,
    optimalRoute,
    totalDistance,
    removePoint,
    init
  }
}
