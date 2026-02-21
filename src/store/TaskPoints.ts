import { defineStore } from 'pinia'
import { PointResponse } from '@/model/PointResponse.ts'
import { computed, ref } from 'vue'

export const useTaskPointsStore = defineStore('taskPoints', () => {
  const points = ref<PointResponse[]>([])
  function savePoints(taskPoints: PointResponse[]) {
    points.value = taskPoints
  }
  const countPoints = computed(() => points.value.length)
  return { points, savePoints, countPoints }
})
