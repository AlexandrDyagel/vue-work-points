<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { nextTick, onMounted, onUnmounted, ref } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useMiniApp } from 'vue-tg/8.0'
import LoadingScreen from '@/components/LoadingScreen.vue'
import { TaskTag, TypePoint } from '@/model/Enums.ts'
import { useCache } from '@/composables/useCache.ts'
import { useTaskPointsStore } from '@/store/TaskPoints.ts'
import { useOptimalRoute } from '@/composables/useOptimalRoute.ts'
import { usePointsStore } from '@/store/Points.ts'
import * as L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'
import StepUpImg from '@/assets/images/step_up.png'
import TunnelImg from '@/assets/images/tunnel.png'
import WorkHomeImg from '@/assets/images/work_home.png'
import StepDownImg from '@/assets/images/step_down.png'

const router = useRouter()
const pointsStore = usePointsStore()
const tasksLocalStorage = useTasksLocalStorage()
const { getCompletedTasks, setCompletedTask, getTaskTags, setTaskTag, getTaskNotes, setTaskNote } = tasksLocalStorage
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
const taskItems = ref<PointResponse[]>([])
const completedTaskIds = ref<string[]>([])
const taskTags = ref<Record<string, TaskTag>>({})
const taskNotes = ref<Record<string, string>>({})
// Точка, для которой запрошено подтверждение удаления
const deleteTaskConfirm = ref<PointResponse | null>(null)
const map = ref<L.Map | null>(null)
// Маркеры точек на карте
const markers = ref<L.Marker[]>([])
// Хранилище для линий маршрутов
const routePolylines = ref<L.Polyline[]>([])
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

// Экранирование HTML для безопасного вывода пользовательских данных
const escapeHtml = (value: string): string => {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(value))
  return div.innerHTML
}

// Русское название тега задачи
const getTagLabel = (tag?: TaskTag): string => {
  switch (tag) {
    case TaskTag.LIGHTING: return 'Освещение'
    case TaskTag.CAMERAS: return 'Камеры'
    case TaskTag.OTHER: return 'Другое'
    default: return ''
  }
}

// Tailwind-классы бейджа тега
const getTagClasses = (tag?: TaskTag): string => {
  switch (tag) {
    case TaskTag.LIGHTING: return 'bg-amber-500 border-amber-500 text-black'
    case TaskTag.CAMERAS: return 'bg-blue-500 border-blue-500 text-white'
    case TaskTag.OTHER: return 'bg-purple-500 border-purple-500 text-white'
    default: return ''
  }
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

// SVG-иконки для кнопок попапа
const routeIconSvg = `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M6.293 5.207l3.5 3.5a1.001 1.001 0 0 0 1.665-.42l1.5-5a1 1 0 0 0-1.245-1.245l-5 1.5a1.003 1.003 0 0 0-.42 1.665z"></path><path d="M4.96 8.157c-1.708 1.501-1.952 4.168-.548 5.968 1.414 1.812 3.99 2.107 5.756.658l4.88-4.004a2.112 2.112 0 0 1 3.016.346c.749.96.617 2.4-.293 3.2l-1.043.916c-.409.36-.456.99-.106 1.41.35.42.966.468 1.375.108l1.043-.916c1.708-1.502 1.953-4.166.547-5.968-1.412-1.81-3.992-2.106-5.756-.658l-4.88 4.004a2.11 2.11 0 0 1-3.016-.346c-.747-.958-.616-2.4.293-3.2l.542-.415c.409-.36.46-.99.11-1.41a.964.964 0 0 0-1.38-.11l-.54.417z"></path><path d="M10 19a3 3 0 1 1 6 0 3 3 0 0 1-6 0z"></path></svg>`

const globeIconSvg = `<svg class="h-3.5 w-3.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path fill-rule="evenodd" clip-rule="evenodd" d="M14.357 19.646c1.549-1.941 2.409-4.158 2.59-6.646h2.983a8 8 0 0 1-5.572 6.646zM4.07 13h2.984c.181 2.488 1.041 4.705 2.59 6.646A8 8 0 0 1 4.068 13zm5.573-8.646C8.094 6.296 7.234 8.512 7.053 11H4.07a8.003 8.003 0 0 1 5.573-6.646zM9.044 11c.206-2.415 1.176-4.5 2.957-6.314C13.78 6.5 14.748 8.585 14.957 11H9.043zm0 2h5.912c-.207 2.416-1.176 4.5-2.955 6.314C10.22 17.5 9.25 15.416 9.044 13zm10.886-2h-2.982c-.183-2.488-1.043-4.704-2.59-6.646A8.003 8.003 0 0 1 19.93 11zM12 2C6.478 2 2 6.478 2 12c0 5.523 4.477 10 10 10s10-4.477 10-10c0-5.522-4.477-10-10-10z"></path></svg>`

const trashIconSvg = `<svg class="h-3.5 w-3.5" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"></path></svg>`

const doneIconSvg = `<svg class="h-3.5 w-3.5" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"></path></svg>`

const pendingIconSvg = `<svg class="h-3.5 w-3.5" viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><path d="M480-120q-74 0-139.5-28.5T226-226q-49-49-77.5-114.5T120-480q0-74 28.5-139.5T226-734q49-49 114.5-77.5T480-840q74 0 139.5 28.5T734-734q49 49 77.5 114.5T840-480q0 74-28.5 139.5T734-226q-49 49-114.5 77.5T480-120Zm0-80q117 0 198.5-81.5T760-480q0-117-81.5-198.5T480-760q-117 0-198.5 81.5T280-480q0 117 81.5 198.5T480-200Zm0-180 100-100-40-40-100 100v-160h-40v200h80Z"></path></svg>`

// Получение координат точки (с fallback toRegion -> fromRegion)
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

    const cachedPoints = await tasksLocalStorage.getItems()
    completedTaskIds.value = await getCompletedTasks()
    taskTags.value = await getTaskTags()
    taskNotes.value = await getTaskNotes()
    points.value.push(...cachedPoints)
    taskItems.value = cachedPoints
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
})

