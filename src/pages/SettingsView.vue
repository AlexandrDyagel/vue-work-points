<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, onMounted, ref, type Ref } from 'vue'
import { DEV_VERSION } from '@/main.ts'
import LocationNavButtonView from '@/components/LocationNavButtonView.vue'
import { TypeLocationNavButton } from '@/model/Enums.ts'
import { GeoPoint } from '@/model/GeoPoint.ts'
import { useCache } from '@/composables/useCache.ts'
import { PointResponse } from '@/model/PointResponse.ts'

const router = useRouter()

const { obtainCachedPoints } = useCache()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

const cachedPoints = ref<PointResponse[]>([])

const closestPoint = ref<PointResponse>(null)
const minDistance = ref<number>(Infinity)

const userLocation: Ref<GeoPoint> = ref(new GeoPoint())
const loading = ref(false)
const error = ref()

const requestGeolocation = () => {
  loading.value = true
  error.value = null
  userLocation.value = new GeoPoint()

  if (!navigator.geolocation) {
    error.value = 'Геолокация не поддерживается вашим браузером'
    loading.value = false
    return
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      userLocation.value = new GeoPoint(
        position.coords.latitude.toString(),
        position.coords.longitude.toString()
    )
      loading.value = false
    },
    (err) => {
      loading.value = false
      switch (err.code) {
        case err.PERMISSION_DENIED:
          error.value = 'Вы отказали в запросе геолокации'
          break
        case err.POSITION_UNAVAILABLE:
          error.value = 'Информация о местоположении недоступна'
          break
        case err.TIMEOUT:
          error.value = 'Время запроса геолокации истекло'
          break
        default:
          error.value = 'Произошла неизвестная ошибка'
      }
    },
    {
      enableHighAccuracy: true, // Высокая точность (если доступно)
      timeout: 10000, // Максимальное время ожидания (10 сек)
      maximumAge: 0 // Не использовать кешированные данные
    }
  )
}

// Функция для вычисления расстояния между двумя точками в метрах (формула гаверсинусов)
function getDistance(userLocation: GeoPoint, pointLocation: GeoPoint) {
  const R = 6371e3; // Радиус Земли в метрах
  const φ1 = Number(userLocation.latitude) * Math.PI / 180; // Преобразование широты в радианы
  const φ2 = Number(pointLocation.latitude) * Math.PI / 180;
  const Δφ = (Number(pointLocation.latitude) - Number(userLocation.latitude)) * Math.PI / 180;
  const Δλ = (Number(pointLocation.longitude) - Number(userLocation.longitude)) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Расстояние в метрах
}

const findClosestPoint = () => {

  cachedPoints.value.forEach(point => {
    const distance = getDistance(userLocation.value, point.location.toRegion);

    if (distance < minDistance.value) {
      minDistance.value = distance;
      closestPoint.value = point;
    }
  });
}

onMounted(async () => {
  try {
    isLoadingData.value = true

    obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })
    isLoadingData.value = false

  } catch (e) {
    isLoadingData.value = false
    console.log(`Ошибка SettingsView.vue в onMounted catch: ${e}`)
  }
})
</script>

<template>
  <BackButton @click="router.back" />

  <p>Настройки</p>
  <div class=" w-full text-center text-lg">
    <p>Версия: {{ DEV_VERSION }}</p>
  </div>
  <div>
    <div>
      <button class="border border-[#88ce02] px-2 py-1 rounded-lg" @click="requestGeolocation">Получить моё местоположение</button>
      <div v-if="loading">Загружаем данные...</div>
      <div v-if="error" class="error">{{ error }}</div>
      <div v-if="userLocation">
        <p>Широта: {{ userLocation.latitude }}</p>
        <p>Долгота: {{ userLocation.longitude }}</p>
        <LocationNavButtonView
          :location="{
        latitude: userLocation.latitude,
        longitude: userLocation.longitude
        }"
          :type="TypeLocationNavButton.POINT"
          name="На карте"
        />
        <button @click="findClosestPoint" class="border border-[#88ce02] px-2 py-1 rounded-lg">Найти ближайшую точку</button>
        <div v-if="closestPoint">
          <p>Ближайшая точка: {{ closestPoint.name }}</p>
          <p>Расстояние: {{ minDistance.toFixed(0) }} метров</p>
          <p></p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error {
  color: red;
}
</style>
