<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'
import { useInputFocus } from '../../store/TopAppBar.ts'

defineProps<{
  index?: number
}>()

const cancelIcon = shallowRef(CancelIcon)

const inputString = ref('')

const isActiveCancelButton = ref(false)

let timeoutId: number | null = null

const emit = defineEmits(['filter-changed', 'focus-out'])

const onInput = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => emit('filter-changed', inputString.value), 400)
}

const clearSearchInput = () => {
  inputString.value = ''
  emit('filter-changed', inputString.value)
}

watch(inputString, (newValueQueryString) => isActiveCancelButton.value = newValueQueryString !== '')

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})

const handleFocus = () => {}

const handleBlur  = () => emit('focus-out')
</script>

<template>
  <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
    <div v-if="index">{{ index }}</div>
    <input
      @focusin="handleFocus"
      @focusout="handleBlur"
      v-model="inputString"
      @input="onInput"
      class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
      placeholder="Введите название точки..."
    />
    <Svg v-if="index" @mousedown.prevent @click="clearSearchInput">
      <component ref="comp" :is="cancelIcon"
                 :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
    </Svg>
  </div>
</template>

<style scoped>

</style>
