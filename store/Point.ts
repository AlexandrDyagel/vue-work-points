import { defineStore } from 'pinia'
import { PointResponse } from '@/model/PointResponse.ts'

export const useEditPoint = defineStore('point', {
  state: () => ({ editPoint: {} as PointResponse }),
  actions: {
    savePoint(point: PointResponse | null) {
      if (point === null) return
      this.editPoint = point
    }
  }
})
