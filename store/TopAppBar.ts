import { defineStore } from 'pinia'

export const useInputFocus = defineStore('inputFocus', {
  state: () => ({ isFocused: false }),
  actions: {
    changeFocus(focus: boolean) {
      this.isFocused = focus
    }
  }
})
