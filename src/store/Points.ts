import { defineStore } from 'pinia'
import { PointResponse } from '@/model/PointResponse.ts'

export const usePointsStore = defineStore('points', {
  state: () => ({ points: [] as PointResponse[] }),
  actions: {
    savePoints(points: PointResponse[]) {
      this.points = points
    },
  },
})
