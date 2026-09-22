import { defineStore } from 'pinia'

export const useNoteEditor = defineStore('noteEditor', {
  state: () => ({
    editingIds: [] as string[],
  }),
  getters: {
    isEditing: (state) => state.editingIds.length > 0,
  },
  actions: {
    setEditing(uid: string, editing: boolean) {
      if (editing) {
        if (!this.editingIds.includes(uid)) {
          this.editingIds.push(uid)
        }
      } else {
        this.editingIds = this.editingIds.filter((id) => id !== uid)
      }
    },
  },
})
