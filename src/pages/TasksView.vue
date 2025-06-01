<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { ref, watch } from 'vue'
import ItemTaskView from '@/components/ItemTaskView.vue'
import { useObtainPoints } from '../../store/Point.ts'
import { PointResponse } from '@/model/PointResponse.ts'
const router = useRouter()

const obtainPointsStore = useObtainPoints()

const taskItems = ref([] as PointResponse[])

const queryString = ref('')

const filteredPoints = ref([] as PointResponse[])

const search = () => {
  filteredPoints.value = obtainPointsStore.points.filter(point =>
    point.name.toLowerCase().includes(queryString.value.toLowerCase().trim()))
  console.log(filteredPoints.value.map(point => point.name))
}

const handleFilterChange = (inputString: string) => {
  queryString.value = inputString
}

const handleFocusOut = () => {
  if (filteredPoints.value.length === 0) return
  taskItems.value.push(filteredPoints.value[0])
  console.log(taskItems.value.map(p => p.name))
}

watch(queryString, () => search())

</script>

<template>
  <BackButton @click="router.back" />

  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full body">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания</strong></p>
<!--    <div v-auto-animate>
      <ItemTaskView
        v-for="[index, point] of taskItems.entries()" :key="point.uid"
        :index="index"
        @filter-changed="handleFilterChange"
        :class="index === taskItems.length - 1 ? `mb-[70px]` : `border-b-[1px] border-[#3d3e43]`" />
    </div>-->

    <ItemTaskView @focus-out="handleFocusOut" @filter-changed="handleFilterChange" />
  </div>

</template>

<style scoped>

</style>
