<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useMiniApp } from 'vue-tg/8.0'
import { useRouter } from 'vue-router'
import { computed, nextTick, onMounted, ref } from 'vue'
import { usePointsStore } from '@/store/Points.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCache } from '@/composables/useCache.ts'
import type { PointResponse } from '@/model/PointResponse.ts'
import { TypePoint } from '@/model/Enums.ts'
import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'
import StepUpImg from '@/assets/images/step_up.png'
import TunnelImg from '@/assets/images/tunnel.png'
import WorkHomeImg from '@/assets/images/work_home.png'
import StepDownImg from '@/assets/images/step_down.png'

const router = useRouter()
const pointsStore = usePointsStore()
const { obtainCachedPoints } = useCache()
const { openLink } = useMiniApp()

const isLoadingData = ref(false)
const map = ref<L.Map | null>(null)
type PointMarker = L.Marker & { pointId?: string }

const markers = ref<PointMarker[]>([])

// Состояния для фильтрации
const selectedDirection = ref<string>('')
const searchQuery = ref<string>('')

// Получаем уникальные направления из точек
const directions = computed(() => {
  const uniqueDirections = new Set<string>()
  pointsStore.points.forEach(point => {
    if (point.direction) {
      uniqueDirections.add(point.direction)
    }
  })
  return Array.from(uniqueDirections).sort()
})

// Отфильтрованные точки по направлению
const filteredPoints = computed(() => {
  if (!selectedDirection.value) return []
  return pointsStore.points.filter(point => point.direction === selectedDirection.value)
})

// Поиск точек по названию (из всех точек, независимо от выбранного направления)
const searchResults = computed(() => {
  if (!searchQuery.value.trim()) return []
  const query = searchQuery.value.toLowerCase().trim()
  return pointsStore.points.filter(point =>
    point.name.toLowerCase().includes(query)
  )
})

