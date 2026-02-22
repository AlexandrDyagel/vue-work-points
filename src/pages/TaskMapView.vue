<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useMiniApp } from 'vue-tg/8.0'
import LoadingScreen from '@/components/LoadingScreen.vue'
import type { Marker } from 'leaflet'
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

onMounted(async () => {
    try {
      // headerColor.value = '#24252870'
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

  // Подгоняем карту под все маркеры
  fitMapToMarkers()
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
        iconAnchor: [75, 30] // 75 в два раза должно быть меньше 150, а 30 должно быть 30
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
        iconAnchor: [75, 30] // 75 в два раза должно быть меньше 150, а 30 должно быть 30
      })
    })
  }
}

const addMarkersToMap = () => {
  if (!map.value) return

  optimalRoute.value.forEach((point, index) => {
    // Создаем кастомный маркер
    // const marker = L.marker([Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude)], {
    //   title: point.name,
    //   icon: L.divIcon({
    //     html: `<div class="rounded border-1 bg-[#3388ff] px-1 py-0.5 truncate">${point.name}</div>`,
    //     className: 'label-icon',
    //     iconSize: [100, 30],
    //     iconAnchor: [50, 30]
    //   })
    // }).addTo(map.value)
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

    // Создаем popup с информацией о точке
    // if (point.type !== TypePoint.Home) {
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

    // Добавляем обработчики
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
      }
    })

    marker.bindPopup(popupDiv)

    // Обработчик клика на маркер
    marker.on('click', () => {
      selectedPoint.value = point
      // isModalOpen.value = true;
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
  // headerColor.value = '#242528'
})

</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <div>
    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">
      <!-- Карта -->
      <!--      <div class="fixed top-0 z-10 start-0 end-0 text-black text-lg text-center">-->
      <!--        <p>Версия: {{ DEV_VERSION }}</p>-->
      <!--        <h2>-->
      <!--          Карта ({{ taskItems.length }} точек)-->
      <!--        </h2>-->
      <!--      </div>-->
      <div class="pt-4">
        <div id="map" class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full"></div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
