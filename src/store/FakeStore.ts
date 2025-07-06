import { defineStore } from 'pinia'

export const useFakeTaskItems = defineStore('fakeTaskItems', {
  state: () => ({ items: '' }),
  actions: {
    addAll(items: string) {
      this.items = items
    },
    remove(): void {
      this.items = ''
    }
  }
})
