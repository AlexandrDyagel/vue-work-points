import { defineStore } from 'pinia'

export const useUpdatedTaskList = defineStore('updatedTaskList', {
  state: () => ({ isUpdated: false }),
  actions: {
    updateList(update: boolean) {
      this.isUpdated = update
    }
  }
})
