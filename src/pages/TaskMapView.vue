<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { nextTick, onMounted, onUnmounted, ref, type Ref } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useMiniApp, useTheme } from 'vue-tg/8.0'
import LoadingScreen from '@/components/LoadingScreen.vue'

const router = useRouter()
const tasksLocalStorage = useTasksLocalStorage()

const { openLink } = useMiniApp()
const { headerColor } = useTheme()

const isLoadingData = ref(false)
const taskItems: Ref<PointResponse[]> = ref([])
const map: Ref<L.Map | null> = ref(null)
const selectedPoint: Ref<PointResponse | null> = ref(null)

onMounted(async () => {
  try {
    // headerColor.value = '#24252870'
    isLoadingData.value = true

    taskItems.value = tasksLocalStorage.getItems()

    await nextTick(async () => {
      initMap()
    })
  } catch (e) {
    console.error(`Ошибка SettingsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

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
const createTextMarker = (lat:number, lon:number, text:string) => {
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
          class="truncate rounded border-1 text-[10px] font-bold px-1 py-0.5 bg-[#3388ff] mb-1">
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
  });
};

const addMarkersToMap = () => {
  if (!map.value) return
  taskItems.value.forEach(point => {
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

    const marker = createTextMarker(Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude), point.name).addTo(map.value)
    const url = `https://yandex.ru/maps/?rtext=~${point.location.toRegion.latitude},${point.location.toRegion.longitude}&rtt=auto`

    // Создаем popup с информацией о точке
    const popupDiv = document.createElement('div')
    popupDiv.className = 'p-2'

    popupDiv.innerHTML = `
                          <h3 class="font-bold text-lg text-blue-600 mb-2">${point.name}</h3>
                          <div class="text-gray-600 text-sm mb-1">${point.direction}</div>
                          <div class="text-gray-600 text-sm mb-2">${point.address}</div>
                          <div class="flex gap-2 items-center">
                          <button
                            class="route-btn px-2 py-1 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c]">
                            Маршрут</button>
                          </div>
                        `

    // Добавляем обработчики
    popupDiv.querySelector('.route-btn')?.addEventListener('click', () => {
      openLink(url)
    });

    marker.bindPopup(popupDiv)

    // Обработчик клика на маркер
    marker.on('click', () => {
      selectedPoint.value = point
      // isModalOpen.value = true;
    })
  })
}

const fitMapToMarkers = () => {
  if (!map.value || taskItems.value.length === 0) return

  const group = L.featureGroup()
  taskItems.value.forEach(point => {
    L.marker([Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude)]).addTo(group)
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

<style scoped>
</style>
