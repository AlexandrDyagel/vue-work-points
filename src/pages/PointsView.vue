<script setup lang="ts">

import { getPoints } from '../../firebase/init.ts'
import { ref, watch, watchEffect } from 'vue'
import { useObtainPoints } from '../../store/Point.ts'
import { useRouter } from 'vue-router'
import type { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route } from '@/model/Routes.ts'
import { BackButton } from 'vue-tg'
import PointItemView from '@/components/PointItemView.vue'
import TopAppBarView from '@/components/TopAppBarView.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'

const loading = ref(true)

const obtainPointsStore = useObtainPoints()

function obtainPoints() {
  try {
    loading.value = true
    getPoints()
      .then(result => {
          obtainPointsStore.setPoints(result)
          loading.value = false
        },
        error => {
          console.log(`Ошибка error: ${error}`)
          loading.value = false
        })
    obtainPointsStore.updatePoints(false)
  } catch (e) {
    loading.value = false
    obtainPointsStore.updatePoints(false)
    console.log(`Ошибка catch: ${e}`)
  }
}

const queryInput = ref('')

const filteredPoints = ref([] as PointResponse[])

const router = useRouter()

const search = () => {
  filteredPoints.value = obtainPointsStore.points.filter(point =>
    point.name.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
}

watchEffect(() => {
  if (obtainPointsStore.updated || obtainPointsStore.points.length === 0) {
    obtainPoints()
    console.log('УДАЛЕННЫЙ ЗАПРОС НА СЕРВЕР')
  } else {
    loading.value = false
  }
  if (queryInput.value === '' && filteredPoints.value.length === 0) {
    filteredPoints.value = obtainPointsStore.points
    console.log('ЗАПРОС НА КЭШ')
  }
})

watch(queryInput, () => search())

const handleFilterChange = (queryString: string) => {
  queryInput.value = queryString
}

</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="loading" />
    <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
      <div
        v-if="filteredPoints.length === 0"
        @click="router.push(Route.AddPoint)"
        class="fixed shadow-xl start-4 end-4 top-16 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
        <p>Добавить точку +</p>
      </div>

      <TopAppBarView @filter-changed="handleFilterChange" />

      <div class="ms-4 me-4 mt-4">
        <div v-auto-animate>

            <PointItemView
              v-for="[index, point] of filteredPoints.entries()" :key="point.uid"
              :class="index !== filteredPoints.length - 1 ? `mb-4` : `mt-2 mb-20`"
              :dataPoint="point" />

            <!--

            <p class="nnn text-sm" @click="editPoint(point)"><strong>{{ index + 1 }}. {{ point.name
              }}</strong></p>
            <p class="text-color nnn text-xs"><strong>{{ point.address }}</strong></p>

            <div v-if="point.location.toRegion.latitude.length > 0">
              <p class="text-xs">В область:</p>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?pt=${point.location.toRegion.longitude},${point.location.toRegion.latitude}&z=18&l=map`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M480-301q99-80 149.5-154T680-594q0-90-56-148t-144-58q-88 0-144 58t-56 148q0 65 50.5 139T480-301Zm0 101Q339-304 269.5-402T200-594q0-125 78-205.5T480-880q124 0 202 80.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520ZM200-80v-80h560v80H200Zm280-520Z" />
                </svg>
              </button>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?rtext=~${point.location.toRegion.latitude},${point.location.toRegion.longitude}&rtt=auto`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
                </svg>
              </button>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?rtext=55.735401,37.644554~${point.location.toRegion.latitude},${point.location.toRegion.longitude}&rtt=auto`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M360-440h80v-110h80v110h80v-190l-120-80-120 80v190Zm120 254q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
                </svg>
              </button>
            </div>

            <div v-if="point.location.fromRegion.latitude.length > 0">
              <p class="text-xs">Из области:</p>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?pt=${point.location.fromRegion.longitude},${point.location.fromRegion.latitude}&z=18&l=map`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M480-301q99-80 149.5-154T680-594q0-90-56-148t-144-58q-88 0-144 58t-56 148q0 65 50.5 139T480-301Zm0 101Q339-304 269.5-402T200-594q0-125 78-205.5T480-880q124 0 202 80.5T760-594q0 94-69.5 192T480-200Zm0-320q33 0 56.5-23.5T560-600q0-33-23.5-56.5T480-680q-33 0-56.5 23.5T400-600q0 33 23.5 56.5T480-520ZM200-80v-80h560v80H200Zm280-520Z" />
                </svg>
              </button>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?rtext=~${point.location.fromRegion.latitude},${point.location.fromRegion.longitude}&rtt=auto`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
                </svg>
              </button>
              <button
                @click="miniApp.openLink(`https://yandex.ru/maps/?rtext=55.735401,37.644554~${point.location.fromRegion.latitude},${point.location.fromRegion.longitude}&rtt=auto`)"
                class="text-xs m-1 text-color nnn border border-solid rounded-md ps-2 pe-2 pt-1 pb-1">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"
                     fill="#e3e3e3">
                  <path
                    d="M360-440h80v-110h80v110h80v-190l-120-80-120 80v190Zm120 254q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z" />
                </svg>
              </button>
            </div>

          -->
        </div>
      </div>
    </div>
</template>
<style scoped>

</style>
