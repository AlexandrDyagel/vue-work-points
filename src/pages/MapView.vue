<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { nextTick, onMounted, ref, computed, type Ref, watch } from 'vue'
import { usePointsStore } from '@/store/Points.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import type { Marker } from 'leaflet'
import { useCache } from '@/composables/useCache.ts'
import type { PointResponse } from '@/model/PointResponse.ts'

const router = useRouter()
const pointsStore = usePointsStore()
const { obtainCachedPoints } = useCache()

const isLoadingData = ref(false)
const map: Ref<L.Map | null> = ref(null)
const markers: Ref<Marker[]> = ref([])

// Состояния для фильтрации
const selectedDirection = ref<string>('')
const searchQuery = ref<string>('')
const selectedPoint = ref<PointResponse | null>(null)

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
  } catch (e) {
    console.error(`Ошибка в onMounted: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

// Следим за изменением направления
watch(selectedDirection, () => {
  clearMarkers()
  if (selectedDirection.value) {
    addMarkersToMap(filteredPoints.value)
    fitMapToMarkers(filteredPoints.value)
  }
})

// Функция для выбора точки из поиска
const selectPointFromSearch = (point: PointResponse) => {
  selectedPoint.value = point
  selectedDirection.value = point.direction || ''
  searchQuery.value = ''

  // Очищаем маркеры и добавляем новые с выделенной точкой
  clearMarkers()
  addMarkersToMap(filteredPoints.value, point)
  fitMapToMarkers(filteredPoints.value)

  // Открываем попап выбранной точки
  setTimeout(() => {
    const coordinates = getPointCoordinates(point)
    if (coordinates && map.value) {
      map.value.setView([coordinates.lat, coordinates.lng], 15)
      // Находим и открываем попап выбранного маркера
      const marker = markers.value.find(m => (m as any).pointId === point.id)
      if (marker) {
        marker.openPopup()
      }
    }
  }, 100)
}

// Получение координат точки
const getPointCoordinates = (point: PointResponse) => {
  const lat = point.location?.toRegion?.latitude
    ? Number(point.location.toRegion.latitude)
    : point.location?.fromRegion?.latitude
      ? Number(point.location.fromRegion.latitude)
      : null

  const lng = point.location?.toRegion?.longitude
    ? Number(point.location.toRegion.longitude)
    : point.location?.fromRegion?.longitude
      ? Number(point.location.fromRegion.longitude)
      : null

  if (!lat || !lng) return null
  return { lat, lng }
}

const initMap = () => {
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
            ${index + 1}. ${text}
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

const addMarkersToMap = (points: PointResponse[], highlightPoint?: PointResponse) => {
  if (!map.value || points.length === 0) return

  points.forEach((point, index) => {
    const coords = getPointCoordinates(point)
    if (!coords) return

    const isSelected = highlightPoint?.id === point.id
    const marker = createTextMarker(coords.lat, coords.lng, point.name, index, isSelected)
        .addTo(map.value!)

      // Сохраняем ID точки на маркере для последующего поиска
    ;(marker as any).pointId = point.id

    // Создаем попап с информацией о точке
    const popupDiv = document.createElement('div')
    popupDiv.className = 'p-3 min-w-[200px]'
    popupDiv.innerHTML = `
      <h3 class="font-bold text-lg text-blue-600 mb-2">${index + 1}. ${point.name}</h3>
      <div class="text-gray-600 text-sm mb-1">
        <span class="font-semibold">Направление:</span> ${point.direction || '—'}
      </div>
      <div class="text-gray-600 text-sm mb-1">
        <span class="font-semibold">Адрес:</span> ${point.address || '—'}
      </div>
      <div class="text-gray-600 text-sm">
        <span class="font-semibold">Тип точки:</span> ${point.type || '—'}
      </div>
    `

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
  selectedPoint.value = null
  searchQuery.value = ''
  clearMarkers()
}
</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <!-- Контейнер с картой -->
  <div class="fixed inset-0 w-full h-full bg-[#242528]">
    <!-- Панель управления вверху -->
    <div class="absolute top-4 left-4 right-4 z-[1000] bg-white rounded-xl p-3 pb-0 shadow-lg border border-gray-200">
      <!-- Выбор направления -->
      <div class="flex gap-2 items-center">
        <label class="text-sm font-semibold text-gray-800 min-w-[80px]">Направление:</label>
        <select
          v-model="selectedDirection"
          class="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white cursor-pointer transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
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

      <p class="text-center text-sm text-gray-800">или</p>

      <!-- Поиск точки -->
      <div class="relative mb-3">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Введите название точки..."
          class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-800 bg-white placeholder-gray-400 transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        />

        <!-- Результаты поиска -->
        <div
          v-if="searchQuery && searchResults.length > 0"
          class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1001]"
        >
          <div
            v-for="point in searchResults"
            :key="point.id"
            @click="selectPointFromSearch(point)"
            class="p-2 cursor-pointer border-b border-gray-100 transition-colors hover:bg-blue-50 last:border-0"
          >
            <div class="font-medium text-gray-800 text-sm">{{ point.name }}</div>
            <div class="text-xs text-gray-500">{{ point.direction }}</div>
            <div class="text-[11px] text-gray-400">{{ point.address }}</div>
          </div>
        </div>

        <div
          v-if="searchQuery && searchResults.length === 0"
          class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-center text-sm text-gray-500"
        >
          Точки не найдены
        </div>
      </div>

      <!-- Информация о количестве точек -->
      <div v-if="selectedDirection" class="text-center text-xs text-gray-500 pt-1 border-t border-gray-100">
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

/* Кастомный скролл для результатов поиска */
.max-h-60::-webkit-scrollbar {
  width: 6px;
}

.max-h-60::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

.max-h-60::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.max-h-60::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
