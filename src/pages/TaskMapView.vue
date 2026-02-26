<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useMiniApp } from 'vue-tg/8.0'
import LoadingScreen from '@/components/LoadingScreen.vue'
import type { Marker, Polyline } from 'leaflet'
import { TypePoint } from '@/model/Enums.ts'
import { useCache } from '@/composables/useCache.ts'
import { useTaskPointsStore } from '@/store/TaskPoints.ts'
import { useOptimalRoute } from '@/composables/useOptimalRoute.ts'
import { usePointsStore } from '@/store/Points.ts'

const router = useRouter()
const pointsStore = usePointsStore()
const tasksLocalStorage = useTasksLocalStorage()
const taskPointsStore = useTaskPointsStore()
const { obtainCachedPoints } = useCache()
const {
  points,
  startPointId,
  isLoading,
  optimalRoute,
  totalDistance,
  removePoint,
  init
} = useOptimalRoute()

const { openLink } = useMiniApp()

const isLoadingData = ref(false)
const taskItems: Ref<PointResponse[]> = ref([])
const map: Ref<L.Map | null> = ref(null)
const selectedPoint: Ref<PointResponse | null> = ref(null)
// Хранилище для линий маршрутов
const routePolylines: Ref<Polyline[]> = ref([])
// Состояние видимости линий
const isRoutesVisible = ref(true)

// Массив цветов для маршрутов
const routeColors = [
  '#FF5733', // Красный
  '#33FF57', // Зеленый
  '#3357FF', // Синий
  '#FF33F1', // Розовый
  '#F1FF33', // Желтый
  '#33FFF5', // Голубой
  '#FF8333', // Оранжевый
  '#8333FF', // Фиолетовый
  '#FF3383', // Розово-красный
  '#33FF83'  // Салатовый
]

onMounted(async () => {
    try {
      isLoadingData.value = true
      startPointId.value = 'o7YHGcpPla26GOV7bXhp' // uid Переходы. Тоннели

      if (pointsStore.points.length !== 0) {
        points.value.unshift(
          pointsStore.points.filter((point) => point.name === 'Переходы. Тоннели')[0])
      } else {
        await obtainCachedPoints().then((cachedDataPoints) => {
          pointsStore.savePoints(cachedDataPoints)
          points.value.unshift(
            pointsStore.points.filter((point) => point.name === 'Переходы. Тоннели')[0])
        })
      }

      const cachedPoints = tasksLocalStorage.getItems()
      points.value.push(...cachedPoints)
      taskPointsStore.savePoints(cachedPoints)

      await init()

      await nextTick(async () => {
        initMap()
      })
    } catch (e) {
      console.error(`Ошибка TaskMapView.vue в onMounted catch: ${e}`)
    } finally {
      isLoadingData.value = false
    }
  }
)

const initMap = () => {
  // Создаем карту с центром в Москве
  const leafletMap = L.map('map').setView([55.7558, 37.6176], 6)

  // Добавляем слой карты OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(leafletMap)

  map.value = leafletMap

  // Добавляем маркеры для всех точек
  addMarkersToMap()

  // Рисуем маршруты между точками
  drawRoutes()

  // Подгоняем карту под все маркеры
  fitMapToMarkers()
}

// Новая функция для переключения видимости линий
const toggleRoutesVisibility = () => {
  isRoutesVisible.value = !isRoutesVisible.value

  routePolylines.value.forEach(polyline => {
    if (isRoutesVisible.value) {
      // Показываем линии
      polyline.setStyle({ opacity: 0.9 })
      // Если нужно вернуть исходный цвет (на случай, если он был изменен)
      // polyline.setStyle({ color: polyline.options.color })
    } else {
      // Скрываем линии
      polyline.setStyle({ opacity: 0 })
    }
  })
}

