<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useInputFocus } from '@/store/TopAppBar.ts'

const inputFocusTaskStore = useInputFocus()

const inputString = ref('')

let timeoutId: number | null = null

const emit = defineEmits(['filter-changed', 'focus-blur'])

// Событие при каждом наборе текста в input
const onInput = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => emit('filter-changed', inputString.value), 400)
}

// Фокус на input
const handleFocus = () => inputFocusTaskStore.changeFocus(true)

// Потеря фокуса input
const handleBlur = () => {
  inputString.value = ''
  inputFocusTaskStore.changeFocus(false)
  emit('focus-blur')
}

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
    <input
      v-model="inputString"
      @focusin="handleFocus"
      @blur="handleBlur"
      @input="onInput"
      class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
      placeholder="Введите название точки..."
    />
  </div>
</template>

<style scoped>

</style>
