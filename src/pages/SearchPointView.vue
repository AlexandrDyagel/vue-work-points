<script setup lang="ts">
import StepDownImg from '@/assets/images/step_down.png'
import StepUpImg from '@/assets/images/step_up.png'
import TunnelImg from '@/assets/images/tunnel.png'
import { PointResponse } from '@/model/PointResponse.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { TypePoint } from '@/model/Enums.ts'
import { computed, inject, onMounted, onUnmounted, type Ref, ref, shallowRef, watch } from 'vue'
import Svg from '@/components/Svg.vue'
import SearchPointIcon from '@/components/icons/SearchPointIcon.vue'
import { useCache } from '@/composables/useCache.ts'
import WorldGlobeIcon from '@/components/icons/WorldGlobeIcon.vue'
import { useMiniApp, useTheme } from 'vue-tg/8.0'
import { DEV_VERSION } from '../main.ts'

const searchPointIcon = shallowRef(SearchPointIcon)
const iconButton = shallowRef(WorldGlobeIcon)

const { openLink } = useMiniApp()
const { headerColor } = useTheme()

const { obtainCachedPoints } = useCache()
const cachedPoints = ref<PointResponse[]>([])
const isLoadingData = inject<Ref<boolean>>('isLoadingData', ref(true))

const userLocation: Ref<GeoPoint> = ref(new GeoPoint())

const error = ref('')
const watching = ref(false)
const watchId: Ref<number | null> = ref(null)
const closestPoint: Ref<PointResponse | null> = ref(null)
const minDistance = ref<number>(Infinity)

const url = computed(() => `https://yandex.ru/maps/?pt=${closestPoint?.value?.location.toRegion.longitude},${closestPoint?.value?.location.toRegion.latitude}&z=18&l=map`)

// Опции для геолокации
const options = {
  enableHighAccuracy: true, // Высокая точность
  timeout: 10000,          // Таймаут 10 секунд
  maximumAge: 0        // Без кэшированных данных
}

// Проверка поддержки геолокации
const isGeolocationSupported = () => {
  return 'geolocation' in navigator
}