// Новая функция для отрисовки маршрутов между точками
const drawRoutes = () => {
  if (!map.value || optimalRoute.value.length < 2) return

  // Очищаем предыдущие линии
  routePolylines.value.forEach(polyline => {
    polyline.remove()
  })
  routePolylines.value = []

  // Рисуем линии между последовательными точками
  for (let i = 0; i < optimalRoute.value.length - 1; i++) {
    const currentPoint = optimalRoute.value[i]
    const nextPoint = optimalRoute.value[i + 1]

    // Получаем координаты текущей точки
    const currentLat = currentPoint.location.toRegion.latitude
      ? Number(currentPoint.location.toRegion.latitude)
      : Number(currentPoint.location.fromRegion.latitude)
    const currentLng = currentPoint.location.toRegion.longitude
      ? Number(currentPoint.location.toRegion.longitude)
      : Number(currentPoint.location.fromRegion.longitude)

    // Получаем координаты следующей точки
    const nextLat = nextPoint.location.toRegion.latitude
      ? Number(nextPoint.location.toRegion.latitude)
      : Number(nextPoint.location.fromRegion.latitude)
    const nextLng = nextPoint.location.toRegion.longitude
      ? Number(nextPoint.location.toRegion.longitude)
      : Number(nextPoint.location.fromRegion.longitude)

    // Создаем линию между точками
    const polyline = L.polyline([
      [currentLat, currentLng],
      [nextLat, nextLng]
    ], {
      color: routeColors[i % routeColors.length],
      weight: 4,
      opacity: isRoutesVisible.value ? 0.9 : 0, // Учитываем текущее состояние видимости
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map.value)

    // Добавляем всплывающую подсказку с информацией о сегменте
    const distance = calculateDistance(
      currentLat, currentLng,
      nextLat, nextLng
    )

    polyline.bindPopup(`
      <div class="p-2">
        <h4 class="font-bold text-sm mb-1">Сегмент ${i + 1}</h4>
        <p class="text-xs">От: ${currentPoint.name}</p>
        <p class="text-xs">До: ${nextPoint.name}</p>
        <p class="text-xs font-bold mt-1">Расстояние: ${distance.toFixed(2)} км</p>
      </div>
    `)

    routePolylines.value.push(polyline)
  }
}

// Вспомогательная функция для расчета расстояния между точками (формула гаверсинуса)
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371 // Радиус Земли в километрах
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

// Функция для создания текстовой метки
const createTextMarker = (typePoint: TypePoint, lat: number, lon: number, text: string) => {
  if (typePoint !== TypePoint.Home) {
    return L.marker([lat, lon], {
      icon: L.divIcon({
        html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div
          class="truncate rounded border-1 text-[10px] font-bold px-1 bg-[#3388ff] py-0.5 mb-1">
          ${text}
          </div>
          <div style="
            width: 10px;
            height: 10px;
            background: #3388ff;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          "></div>
        </div>
      `,
        className: '',
        iconSize: [150, 30],
        iconAnchor: [75, 30]
      })
    })
  } else {
    return L.marker([lat, lon], {
      icon: L.divIcon({
        html: `
        <div style="
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        ">
          <div
          class="truncate rounded border-1 text-[10px] font-bold px-1 bg-[#5e0808] py-0.5 mb-1">
          ${text}
          </div>
          <div style="
            width: 10px;
            height: 10px;
            background: #5e0808;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          "></div>
        </div>
      `,
        className: '',
        iconSize: [150, 30],
        iconAnchor: [75, 30]
      })
    })
  }
}

const addMarkersToMap = () => {
  if (!map.value) return

  optimalRoute.value.forEach((point, index) => {
    let marker: Marker
    let urlRoute: string
    let urlPoint: string
    if (point.location.toRegion.latitude && point.location.toRegion.longitude) {
      marker = createTextMarker(
        point.type,
        Number(point.location.toRegion.latitude),
        Number(point.location.toRegion.longitude),
        `${index + 1}. ${point.name}`
      ).addTo(map.value)
      urlRoute = `https://yandex.ru/maps/?rtext=~${point.location.toRegion.latitude},${point.location.toRegion.longitude}&rtt=auto`
      urlPoint = `https://yandex.ru/maps/?pt=${point.location.toRegion.longitude},${point.location.toRegion.latitude}&z=18&l=map`
    } else {
      marker = createTextMarker(
        point.type,
        Number(point.location.fromRegion.latitude),
        Number(point.location.fromRegion.longitude),
        `${index + 1}. ${point.name}`
      ).addTo(map.value)
      urlRoute = `https://yandex.ru/maps/?rtext=~${point.location.fromRegion.latitude},${point.location.fromRegion.longitude}&rtt=auto`
      urlPoint = `https://yandex.ru/maps/?pt=${point.location.fromRegion.longitude},${point.location.fromRegion.latitude}&z=18&l=map`
    }

    const popupDiv = document.createElement('div')
    popupDiv.className = 'p-2'

    popupDiv.innerHTML = `
                          <h3 class="font-bold text-lg text-blue-600 mb-2">${index + 1}. ${point.name}</h3>
                          <div class="text-gray-600 text-sm mb-1">${point.direction}</div>
                          <div class="text-gray-600 text-sm mb-2">${point.address}</div>
                          <div class="flex gap-2 items-center">
                          <div class="inline-flex gap-2 items-center justify-center">
                          <button
                            class="route-btn px-2 py-1 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c]">
                            Маршрут</button>
                            <button
                            class="point-btn px-2 py-1 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c]">
                            Место</button>
                            ${point.type !== TypePoint.Home ? `<button
                            class="delete-btn px-2 py-1 rounded text-[#ffffff] bg-[#5e0808] active:bg-[#3c3c3c]">
                            Удалить</button>` : ''}
                          </div>
                          </div>
                        `

    popupDiv.querySelector('.route-btn')?.addEventListener('click', () => {
      openLink(urlRoute)
    })
    popupDiv.querySelector('.point-btn')?.addEventListener('click', () => {
      openLink(urlPoint)
    })
    popupDiv.querySelector('.delete-btn')?.addEventListener('click', () => {
      if (selectedPoint.value && taskItems.value.includes(selectedPoint.value)) {
        taskItems.value.splice(taskItems.value.indexOf(selectedPoint.value), 1)
        taskItems.value.splice(taskItems.value.findIndex(() => selectedPoint.value?.name === 'Переходы. Тоннели'), 1)
        tasksLocalStorage.removeItems()
        tasksLocalStorage.setItems(taskItems.value)
        taskPointsStore.savePoints(taskItems.value)
        marker.closePopup()
        marker.onRemove(map.value)

        // Перерисовываем маршруты после удаления точки
        drawRoutes()
      }
    })

    marker.bindPopup(popupDiv)

    marker.on('click', () => {
      selectedPoint.value = point
    })
  })
}

const fitMapToMarkers = () => {
  if (!map.value || optimalRoute.value.length === 0) return

  const group = L.featureGroup()
  optimalRoute.value.forEach((point) => {
    if (point.location.toRegion.latitude && point.location.toRegion.longitude) {
      L.marker([
        Number(point.location.toRegion.latitude),
        Number(point.location.toRegion.longitude)
      ]).addTo(group)
    } else {
      L.marker([
        Number(point.location.fromRegion.latitude),
        Number(point.location.fromRegion.longitude)
      ]).addTo(group)
    }
  })

  map.value.fitBounds(group.getBounds().pad(0.1))
}

onUnmounted(() => {
  // Очищаем линии при размонтировании компонента
  routePolylines.value.forEach(polyline => {
    polyline.remove()
  })
})

</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <div>
    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">
      <!-- Кнопка переключения видимости маршрутов -->
      <button
        @click="toggleRoutesVisibility"
        class="fixed top-4 right-4 z-20 px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-200"
        :class="isRoutesVisible ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'"
      >
        <span v-if="isRoutesVisible">🔍 Скрыть маршруты</span>
        <span v-else>🗺️ Показать маршруты</span>
      </button>

      <div class="pt-4">
        <div id="map" class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Добавляем небольшую анимацию для кнопки */
button {
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  background-color: v-bind('isRoutesVisible ? "rgba(37, 99, 235, 0.9)" : "rgba(75, 85, 99, 0.9)"');
}

button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

button:active {
  transform: translateY(0);
}
</style>