const initMap = () => {
  // Защита от повторной инициализации карты
  if (map.value) return

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

// Переключение видимости линий
const toggleRoutesVisibility = () => {
  isRoutesVisible.value = !isRoutesVisible.value

  routePolylines.value.forEach((polyline) => {
    polyline.setStyle({ opacity: isRoutesVisible.value ? 0.9 : 0 })
  })
}

// Отрисовка маршрутов между точками
const drawRoutes = () => {
  const leafletMap = map.value
  if (!leafletMap || optimalRoute.value.length < 2) return

  // Очищаем предыдущие линии
  routePolylines.value.forEach((polyline) => {
    polyline.remove()
  })
  routePolylines.value = []

  // Рисуем линии между последовательными точками
  for (let i = 0; i < optimalRoute.value.length - 1; i++) {
    const currentPoint = optimalRoute.value[i]
    const nextPoint = optimalRoute.value[i + 1]

    const currentCoords = getPointCoordinates(currentPoint)
    const nextCoords = getPointCoordinates(nextPoint)
    if (!currentCoords || !nextCoords) continue

    // Создаем линию между точками
    const polyline = L.polyline([
      [currentCoords.lat, currentCoords.lng],
      [nextCoords.lat, nextCoords.lng]
    ], {
      color: routeColors[i % routeColors.length],
      weight: 4,
      opacity: isRoutesVisible.value ? 0.9 : 0, // Учитываем текущее состояние видимости
      smoothFactor: 1,
      lineCap: 'round',
      lineJoin: 'round'
    })

    leafletMap.addLayer(polyline)

    // Добавляем всплывающую подсказку с информацией о сегменте
    const distance = calculateDistance(
      currentCoords.lat, currentCoords.lng,
      nextCoords.lat, nextCoords.lng
    )

    polyline.bindPopup(`
      <div class="p-2">
        <h4 class="font-bold text-sm mb-1">Сегмент ${i + 1}</h4>
        <p class="text-xs">От: ${escapeHtml(currentPoint.name)}</p>
        <p class="text-xs">До: ${escapeHtml(nextPoint.name)}</p>
        <p class="text-xs font-bold mt-1">Расстояние: ${distance.toFixed(2)} км</p>
      </div>
    `)

    routePolylines.value.push(polyline)
  }
}

// Расчет расстояния между точками (формула гаверсинуса)
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

// Функция для создания иконки текстовой метки
const createTextIcon = (typePoint: TypePoint, text: string, isCompleted = false): L.DivIcon => {
  const textDecoration = isCompleted ? 'line-through' : 'none'
  const color = isCompleted ? '#5fb336' : (typePoint !== TypePoint.Home ? '#3388ff' : '#5e0808')

  return L.divIcon({
    html: `
      <div style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        <div
        class="truncate rounded border text-[10px] font-bold px-1 py-0.5 mb-1"
        style="background: ${color}; text-decoration: ${textDecoration};">
        ${escapeHtml(text)}
        </div>
        <div style="
          width: 10px;
          height: 10px;
          background: ${color};
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
}

// Функция для создания текстовой метки
const createTextMarker = (typePoint: TypePoint, lat: number, lon: number, text: string, isCompleted = false) => {
  return L.marker([lat, lon], {
    icon: createTextIcon(typePoint, text, isCompleted)
  })
}

const clearMarkers = () => {
  markers.value.forEach((marker) => {
    marker.remove()
  })
  markers.value = []
}

// Запрос подтверждения удаления задания
const requestDeleteTask = (point: PointResponse) => {
  deleteTaskConfirm.value = point
}

const confirmDeleteTask = async () => {
  const point = deleteTaskConfirm.value
  deleteTaskConfirm.value = null
  if (!point) return

  map.value?.closePopup()

  await removePoint(point.uid)

  taskItems.value = taskItems.value.filter((item) => item.uid !== point.uid)
  completedTaskIds.value = completedTaskIds.value.filter((uid) => uid !== point.uid)
  await setCompletedTask(point.uid, false)

  const { [point.uid]: _removedTag, ...restTags } = taskTags.value
  taskTags.value = restTags
  await setTaskTag(point.uid, null)

  const { [point.uid]: _removedNote, ...restNotes } = taskNotes.value
  taskNotes.value = restNotes
  await setTaskNote(point.uid, null)

  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)

  // Дожидаемся пересчёта маршрута и перерисовываем карту
  setTimeout(() => {
    clearMarkers()
    addMarkersToMap()
    drawRoutes()
    fitMapToMarkers()
  }, 50)
}

const cancelDeleteTask = () => {
  deleteTaskConfirm.value = null
}

const addMarkersToMap = () => {
  const leafletMap = map.value
  if (!leafletMap) return

  optimalRoute.value.forEach((point, index) => {
    const coords = getPointCoordinates(point)
    if (!coords) return

    const marker = createTextMarker(
      point.type,
      coords.lat,
      coords.lng,
      `${index + 1}. ${point.name}`,
      completedTaskIds.value.includes(point.uid)
    )

    leafletMap.addLayer(marker)

    const { urlRoute, urlPoint } = buildPointUrls(point)
    const isCompleted = completedTaskIds.value.includes(point.uid)
    const tag = taskTags.value[point.uid]
    const note = taskNotes.value[point.uid]?.trim()
    const tagLabel = getTagLabel(tag)
    const tagClasses = getTagClasses(tag)

    const popupDiv = document.createElement('div')
    popupDiv.className = 'p-3'

    popupDiv.innerHTML = `
      <div class="w-[250px]">
        <!-- 1. Информация о точке -->
        <div class="flex flex-row justify-between gap-2">
          <div class="min-w-0">
            <h3 class="font-bold text-lg text-blue-600 mb-1">${index + 1}. ${escapeHtml(point.name)}</h3>
            <div class="text-gray-600 text-sm mb-0.5">${escapeHtml(point.direction)}</div>
            <div class="text-gray-500 text-sm">${escapeHtml(point.address)}</div>
          </div>
          <div class="w-12 h-12 shrink-0 rounded-md overflow-hidden border border-gray-200">
            <img src="${getIcon(point.type) ?? ''}" class="w-full h-full object-cover" alt="" />
          </div>
        </div>

        <!-- 2. Данные задания: тег и заметка -->
        ${(tag || note) ? `
        <div class="mt-3 rounded-lg bg-gray-50 border border-gray-200 p-2.5 space-y-1.5">
          ${tag ? `<div class="flex flex-wrap items-center gap-1.5"><span class="rounded-full border px-2.5 py-0.5 text-xs font-medium ${tagClasses}">${tagLabel}</span></div>` : ''}
          ${note ? `<div class="flex items-start gap-1.5 text-xs text-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 mt-px text-gray-500" viewBox="0 -960 960 960" fill="currentColor"><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm360-520v-200H200v560h560v-360H560Zm-280 400h400v-80H280v80Zm0-160h400v-80H280v80Zm-80-320v560-560Z"/></svg>
            <span class="break-words whitespace-pre-wrap">${escapeHtml(note)}</span>
          </div>` : ''}
        </div>` : ''}

        <!-- 3. Навигация -->
        <div class="mt-3">
          <div class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Навигация</div>
          <div class="flex gap-2">
            <button
              class="route-btn flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c] text-xs font-medium">
              ${routeIconSvg}
              <span>Маршрут</span>
            </button>
            <button
              class="point-btn flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[#ffffff] bg-[#3d7eff] active:bg-[#3c3c3c] text-xs font-medium">
              ${globeIconSvg}
              <span>Место</span>
            </button>
          </div>
        </div>

        <!-- 4. Действия -->
        <div class="mt-3 pt-3 border-t border-gray-200">
          <div class="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1.5">Действия</div>
          <div class="flex gap-2 items-center">
            <button
              class="status-btn flex-1 inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[#ffffff] active:bg-[#3c3c3c] text-xs font-medium ${isCompleted ? 'bg-[#5fb336]' : 'bg-[#e67e22]'}">
              <span class="status-icon inline-flex items-center justify-center">${isCompleted ? doneIconSvg : pendingIconSvg}</span>
              <span class="status-label">${isCompleted ? 'Выполнено' : 'В работе'}</span>
            </button>
            ${point.type !== TypePoint.Home && point.uid !== startPointId.value ? `<button
              class="delete-btn inline-flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-[#ffffff] bg-[#5e0808] active:bg-[#3c3c3c] text-xs font-medium">
              ${trashIconSvg}
              <span>Удалить</span>
            </button>` : ''}
          </div>
        </div>
      </div>
    `

    popupDiv.querySelector('.route-btn')?.addEventListener('click', () => {
      openExternalLink(urlRoute)
    })
    popupDiv.querySelector('.point-btn')?.addEventListener('click', () => {
      openExternalLink(urlPoint)
    })
    popupDiv.querySelector('.status-btn')?.addEventListener('click', () => {
      const wasCompleted = completedTaskIds.value.includes(point.uid)

      if (wasCompleted) {
        completedTaskIds.value = completedTaskIds.value.filter((uid) => uid !== point.uid)
      } else {
        completedTaskIds.value = [...completedTaskIds.value, point.uid]
      }

      setCompletedTask(point.uid, !wasCompleted)

      const statusBtn = popupDiv.querySelector('.status-btn')
      if (statusBtn) {
        statusBtn.classList.toggle('bg-[#e67e22]', wasCompleted)
        statusBtn.classList.toggle('bg-[#5fb336]', !wasCompleted)

        const statusIcon = statusBtn.querySelector('.status-icon')
        const statusLabel = statusBtn.querySelector('.status-label')
        if (statusIcon) statusIcon.innerHTML = wasCompleted ? pendingIconSvg : doneIconSvg
        if (statusLabel) statusLabel.textContent = wasCompleted ? 'В работе' : 'Выполнено'
      }

      // Обновляем внешний вид маркера в соответствии с новым статусом
      marker.setIcon(
        createTextIcon(
          point.type,
          `${index + 1}. ${point.name}`,
          !wasCompleted
        )
      )
    })
    popupDiv.querySelector('.delete-btn')?.addEventListener('click', () => {
      requestDeleteTask(point)
    })

    marker.bindPopup(popupDiv)
    markers.value.push(marker)
  })
}

const fitMapToMarkers = () => {
  const leafletMap = map.value
  if (!leafletMap || optimalRoute.value.length === 0) return

  const bounds = L.latLngBounds([])

  optimalRoute.value.forEach((point) => {
    const coords = getPointCoordinates(point)
    if (coords) {
      bounds.extend([coords.lat, coords.lng])
    }
  })

  if (!bounds.isValid()) return

  leafletMap.fitBounds(bounds.pad(0.1))
}

onUnmounted(() => {
  // Очищаем линии при размонтировании компонента
  routePolylines.value.forEach((polyline) => {
    polyline.remove()
  })
})
</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <!-- Подтверждение удаления задания -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="deleteTaskConfirm" class="fixed inset-0 z-[9999]">
        <div class="absolute inset-0 bg-black/60" @click="cancelDeleteTask"></div>

        <div
          class="modal-content absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]"
        >
          <h2 class="text-lg font-bold text-white mb-2 text-center">Удалить задание?</h2>
          <p class="text-gray-400 text-sm text-center mb-5 break-words">{{ deleteTaskConfirm?.name }}</p>

          <button
            @click="confirmDeleteTask"
            class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
          >
            Удалить
          </button>
          <button
            @click="cancelDeleteTask"
            class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <div>
    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">
      <!-- Кнопка переключения видимости маршрутов -->
      <button
        @click="toggleRoutesVisibility"
        class="route-toggle-btn fixed right-4 z-20 px-4 py-2 rounded-lg text-white font-medium shadow-lg transition-all duration-200"
        :class="isRoutesVisible ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'"
        style="top: calc(env(safe-area-inset-top, 0px) + 16px)"
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
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: scale 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  scale: 0.95;
}

/* Анимация для кнопки переключения маршрутов */
.route-toggle-btn {
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  background-color: v-bind('isRoutesVisible ? "rgba(37, 99, 235, 0.9)" : "rgba(75, 85, 99, 0.9)"');
}

.route-toggle-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.route-toggle-btn:active {
  transform: translateY(0);
}
</style>
