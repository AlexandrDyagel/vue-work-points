<script setup lang="ts">

import Svg from '@/components/Svg.vue'
import FilterIcon from '@/components/icons/FilterIcon.vue'
import {
  onBeforeUnmount,
  ref,
  shallowRef,
  watch,
  watchEffect
} from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { TypeSearchFilter } from '@/model/Enums.ts'

const inputTopAppBarStore = useInputFocus()

const props = defineProps<{
  typeSearchFilter: TypeSearchFilter
}>()

const placeholderString = ref()

const emit = defineEmits(['filter-changed', 'icon-filter-click', 'clear-search-input'])

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
    case TypeSearchFilter.DIRECTION: {
      placeholderString.value = 'Поиск по направлению точки...'
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

defineExpose({
  clearSearchInput
})
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-row gap-2 items-center px-4 pt-4 pb-5">

      <div class="py-2 px-3 rounded-xl shadow-xl bg-[#393E46] active:bg-[#5d636b]">
        <Svg>
          <component @mousedown.prevent @click="emit('icon-filter-click')" ref="comp" :is="filterIcon"
                     class="text-[#cccccc]"></component>
        </Svg>
      </div>

      <input
        @focusin="handleFocus"
        @focusout="handleBlur"
        v-model="queryString"
        @input="onInput"
        class="bg-black w-full text-white shadow-xl start-4 end-4 top-4 rounded-xl border border-[#000] text-sm p-2.5 focus:outline-none"
        :placeholder="placeholderString"
      />
      <Svg @mousedown.prevent @click="clearSearchInput" class="shadow-xl">
        <component ref="comp" :is="cancelIcon"
                   :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
      </Svg>
    </div>
  </div>
</template>

<style scoped>

</style>
