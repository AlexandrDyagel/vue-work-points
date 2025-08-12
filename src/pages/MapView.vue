<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { ref, onUnmounted } from 'vue'

const router = useRouter()

// Реактивные данные
const position = ref()
const positions = ref([])
const error = ref('')
const loading = ref(false)
const watching = ref(false)
const watchId = ref()

// Опции для геолокации
const options = {
  enableHighAccuracy: true, // Высокая точность
  timeout: 10000,          // Таймаут 10 секунд
  maximumAge: 60000        // Кэш на 1 минуту
}

// Проверка поддержки геолокации
const isGeolocationSupported = () => {
  return 'geolocation' in navigator
}

// Получение текущей позиции (одноразово)
const getCurrentPosition = async () => {
  if (!isGeolocationSupported()) {
    error.value = 'Геолокация не поддерживается вашим браузером'
    return
  }

  loading.value = true
  error.value = ''

  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options)
    })

    position.value = pos
    positions.value.push(pos)
    console.log('Геолокация получена:', pos)

  } catch (err) {
    handleError(err)
  } finally {
    loading.value = false
  }
}

// Начало отслеживания позиции
const watchPosition = () => {
  if (!isGeolocationSupported()) {
    error.value = 'Геолокация не поддерживается вашим браузером'
    return
  }

  if (watching.value) return

  error.value = ''
  watching.value = true

  watchId.value = navigator.geolocation.watchPosition(
    (pos) => {
      position.value = pos
      positions.value.push(pos)
      console.log('Позиция обновлена:', pos)
    },
    (err) => {
      handleError(err)
      watching.value = false
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
const handleError = (err) => {
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
const formatTime = (timestamp) => {
  return new Date(timestamp).toLocaleString('ru-RU')
}
-
// Очистка при размонтировании компонента
onUnmounted(() => {
  stopWatching()
})
</script>

<template>
  <BackButton @click="router.back" />

  <div class="geolocation-container">
    <h2>Геолокация пользователя</h2>

    <div class="controls">
      <button @click="getCurrentPosition" :disabled="loading">
        {{ loading ? 'Получение...' : 'Получить геолокацию' }}
      </button>

      <button @click="watchPosition" :disabled="watching">
        {{ watching ? 'Отслеживание активно' : 'Отслеживать позицию' }}
      </button>

      <button @click="stopWatching" :disabled="!watching">
        Остановить отслеживание
      </button>
    </div>

    <div v-if="error" class="error">
      <strong>Ошибка:</strong> {{ error }}
    </div>

    <div v-if="position" class="position-info">
      <h3>Текущая позиция:</h3>
      <div class="info-grid">
        <div><strong>Широта:</strong> {{ position.coords.latitude.toFixed(6) }}</div>
        <div><strong>Долгота:</strong> {{ position.coords.longitude.toFixed(6) }}</div>
        <div><strong>Точность:</strong> {{ Math.round(position.coords.accuracy) }} м</div>
        <div v-if="position.coords.altitude">
          <strong>Высота:</strong> {{ Math.round(position.coords.altitude) }} м
        </div>
        <div v-if="position.coords.speed">
          <strong>Скорость:</strong> {{ Math.round(position.coords.speed * 3.6) }} км/ч
        </div>
        <div><strong>Время:</strong> {{ formatTime(position.timestamp) }}</div>
      </div>
    </div>

    <div v-if="positions.length > 0" class="position-history">
      <h3>История позиций ({{ positions.length }}):</h3>
      <div class="history-list">
        <div v-for="(pos, index) in positions.slice().reverse()" :key="index" class="history-item">
          {{ pos.coords.latitude.toFixed(4) }}, {{ pos.coords.longitude.toFixed(4) }}
          - {{ formatTime(pos.timestamp) }}
        </div>
      </div>
    </div>
  </div>

</template>

<style scoped>
.geolocation-container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  font-family: Arial, sans-serif;
}

.controls {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

button {
  padding: 10px 15px;
  background-color: #007bff;
  color: black;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s;
}

button:hover:not(:disabled) {
  background-color: #0056b3;
}

button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.error {
  padding: 10px;
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
  margin-bottom: 20px;
}

.position-info {
  background-color: black;
  padding: 15px;
  border: 1px solid #c3e6cb;
  border-radius: 4px;
  margin-bottom: 20px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 10px;
  margin-top: 10px;
}

.position-history {
  background-color: black;
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
  margin-top: 10px;
}

.history-item {
  padding: 5px;
  border-bottom: 1px solid #e9ecef;
  font-size: 0.9em;
}

.history-item:last-child {
  border-bottom: none;
}

h2, h3 {
  color: #333;
  margin-top: 0;
}
</style>
