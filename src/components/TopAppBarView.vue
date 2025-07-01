<script setup lang="ts">

import Svg from '@/components/Svg.vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import { onBeforeUnmount, ref, shallowRef, watch, watchEffect } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'
import { DEV_VERSION } from '../main.ts'
import { useInputFocus } from '../../store/TopAppBar.ts'
import { TypeSearchFilter } from '@/model/Enums.ts'

const inputTopAppBarStore = useInputFocus()

const props = defineProps<{
  typeSearchFilter: TypeSearchFilter
}>()

const placeholderString = ref()

const emit = defineEmits(['filter-changed', 'icon-filter-click'])

const filterIcon = shallowRef(FilterIcon)
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

watchEffect(() => {
  switch (props.typeSearchFilter) {
    case TypeSearchFilter.NAME: {
      placeholderString.value = 'Поиск по названию точки...'
      break
    }
    case TypeSearchFilter.ADDRESS: {
      placeholderString.value = 'Поиск по адресу точки...'
      break
    }
  }
})

const handleFocus = () => inputTopAppBarStore.changeFocus(true)

const handleBlur = () => inputTopAppBarStore.changeFocus(false)

</script>

<template>
  <div class="flex flex-col">
    <div class="fixed w-full text-center text-[11px]">
      <p>{{ DEV_VERSION }}</p>
    </div>
    <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">
      <Svg>
        <component @mousedown.prevent @click="emit('icon-filter-click')" ref="comp" :is="filterIcon"
                   class="text-[#cccccc]"></component>
      </Svg>
      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="queryString"
        @input="onInput"
        class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
        :placeholder="placeholderString"
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
