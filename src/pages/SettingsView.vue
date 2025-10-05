<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, nextTick, onMounted, ref, type Ref } from 'vue'
import { useCache } from '@/composables/useCache.ts'
import { PointResponse } from '@/model/PointResponse.ts'
import { useRealRouteMap } from '@/composables/useRealRouteMap.ts'

const router = useRouter()
const { obtainCachedPoints } = useCache()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

const cachedPoints: Ref<PointResponse[]> = ref([])
const map: Ref<L.Map | null> = ref(null)
const selectedPoint: Ref<PointResponse | null> = ref(null)

const {
  mapContainer,
  points,
  routes,
  isLoading,
  roadNetwork,
  loadingProgress,
  buildRealRoutes,
  reloadRoadNetwork,
  addPoint,
  removeLastPoint,
  initMap,
} = useRealRouteMap()

onMounted(async () => {
  await nextTick()
  initMap()
})
</script>

<template>
  <BackButton @click="router.back" />

  <div>
    <!--    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">-->
    <!-- Карта -->
    <!--          <div class="fixed top-0 z-10 start-0 end-0 text-black text-lg text-center">-->
    <!--            <p>Версия: {{ DEV_VERSION }}</p>-->
    <!--            <h2>-->
    <!--              Карта ({{ cachedPoints.length }} точек)-->
    <!--            </h2>-->
    <!--          </div>-->
    <!--          <div class="pt-4">-->
    <!--            <div id="map" class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full"></div>-->
    <!--          </div>-->
    <!--    </div>-->

    <div class="h-screen w-full flex flex-col bg-gray-100">
      <!-- Заголовок и панель управления -->
      <div class="bg-white shadow-md p-4">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">
          🛣️ Реальная маршрутизация по дорогам (Vue 3 + TypeScript)
        </h1>

        <div class="flex flex-wrap gap-2 mb-4">
          <button
            @click="buildRealRoutes"
            :disabled="isLoading || roadNetwork.nodesSize === 0"
            class="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-4 py-2 rounded-md transition-colors"
          >
            {{ isLoading ? 'Строим маршруты...' : '🗺️ Построить реальные маршруты' }}
          </button>

          <button
            @click="reloadRoadNetwork"
            class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            🔄 Обновить дорожную сеть
          </button>

          <button
            @click="addPoint"
            class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            ➕ Добавить точку
          </button>

          <button
            @click="removeLastPoint"
            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors"
          >
            ➖ Удалить точку
          </button>
        </div>

        <!-- Статус загрузки -->
        <div v-if="loadingProgress" class="mb-4 p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
          <div class="flex items-center">
            <div
              v-if="isLoading"
              class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"
            ></div>
            <span class="text-blue-800">{{ loadingProgress }}</span>
          </div>
        </div>

        <!-- Список точек -->
        <div class="mb-2">
          <h3 class="font-semibold text-gray-700 mb-2">Точки маршрута ({{ points.length }}):</h3>
          <div class="flex flex-wrap gap-2">
            <span
              v-for="(point, index) in points"
              :key="index"
              class="bg-gray-200 px-3 py-1 rounded-full text-sm"
            >
              {{ index + 1 }}. {{ point.name }}
            </span>
          </div>
        </div>

        <!-- Статистика дорожной сети -->
        <div v-if="roadNetwork.nodesSize > 0" class="mb-2">
          <h3 class="font-semibold text-gray-700 mb-2">Дорожная сеть:</h3>
          <div class="grid grid-cols-2 gap-4 text-sm">
            <div class="bg-green-50 p-2 rounded">
              <strong>Узлов:</strong> {{ roadNetwork.nodesSize }}
            </div>
            <div class="bg-blue-50 p-2 rounded">
              <strong>Дорог:</strong> {{ roadNetwork.waysSize }}
            </div>
          </div>
        </div>

        <!-- Легенда маршрутов -->
        <div v-if="routes.length > 0">
          <h3 class="font-semibold text-gray-700 mb-2">Реальные маршруты:</h3>
          <div class="flex flex-wrap gap-2">
            <div
              v-for="(route, index) in routes"
              :key="index"
              class="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded"
            >
              <div class="w-4 h-1 rounded" :style="{ backgroundColor: route.color }"></div>
              <span class="text-xs">
                {{ route.from }} → {{ route.to }} ({{ route.points }} точек)
              </span>
            </div>
          </div>
        </div>

        <!-- Информация -->
        <div class="mt-4 p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
          <h4 class="font-medium text-yellow-800 mb-2">ℹ️ Как это работает:</h4>
          <div class="text-sm text-yellow-700 space-y-1">
            <div>• Загружаем реальные дороги из OpenStreetMap через Overpass API</div>
            <div>• Строим граф дорожной сети с узлами и соединениями</div>
            <div>• Используем алгоритм A* для поиска кратчайшего пути</div>
            <div>• Маршруты следуют по настоящим улицам и дорогам</div>
            <div>• <strong>TypeScript обеспечивает безопасность типов!</strong></div>
          </div>
        </div>
      </div>

      <!-- Карта -->
      <div class="flex-1 relative">
        <div ref="mapContainer" class="w-full h-full"></div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
