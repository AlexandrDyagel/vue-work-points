<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, onMounted, ref, type Ref } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'

const router = useRouter()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

const cachedPoints = ref<PointResponse[]>([])

const { obtainCachedPoints } = useCache()

const indexClicked = ref(0)

const road = (index: number, listPoints: PointResponse[]): string => {
  if (index === 0) {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500 translate-y-1/2'
  } else if (index === listPoints.length - 1) {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500 -translate-y-1/2'
  } else {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500'
  }
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
    console.log(`Ошибка TasksView.vue в onMounted catch: ${e}`)
  }
})
</script>

<template>
  <BackButton @click="router.back" />
  <p>Карта</p>

  <div id="app" class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-md mx-auto rounded-lg overflow-hidden">
      <ul>
        <li
          v-for="(point, index) in cachedPoints"
          :key="index"
          class="relative py-5 px-6"
          @click="indexClicked = index"
        >
          <!-- Дорожка -->
          <div :class="road(index, cachedPoints)"></div>

          <!-- Точка на дорожке -->
          <div
            class="absolute left-8 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-white z-10"
            :class="{ 'animate-pulse-custom': index === indexClicked }"
            style="box-shadow: 0 0 0 2px #3b82f6;"
          ></div>

          <!-- Информация о точке point -->
          <div class="ml-10">
            <div class="font-bold text-[#F0F0F0]">{{ point.name }}</div>
            <div class="text-sm text-[#999]">{{ point.direction }}</div>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.animate-pulse-custom {
  animation: pulse 2s infinite;
}
</style>
