<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useInputFocus } from '@/store/TopAppBar.ts'

const props = defineProps<{
  index?: number,
  point?: PointResponse
}>()

const inputFocusTaskStore = useInputFocus()

const cancelIcon = shallowRef(CancelIcon)

const inputString = ref('')

const isActiveCancelButton = ref(true)

const isDisabledInput = ref(props.index !== undefined)

let timeoutId: number | null = null

const emit = defineEmits(['filter-changed', 'delete', 'focus-blur'])

// Событие при каждом наборе текста в input
const onInput = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => emit('filter-changed', inputString.value), 400)
}

// Событие удаления элемента
const deleteItem = () => {
  emit('delete', props.index ? props.index - 1 : -1)
}

// Фокус на input
const handleFocus = () => inputFocusTaskStore.changeFocus(true)

// Потеря фокуса input
const handleBlur = () => {
  inputString.value = ''
  inputFocusTaskStore.changeFocus(false)
  emit('focus-blur')
}

watch(inputString, (newValueQueryString) => isActiveCancelButton.value = newValueQueryString !== '')

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})
</script>

<template>
  <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
    <div v-if="index">{{ index }}</div>
    <input
      :disabled="isDisabledInput"
      v-model="inputString"
      @focusin="handleFocus"
      @blur="handleBlur"
      @input="onInput"
      class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
      :placeholder="point ? point.name : 'Введите название точки...'"
    />
    <Svg v-if="index" @mousedown.prevent @click="deleteItem">
      <component ref="comp" :is="cancelIcon"
                 :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
    </Svg>
  </div>
</template>

<style scoped>

</style>
