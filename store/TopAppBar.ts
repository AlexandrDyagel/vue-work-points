import { defineStore } from 'pinia'

export const useInputFocus = defineStore('inputFocus', {
  state: () => ({ isFocused: false }),
  actions: {
    changeFocus(flag: boolean) {
      this.isFocused = flag
    }
  }
})
