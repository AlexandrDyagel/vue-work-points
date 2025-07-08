<script setup lang="ts">

import { PointResponse } from '@/model/PointResponse.ts'
import { ref, shallowRef } from 'vue'
import CancelIcon from '@/components/icons/CancelIcon.vue'

const props = defineProps<{
  index: number,
  taskItems: PointResponse[]
}>()

const point = ref(props.taskItems[props.index])

const cancelIcon = shallowRef(CancelIcon)

const isActiveCancelButton = ref(true)

const emit = defineEmits(['delete'])

// Событие удаления элемента
const deleteItem = () => {
  emit('delete', props.index)
}

const path = (index: number): string => {
  if (index === 0 && props.taskItems.length !== 1) {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500 translate-y-1/2'
  } else if (index === 0 && props.taskItems.length === 1) {
    return 'absolute left-10 top-0 bottom-0 w-1'
  } else if (index === props.taskItems.length - 1) {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500 -translate-y-1/2'
  } else {
    return 'absolute left-10 top-0 bottom-0 w-1 bg-blue-500'
  }
}
</script>

<template>
  <div class="flex flex-row justify-between items-center relative py-5 px-6">
    <!-- Дорожка -->
    <div :class="path(index)"></div>

    <!-- Точка на дорожке -->
    <div
      class="absolute left-8 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-white z-10"
      :class="{ 'animate-pulse-custom': index === 0 }"
      style="box-shadow: 0 0 0 2px #3b82f6;"
    ></div>

    <!-- Информация о точке point -->
    <div class="ml-10">
      <div class="font-bold text-[#F0F0F0]">{{ point.name }}</div>
      <div class="text-sm text-[#999]">{{ point.direction }}</div>
    </div>

    <Svg @mousedown.prevent @click="deleteItem">
      <component ref="comp" :is="cancelIcon"
                 :class="isActiveCancelButton ? 'text-white' : 'text-[#61646b]'"></component>
    </Svg>
  </div>
</template>

<style scoped>
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.animate-pulse-custom {
  animation: pulse 2s infinite;
}
</style>
