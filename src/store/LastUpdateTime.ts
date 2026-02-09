import { defineStore } from 'pinia'

export const useLastUpdateTimeStore = defineStore('lastUpdateTime', {
  state: () => ({ isLastUpdateTime: false }),
  actions: {
    setLastUpdateTime(timeUpdated: boolean) {
      this.isLastUpdateTime = timeUpdated
    }
  }
})
