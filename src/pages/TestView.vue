<script setup lang="ts">


// Используем composable функцию
import { useOptimalRoute } from '@/composables/useOptimalRoute.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useTgProfileStore } from '@/store/TgProfile.ts'

const tasksLocalStorage = useTasksLocalStorage()
const tgUserProfileStore = useTgProfileStore()

const {
  points,
  startPointId,
  isLoading,
  optimalRoute,
  totalDistance,
  removePoint
} = useOptimalRoute(tasksLocalStorage.getItems());

</script>

<template>
  <p>initDataUnsafe.user.id: {{tgUserProfileStore.userProfile.userId}}</p>
  <p>initDataUnsafe.user.first_name: {{tgUserProfileStore.userProfile.firstName}}</p>
  <p>initDataUnsafe.user.last_name: {{tgUserProfileStore.userProfile.lastName}}</p>
  <p>initDataUnsafe.user.username: {{tgUserProfileStore.userProfile.username}}</p>
  <p>initDataUnsafe.user.photo_url: {{tgUserProfileStore.userProfile.photoUrl}}</p>

<!--  <div class="min-h-screen bg-gray-100 p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-gray-800 mb-6">
        Оптимальный маршрут по точкам
      </h1>

      &lt;!&ndash; Стартовая точка &ndash;&gt;
      <div class="bg-black rounded-lg shadow-md p-6 mb-6">
        <h2 class="text-xl font-semibold mb-4">Стартовая точка</h2>
        <select
          v-model="startPointId"
          class="bg-black w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Выберите стартовую точку</option>
          <option
            v-for="point in points"
            :key="point.id"
            :value="point.id"
          >
            {{ point.name }} ({{ point.latitude }}, {{ point.longitude }})
          </option>
        </select>
      </div>

      &lt;!&ndash; Индикатор загрузки &ndash;&gt;
      <div v-if="isLoading" class="bg-black rounded-lg shadow-md p-6 mb-6 text-center">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
        <p class="text-gray-600">Поиск оптимального маршрута...</p>
      </div>

      &lt;!&ndash; Заранее известные точки &ndash;&gt;
      <div class="bg-black rounded-lg shadow-md p-6">
        <h2 class="text-xl font-semibold mb-4">Точки маршрута</h2>

        &lt;!&ndash; Сетка с точками &ndash;&gt;
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div
            v-for="point in points"
            :key="point.id"
            class="relative p-4 border rounded-lg hover:shadow-md transition-shadow"
            :class="{ 'border-blue-500 bg-blue-50': point.id === startPointId }"
          >
            <button
              @click="removePoint(point.id)"
              class="absolute top-2 right-2 text-red-600 hover:text-red-800"
              title="Удалить точку"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
              </svg>
            </button>

            <div class="font-medium text-lg mb-2">{{ point.name }}</div>
            <div class="text-sm text-gray-600">
              <div>Широта: {{ point.latitude }}</div>
              <div>Долгота: {{ point.longitude }}</div>
            </div>

            <div v-if="point.id === startPointId" class="mt-2">
              <span class="inline-flex items-center px-2 py-1 bg-blue-600 text-white text-xs rounded">
                Старт
              </span>
            </div>
          </div>
        </div>

        &lt;!&ndash; Оптимальный маршрут &ndash;&gt;
        <div v-if="optimalRoute.length > 0" class="border-t pt-6">
          <h3 class="text-lg font-semibold mb-4">Оптимальный маршрут</h3>

          <div class="space-y-4">
            <div
              v-for="(point, index) in optimalRoute"
              :key="index"
              class="flex items-center"
            >
              <div
                class="w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3"
                :class="index === 0 ? 'bg-green-600 text-white' : 'bg-blue-600 text-white'"
              >
                {{ index + 1 }}
              </div>
              <div class="flex-1">
                <span class="font-medium">{{ point.name }}</span>
                <span class="text-sm text-gray-500 ml-2">
                  ({{ point.latitude }}, {{ point.longitude }})
                </span>
              </div>
              <div v-if="index < optimalRoute.length - 1" class="text-gray-400 mx-4">
                →
              </div>
            </div>

            &lt;!&ndash; Общая дистанция &ndash;&gt;
            <div class="mt-4 p-4 bg-gray-50 rounded-md">
              <p class="text-gray-700">
                <span class="font-semibold">Общая дистанция:</span>
                {{ totalDistance.toFixed(2) }} км
              </p>
              <p class="text-xs text-gray-500 mt-1">
                * Использован оптимизированный алгоритм ближайшего соседа для быстрого расчета
              </p>
            </div>
          </div>
        </div>

        <div v-else-if="points.length < 2" class="text-center py-8 text-gray-500">
          <p>Добавьте минимум 2 точки для построения маршрута</p>
        </div>

        <div v-else-if="!startPointId" class="text-center py-8 text-gray-500">
          <p>Выберите стартовую точку для построения маршрута</p>
        </div>
      </div>
    </div>
  </div>-->
</template>

<style scoped>
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
