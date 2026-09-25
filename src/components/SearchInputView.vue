<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { useInputFocus } from '@/store/TopAppBar.ts'

const inputFocusTaskStore = useInputFocus()

const props = withDefaults(
  defineProps<{
    /** Подсказка в поле: зависит от выбранного поля поиска */
    placeholder?: string
  }>(),
  { placeholder: 'Введите название точки...' },
)

const inputString = ref('')
const isFocused = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

let timeoutId: number | null = null

const emit = defineEmits(['filter-changed', 'focus-blur'])

// Событие при каждом наборе текста в input
const onInput = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => emit('filter-changed', inputString.value), 400)
}

// Фокус на input
const handleFocus = () => {
  isFocused.value = true
  inputFocusTaskStore.changeFocus(true)
}

// Потеря фокуса input
const handleBlur = () => {
  isFocused.value = false
  inputString.value = ''
  inputFocusTaskStore.changeFocus(false)
  emit('focus-blur')
}

/** Скрыть клавиатуру и вернуть шапку наверх (кнопка «Готово») */
const finishEditing = () => inputRef.value?.blur()

const focus = () => inputRef.value?.focus()
const blur = () => inputRef.value?.blur()

/** Очистить поле поиска (после выбора точки из подсказок) */
const clear = () => {
  inputString.value = ''
}

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})

defineExpose({
  focus,
  blur,
  clear,
})
</script>

<template>
  <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
    <input
      ref="inputRef"
      v-model="inputString"
      @focusin="handleFocus"
      @blur="handleBlur"
      @input="onInput"
      class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
      :placeholder="props.placeholder"
      aria-label="Поиск точки для добавления в задания"
    />

    <!-- Появляется при фокусе: прячет клавиатуру и возвращает шапку наверх -->
    <button
      v-if="isFocused"
      type="button"
      class="shrink-0 min-h-11 px-3 py-2.5 rounded-xl bg-[#393E46] text-sm text-[#ccc] transition-colors active:opacity-70 cursor-pointer"
      aria-label="Завершить поиск"
      @mousedown.prevent
      @click="finishEditing"
    >
      Готово
    </button>
  </div>
</template>

<style scoped></style>
