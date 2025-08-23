<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { customRef, inject, nextTick, onMounted, ref, type Ref } from 'vue'
import { DEV_VERSION } from '@/main.ts'
import { useCache } from '@/composables/useCache.ts'
import { PointResponse } from '@/model/PointResponse.ts'

const router = useRouter()
const { obtainCachedPoints } = useCache()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

const cachedPoints: Ref<PointResponse[]> = ref([])
const map: Ref<L.Map | null> = ref(null);
const selectedPoint: Ref<PointResponse | null> = ref(null);
const isModalOpen = ref(false);

onMounted(async () => {
  try {
    isLoadingData.value = true

    await obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })

    await nextTick(async () => {
      initMap();
    });

    isLoadingData.value = false

  } catch (e) {
    isLoadingData.value = false
    console.log(`Ошибка SettingsView.vue в onMounted catch: ${e}`)
  }
})

const initMap = () => {
  // Создаем карту с центром в Москве
  const leafletMap = L.map('map').setView([55.7558, 37.6176], 6);

  // Добавляем слой карты OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(leafletMap);

  map.value = leafletMap;

  // Добавляем маркеры для всех точек
  addMarkersToMap();

  // Подгоняем карту под все маркеры
  fitMapToMarkers();
};

const addMarkersToMap = () => {
  if (!map.value) return;
  cachedPoints.value.forEach(point => {
    // Создаем кастомный маркер
    const marker = L.marker([Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude)], {
      title: point.name
    }).addTo(map.value);

    // Создаем popup с информацией о точке
    const popupContent = `
                            <div class="p-2">
                                <h3 class="font-bold text-lg text-blue-600 mb-1">${point.name}</h3>
                                <p class="text-gray-600 text-sm mb-2">${point.address}</p>
                                <div class="text-xs text-gray-500">
                                    <div>Координаты: ${point.location.toRegion.latitude}, ${point.location.toRegion.longitude}</div>
                                    <div>ID: ${point.uid}</div>
                                </div>
                            </div>
                        `;

    marker.bindPopup(popupContent);

    // Обработчик клика на маркер
    marker.on('click', () => {
      selectedPoint.value = point;
      isModalOpen.value = true;
    });
  });
};

const fitMapToMarkers = () => {
  if (!map.value || cachedPoints.value.length === 0) return;

  const group = L.featureGroup();
  cachedPoints.value.forEach(point => {
    L.marker([Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude)]).addTo(group);
  });

  map.value.fitBounds(group.getBounds().pad(0.1));
};

const closeModal = () => {
  isModalOpen.value = false;
  selectedPoint.value = null;
};

// Показать точку на карте
const zoomToPoint = (point: PointResponse) => {
  if (!map.value) return;
  map.value.setView([Number(point.location.toRegion.latitude), Number(point.location.toRegion.longitude)], 15);
  closeModal();
};

</script>

<template>
  <BackButton @click="router.back" />

  <div>
    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">
        <!-- Карта -->
          <div class="fixed top-0 z-10 start-0 end-0 text-black text-lg text-center">
            <p>Версия: {{ DEV_VERSION }}</p>
            <h2>
              Карта ({{ cachedPoints.length }} точек)
            </h2>
          </div>
          <div class="pt-4">
            <div id="map" class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full"></div>
          </div>

      <!-- Модальное окно с информацией о точке -->
      <div
        v-if="isModalOpen && selectedPoint"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click="closeModal"
      >
        <div
          class="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
          @click.stop
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-bold text-gray-900">
              {{ selectedPoint.name }}
            </h3>
            <button
              @click="closeModal"
              class="text-gray-400 hover:text-gray-600 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div class="space-y-3 mb-6">
            <div>
              <span class="text-sm font-medium text-gray-500">Адрес:</span>
              <p class="text-gray-900">{{ selectedPoint.address }}</p>
            </div>

            <div>
              <span class="text-sm font-medium text-gray-500">Координаты:</span>
              <p class="text-gray-900">{{ selectedPoint.location.toRegion.latitude }}, {{ selectedPoint.location.toRegion.longitude }}</p>
            </div>

            <div>
              <span class="text-sm font-medium text-gray-500">ID:</span>
              <p class="text-gray-900">{{ selectedPoint.uid }}</p>
            </div>
          </div>

          <div class="flex gap-3">
            <button
              @click="zoomToPoint(selectedPoint)"
              class="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              Показать на карте
            </button>
            <button
              @click="closeModal"
              class="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors font-medium"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-container {
  height: 500px;
  border-radius: 0.5rem;
}

.leaflet-popup-content-wrapper {
  border-radius: 0.5rem;
}

.custom-marker {
  background-color: #3cd916;
  border: 2px solid #ffffff;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
</style>