onMounted(async () => {
  try {
    isLoadingData.value = true

    // Загружаем точки, если их нет в хранилище
    if (pointsStore.points.length === 0) {
      const cachedPoints = await obtainCachedPoints()
      pointsStore.savePoints(cachedPoints)
    }

    await nextTick(() => {
      initMap()
    })

    // Показываем область всех точек при открытии карты
    if (pointsStore.points.length > 0) {
      fitMapToMarkers(pointsStore.points)
    }
  } catch (e) {
    console.error(`Ошибка в onMounted: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

// Смена направления через выпадающий список (только пользовательский ввод)
const onDirectionChange = () => {
  clearMarkers()
  if (selectedDirection.value) {
    addMarkersToMap(filteredPoints.value)
    fitMapToMarkers(filteredPoints.value)
  }
}

// Функция для выбора точки из поиска
const selectPointFromSearch = (point: PointResponse) => {
  selectedDirection.value = point.direction || ''
  searchQuery.value = ''

  // Очищаем маркеры и добавляем новые с выделенной точкой
  clearMarkers()
  addMarkersToMap(filteredPoints.value, point.uid)
  fitMapToMarkers(filteredPoints.value)

  // Открываем попап выбранной точки
  setTimeout(() => {
    const coordinates = getPointCoordinates(point)
    if (coordinates && map.value) {
      map.value.setView([coordinates.lat, coordinates.lng], 15)
      // Находим и открываем попап выбранного маркера
      const marker = markers.value.find(m => m.pointId === point.uid)
      if (marker) {
        marker.openPopup()
      }
    }
  }, 100)
}

// Получение координат точки
const getPointCoordinates = (point: PointResponse) => {
  const toLat = point.location?.toRegion?.latitude ?? ''
  const toLng = point.location?.toRegion?.longitude ?? ''

  const latRaw = toLat !== '' ? toLat : (point.location?.fromRegion?.latitude ?? '')
  const lngRaw = toLng !== '' ? toLng : (point.location?.fromRegion?.longitude ?? '')

  if (latRaw === '' || lngRaw === '') return null

  const lat = Number(latRaw)
  const lng = Number(lngRaw)

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

// Открывает внешнюю ссылку с учётом платформы
const openExternalLink = async (url: string): Promise<void> => {
  try {
    if (Capacitor.isNativePlatform()) {
      await AppLauncher.openUrl({ url })
    } else {
      openLink(url)
    }
  } catch (e) {
    console.error('Не удалось открыть ссылку:', e)
  }
}

// Построение URL для маршрута и точки
const buildPointUrls = (point: PointResponse) => {
  const coords = getPointCoordinates(point)
  const lat = coords?.lat ?? 0
  const lng = coords?.lng ?? 0

  return {
    urlRoute: `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`,
    urlPoint: `https://yandex.ru/maps/?pt=${lng},${lat}&z=18&l=map`
  }
}

const initMap = () => {
  // Защита от повторной инициализации карты
  if (map.value) return

  const leafletMap = L.map('map').setView([55.7558, 37.6176], 6)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(leafletMap)

  map.value = leafletMap

  // Обновляем размер карты после инициализации
  setTimeout(() => {
    leafletMap.invalidateSize()
  }, 100)
}

// Экранирование HTML для безопасного вывода пользовательских данных
const escapeHtml = (value: string): string => {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(value))
  return div.innerHTML
}

// Функция для создания маркера с текстом и цветом
const createTextMarker = (lat: number, lon: number, text: string, index: number, isSelected: boolean = false) => {
  const bgColor = isSelected ? '#e67e22' : '#3388ff'
  const borderColor = isSelected ? '#d35400' : '#ffffff'

  return L.marker([lat, lon], {
    icon: L.divIcon({
      html: `
        <div class="relative flex flex-col items-center">
          <div
            class="truncate rounded text-[10px] font-bold px-1 py-0.5 mb-1"
            style="
              background: ${bgColor};
              color: white;
              max-width: 120px;
              border: 1px solid ${borderColor};
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            "
          >
            ${index + 1}. ${escapeHtml(text)}
          </div>
          <div
            class="w-3 h-3 border-2 border-white rounded-full shadow-md"
            style="background: ${bgColor};"
          ></div>
        </div>
      `,
      className: '',
      iconSize: [130, 30],
      iconAnchor: [65, 30]
    })
  })
}

const clearMarkers = () => {
  markers.value.forEach(marker => {
    if (map.value) {
      marker.remove()
    }
  })
  markers.value = []
}

const addMarkersToMap = (points: PointResponse[], highlightUid?: string) => {
  if (!map.value || points.length === 0) return

  points.forEach((point, index) => {
    const coords = getPointCoordinates(point)
    if (!coords) return

    const isSelected = highlightUid !== undefined && highlightUid === point.uid
    const marker: PointMarker = createTextMarker(coords.lat, coords.lng, point.name, index, isSelected)

    map.value!.addLayer(marker)

    // Сохраняем ID точки на маркере для последующего поиска
    marker.pointId = point.uid

    const { urlRoute, urlPoint } = buildPointUrls(point)

    // Создаем попап с информацией о точке
    const popupDiv = document.createElement('div')
    popupDiv.className = 'p-3 min-w-[200px]'
    popupDiv.innerHTML = `
      <div class="flex flex-row justify-between gap-2">
        <div class="min-w-0">
          <h3 class="font-bold text-lg text-blue-600 mb-2">${index + 1}. ${escapeHtml(point.name)}</h3>
          <div class="text-gray-600 text-sm mb-1">
            <span class="font-semibold">Направление:</span> ${escapeHtml(point.direction || '—')}
          </div>
          <div class="text-gray-600 text-sm mb-1">
            <span class="font-semibold">Адрес:</span> ${escapeHtml(point.address || '—')}
          </div>
        </div>
        <div class="w-12 h-12 shrink-0">
          <img src="${getIcon(point.type) ?? ''}" class="rounded-sm w-full h-full object-cover" alt="" />
        </div>
      </div>
      <div class="flex gap-2 items-center">
        <div class="inline-flex gap-2 items-center justify-center">
          <button
            class="route-btn px-2 py-1 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c]">
            Маршрут</button>
          <button
            class="point-btn px-2 py-1 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c]">
            Место</button>
        </div>
      </div>
    `

    popupDiv.querySelector('.route-btn')?.addEventListener('click', () => {
      openExternalLink(urlRoute)
    })
    popupDiv.querySelector('.point-btn')?.addEventListener('click', () => {
      openExternalLink(urlPoint)
    })

    marker.bindPopup(popupDiv)
    markers.value.push(marker)
  })
}

const fitMapToMarkers = (points: PointResponse[]) => {
  if (!map.value || points.length === 0) return

  const bounds = L.latLngBounds([])

  points.forEach((point) => {
    const coords = getPointCoordinates(point)
    if (coords) {
      bounds.extend([coords.lat, coords.lng])
    }
  })

  if (!bounds.isValid()) return

  map.value.fitBounds(bounds.pad(0.1))
}

// Сброс фильтра
const clearFilters = () => {
  selectedDirection.value = ''
  searchQuery.value = ''
  clearMarkers()
}

const getIcon = (typePoint: TypePoint) => {
  switch (typePoint) {
    case TypePoint.PP: {
      return StepUpImg
    }
    case TypePoint.TA: {
      return TunnelImg
    }
    case TypePoint.TP: {
      return StepDownImg
    }
    case TypePoint.Home: {
      return WorkHomeImg
    }
  }
}

</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <!-- Контейнер с картой -->
  <div class="fixed inset-0 w-full h-full bg-[#242528]">
    <!-- Панель управления вверху -->
    <div class="map-panel absolute left-4 right-4 z-[1000] bg-[#242528] rounded-xl p-3 pb-0 shadow-lg border border-black">
      <!-- Выбор направления -->
      <div class="flex gap-2 items-center">
        <label class="text-sm font-semibold text-gray-200 min-w-[80px]">Направление:</label>
        <select
          v-model="selectedDirection"
          @change="onDirectionChange"
          class="flex-1 px-3 py-2 border border-[#000] rounded-lg text-sm text-white bg-black cursor-pointer transition-all focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
        >
          <option value="">Выберите направление</option>
          <option v-for="dir in directions" :key="dir" :value="dir">{{ dir }}</option>
        </select>
        <button
          v-if="selectedDirection"
          @click="clearFilters"
          class="px-3 py-2 bg-gray-500 text-white rounded-lg text-sm transition-all hover:bg-gray-600"
        >
          ✕
        </button>
      </div>

      <p class="text-center text-sm text-gray-200">или</p>

      <!-- Поиск точки -->
      <div class="relative mb-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Введите название точки..."
          class="w-full px-3 py-2 pr-9 border border-[#000] rounded-lg text-sm text-white bg-black placeholder-gray-400 transition-all focus:outline-none focus:border-gray-500 focus:ring-2 focus:ring-gray-500"
        />
        <button
          v-if="searchQuery"
          @click="searchQuery = ''"
          class="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-gray-400 hover:text-white text-sm"
          aria-label="Очистить поиск"
        >
          ✕
        </button>

        <!-- Результаты поиска -->
        <div
          v-if="searchQuery && searchResults.length > 0"
          class="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1001]"
        >
          <div
            v-for="point in searchResults"
            :key="point.uid"
            @click="selectPointFromSearch(point)"
            class="p-2 cursor-pointer border-b border-[#3d3e43] transition-colors hover:bg-blue-50 last:border-0"
          >
            <div class="flex flex-row justify-between">
              <div>
                <div class="font-medium text-gray-200 text-sm">{{ point.name }}</div>
                <div class="text-xs text-gray-400">{{ point.direction }}</div>
                <div class="text-[11px] text-gray-500">{{ point.address }}</div>
              </div>
              <div class="w-8 h-8">
                <img :src="getIcon(point.type)" class="rounded-sm" alt="" />
              </div>
            </div>
          </div>
        </div>

        <div
          v-if="searchQuery && searchResults.length === 0"
          class="absolute top-full left-0 right-0 mt-1 bg-black border border-gray-500 rounded-lg shadow-lg p-2 text-center text-sm text-gray-200"
        >
          Точки не найдены
        </div>
      </div>

      <!-- Информация о количестве точек -->
      <div v-if="selectedDirection" class="text-center text-xs text-gray-200 pt-1 border-t border-gray-500">
        Найдено точек: {{ filteredPoints.length }}
      </div>
    </div>

    <!-- Карта -->
    <div id="map" class="w-full h-full"></div>
  </div>
</template>

<style scoped>
/* Оставляем только стили, которые нельзя заменить Tailwind */
#map {
  width: 100%;
  height: 100%;
}

/* Анимации для плавности */
select, button, input {
  transition: all 0.2s ease;
}

/* Отступ панели с учётом безопасной зоны (Android/iOS вырез, статус-бар) */
.map-panel {
  top: calc(env(safe-area-inset-top, 0px) + 16px);
}

/* Кастомный скролл для результатов поиска */
.max-h-60::-webkit-scrollbar {
  width: 6px;
}

.max-h-60::-webkit-scrollbar-track {
  background: #1f2023;
  border-radius: 3px;
}

.max-h-60::-webkit-scrollbar-thumb {
  background: #4b4d54;
  border-radius: 3px;
}

.max-h-60::-webkit-scrollbar-thumb:hover {
  background: #6b6e78;
}
</style>