onMounted(async () => {
  try {
    isLoadingData.value = true

    await obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })
  } catch (e) {
    console.error(`Ошибка SettingsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

// Начало отслеживания позиции
const watchPosition = () => {
  if (!isGeolocationSupported()) {
    error.value = 'Геолокация не поддерживается вашим браузером'
    return
  }

  if (watchId.value !== null) return
  if (watching.value) return

  error.value = ''
  watching.value = true

  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      userLocation.value = new GeoPoint(
        pos.coords.latitude.toFixed(6).toString(),
        pos.coords.longitude.toFixed(6).toString()
      )

      findClosestPoint()

      console.log('formatTime: ', formatTime(pos.timestamp))
      console.log('Позиция обновлена:', pos)
    },
    (err) => {
      handleError(err)
      watching.value = false
      stopWatching()
    },
    options
  )
}

// Остановка отслеживания позиции
const stopWatching = () => {
  if (watchId.value !== null) {
    navigator.geolocation.clearWatch(watchId.value)
    watchId.value = null
    watching.value = false
  }
}

// Обработка ошибок
const handleError = (err: GeolocationPositionError) => {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      error.value = 'Доступ к геолокации запрещен пользователем'
      break
    case err.POSITION_UNAVAILABLE:
      error.value = 'Информация о местоположении недоступна'
      break
    case err.TIMEOUT:
      error.value = 'Превышено время ожидания запроса геолокации'
      break
    default:
      error.value = 'Произошла неизвестная ошибка при получении геолокации'
      break
  }
  console.error('Ошибка геолокации:', err)
}

// Форматирование времени
const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleString('ru-RU')
}

/**
 * Вычисляет расстояние между двумя точками на сфере по формуле гаверсинусов
 * @param userLocation - Текущее местоположение пользователя
 * @param pointLocation - Местоположение точки
 * @returns Расстояние в метрах
 */
function getDistance(userLocation: GeoPoint, pointLocation: GeoPoint) {
  const R = 6371e3 // Радиус Земли в метрах
  const φ1 = Number(userLocation.latitude) * Math.PI / 180 // Преобразование широты в радианы
  const φ2 = Number(pointLocation.latitude) * Math.PI / 180
  const Δφ = (Number(pointLocation.latitude) - Number(userLocation.latitude)) * Math.PI / 180
  const Δλ = (Number(pointLocation.longitude) - Number(userLocation.longitude)) * Math.PI / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c // Расстояние в метрах
}

// Поиск в кэше ближайшей точки от позиции геолокации юзера
const findClosestPoint = (): void => {
  minDistance.value = Infinity

  if (cachedPoints.value.length === 0) {
    console.log('Нет доступных точек для поиска')
    return
  }

  cachedPoints.value.forEach(point => {
    const distance = getDistance(userLocation.value, point.location.toRegion)

    if (distance < minDistance.value) {
      minDistance.value = distance
      closestPoint.value = point
    }
  })
}

// Поиск точки
const searchPoint = () => {
  console.log('Поиск точки')
  // Здесь будет логика
  //getCurrentPosition()
  watchPosition()
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
  }
}

const getTypeName = (typePoint: TypePoint) => {
  switch (typePoint) {
    case TypePoint.PP:
      return 'Переход надземный'
    case TypePoint.TA:
      return 'Тоннель автодорожный'
    case TypePoint.TP:
      return 'Тоннель пешеходный'
  }
}

// Очистка при размонтировании компонента
onUnmounted(() => {
  stopWatching()
  headerColor.value = '#242528'
})

watch(closestPoint, () => headerColor.value = '#16a34a')
</script>

<template>
  <div class="fixed top-1 start-0 end-0 w-full text-center text-sm z-50">v{{ DEV_VERSION }}</div>
  <div
    v-if="!closestPoint"
    class="fixed overflow-auto start-0 top-0 end-0 bottom-0 flex items-center justify-center bg-[#242528]"
  >
    <button
      class="search-button search-btn" :class="watching ? 'search-btn-animation' : ''"
      @click="searchPoint" aria-label="Начать поиск ближайшей точки"
    >
      <Svg>
        <component ref="comp" :is="searchPointIcon"></component>
      </Svg>
    </button>
  </div>

  <div
    v-if="watching"
    class="fixed w-full bottom-[300px] start-0 end-0 text-center text-sm]">
    <div class="inline-flex items-center justify-center gap-2">
      <svg aria-hidden="true" class="inline w-6 h-6 text-gray-200 animate-spin dark:text-gray-600 fill-[#3d7eff]" viewBox="0 0 100 101" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
      </svg>
      <span>Идет поиск...</span>
    </div>
  </div>

  <div
    v-if="closestPoint"
    class="fixed overflow-auto bg start-0 top-0 end-0 bottom-0 w-full h-full text-center p-5"
  >
    <div class="call-header">
      <div class="call-status">Скорее всего это</div>
      <div class="phone-number">~ {{ minDistance.toFixed(0) }} м</div>
      <div class="type-point"></div>
    </div>

    <div class="flex items-center justify-center">
      <img :src="getIcon(closestPoint.type)" class="rounded-sm w-24 h-24" alt="" />
    </div>

    <div class="point-info">
      <div class="type-point">{{ getTypeName(closestPoint.type) }}</div>
      <div class="point-name">
        «{{ closestPoint.name.trim() }}»
      </div>
      <div class="direction-badge">{{ closestPoint.direction }}</div>
      <div class="address">{{ closestPoint.address }}</div>
    </div>

    <div
      @click="openLink(url)"
      class="flex flex-row items-center justify-center gap-1 start-0 end-0 bottom-0 mb-[80px] bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl cursor-pointer"
    >
      <Svg>
        <component ref="comp" :is="iconButton"></component>
      </Svg>
      <span class="text-sm font-medium">На карте</span>
    </div>

  </div>
</template>

<style scoped>
.bg {
  background: linear-gradient(180deg, #16a34a 0%, #0D602BFF 20%, #242528 60%);
  height: 100dvh;
}

.call-header {
  margin-bottom: 50px;
}

.call-status {
  font-size: 18px;
  font-weight: 400;
  margin-bottom: 15px;
  opacity: 0.9;
}

.phone-number {
  font-size: 32px;
  font-weight: 300;
  margin-bottom: 10px;
  letter-spacing: 1px;
}

.type-point {
  margin-top: 15px;
  font-size: 14px;
  font-weight: 500;
  opacity: 0.8;
}

.point-info {
  margin-bottom: 60px;
}

.point-name {
  font-size: 24px;
  font-weight: 500;
  margin-top: 5px;
  margin-bottom: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.direction-badge {
  background: rgba(255, 255, 255, 0.2);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  display: inline-block;
  margin-bottom: 10px;
}

.address {
  font-size: 16px;
  opacity: 0.8;
}

.search-button {
  width: 70px;
  height: 70px;
  border-radius: 50%;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

.search-btn {
  background: #10b981;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.search-button:hover {
  transform: scale(1.1);
}

.search-button:active {
  transform: scale(0.95);
}

/* Анимация пульсации для кнопок */
@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
  }
  50% {
    transform: scale(1.10);
    box-shadow: 0 6px 45px rgba(16, 185, 129, 0.6);
  }
}

.search-btn-animation {
  animation: pulse 2s infinite;
}

@keyframes decline-pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 4px 20px rgba(239, 68, 68, 0.4);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 6px 25px rgba(239, 68, 68, 0.6);
  }
}
</style>
