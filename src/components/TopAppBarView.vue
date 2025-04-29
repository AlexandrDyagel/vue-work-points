<script setup lang="ts">

import Svg from '@/components/Svg.vue'
import SearchIcon from '@/components/icons/SearchIcon.vue'
import { onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'

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

</script>

<template>
  <div class="flex flex-row gap-2 items-center border-b-[1px] border-[#3d3e43] px-4 pt-4 pb-5">
    <Svg>
      <component ref="comp" :is="searchIcon" class="text-[#cccccc]"></component>
    </Svg>
    <input
      v-model="queryString"
      @input="onInput"
      class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
      placeholder="Поиск..."
    />
    <Svg @click="clearSearchInput">
      <component ref="comp" :is="cancelIcon"
                 :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
    </Svg>
  </div>
</template>

<style scoped>

</style>
