<script setup lang="ts">

import { getPoints } from '../../firebase/init.ts'
import { ref, watch, watchEffect } from 'vue'
import { useObtainPoints } from '../../store/Point.ts'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route } from '@/model/Routes.ts'
import { BackButton, useMiniApp } from 'vue-tg'
import PointItemView from '@/components/PointItemView.vue'
import TopAppBarView from '@/components/TopAppBarView.vue'
import LoadingScreen from '@/components/LoadingScreen.vue'

const miniApp = useMiniApp()

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

const openMap = () => {
  const stringPoints = obtainPointsStore.points.map(point => point.location.toRegion.longitude + ',' + point.location.toRegion.latitude).join("~")
  const link = `https://yandex.ru/maps/?pt=${stringPoints}&z=18&l=map`
  miniApp.openLink(link)
}

</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="loading" />
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
    <div
      v-if="filteredPoints.length === 0"
      @click="router.push(Route.AddPoint)"
      class="fixed z-20 shadow-xl start-4 end-4 top-16 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
      <p>Добавить точку +</p>
    </div>

    <TopAppBarView class="fixed sticky bg-[#242528] top-0 start-0 end-0 z-10"
                   @filter-changed="handleFilterChange" />

    <div class="me-4 ms-4">
      <div
        @click="openMap"
        class="text-center w-full shadow-xl border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
      >Показать на карте</div>
    </div>

    <div class="mx-1 t-4">
      <div v-auto-animate>

        <PointItemView
          v-for="[index, point] of filteredPoints.entries()" :key="point.uid"
          :class="index === filteredPoints.length - 1 ? `mb-20` : ``"
          :dataPoint="point" />

      </div>
    </div>
  </div>
</template>
<style scoped>

</style>
