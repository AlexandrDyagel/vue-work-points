<script setup lang="ts">

import Svg from '@/components/Svg.vue'
import SearchIcon from '@/components/icons/SearchIcon.vue'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'
import { DEV_VERSION } from '../main.ts'
import { useInputFocus } from '../../store/TopAppBar.ts'

const inputTopAppBarStore = useInputFocus()

const emit = defineEmits(['filter-changed'])

const searchIcon = shallowRef(SearchIcon)
const cancelIcon = shallowRef(CancelIcon)

const queryString = ref('')

const isActiveCancelButton = ref(false)

let timeoutId: number | null = null

const onInput = () => {
  if (timeoutId) clearTimeout(timeoutId)
  timeoutId = setTimeout(() => emit('filter-changed', queryString.value), 400)
}

const clearSearchInput = () => {
  queryString.value = ''
  emit('filter-changed', queryString.value)
}

watch(queryString, (newValueQueryString) => isActiveCancelButton.value = newValueQueryString !== '')

onBeforeUnmount(() => {
  if (timeoutId) clearTimeout(timeoutId)
})

const handleFocus = () => inputTopAppBarStore.changeFocus(true)

const handleBlur  = () => inputTopAppBarStore.changeFocus(false)

</script>

<template>
  <div class="flex flex-col">
    <div class="fixed w-full text-center text-[11px]">
      <p>{{ DEV_VERSION }}</p>
    </div>
    <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
      <Svg>
        <component @mousedown.prevent ref="comp" :is="searchIcon" class="text-[#cccccc]"></component>
      </Svg>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="queryString"
        @input="onInput"
        class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
        placeholder="Поиск..."
      />
      <Svg @mousedown.prevent @click="clearSearchInput">
        <component ref="comp" :is="cancelIcon"
                   :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
      </Svg>
    </div>
  </div>
</template>

<style scoped>

</style>
