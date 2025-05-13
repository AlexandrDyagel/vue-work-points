<script setup lang="ts">

import { getPoints } from '../../firebase/init.ts'
import { inject, type Ref, ref, watch, watchEffect } from 'vue'
import { useObtainPoints } from '../../store/Point.ts'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route } from '@/model/Routes.ts'
import PointItemView from '@/components/PointItemView.vue'
import TopAppBarView from '@/components/TopAppBarView.vue'
import { useInputFocus } from '../../store/TopAppBar.ts'

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

const inputTopAppBarStore = useInputFocus()

const obtainPointsStore = useObtainPoints()

function obtainPoints() {
  try {
    isLoadingData.value = true
    getPoints()
      .then(result => {
          obtainPointsStore.setPoints(result)
          isLoadingData.value = false
        },
        error => {
          console.log(`Ошибка error: ${error}`)
          isLoadingData.value = false
        })
    obtainPointsStore.updatePoints(false)
  } catch (e) {
    isLoadingData.value = false
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
    isLoadingData.value = false
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

/*const openMap = () => {
  const stringPoints = obtainPointsStore.points.map(point => point.location.toRegion.longitude + ',' + point.location.toRegion.latitude).join("~")
  const link = `https://yandex.ru/maps/?pt=${stringPoints}&z=18&l=map`
  miniApp.openLink(link)
}*/

</script>

<template>
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
    <div
      v-if="filteredPoints.length === 0"
      @click="router.push(Route.AddPoint)"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
      <p>Добавить точку +</p>
    </div>

    <TopAppBarView
      :class="inputTopAppBarStore.isFocused ? 'bottom-0 border-t-[1px]' : 'sticky top-0 border-b-[1px]'"
      class="fixed bg-[#242528] start-0 end-0 border-[#3d3e43] z-10"
                   @filter-changed="handleFilterChange"
    />

    <!--    <div class="me-4 ms-4">
          <div
            @click="focus"
            class="text-center w-full shadow-xl border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
          >Показать на карте</div>
        </div>-->

    <div class="t-4">
      <div v-auto-animate>
        <PointItemView
          v-for="[index, point] of filteredPoints.entries()" :key="point.uid"
          :class="index === filteredPoints.length - 1 ? `mb-[70px]` : `border-b-[1px] border-[#3d3e43]`"
          :dataPoint="point" />
      </div>
    </div>
  </div>
</template>
<style scoped>

</style>
