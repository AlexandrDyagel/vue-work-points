<script setup lang="ts">
import { PointResponse } from '@/model/PointResponse.ts'
import { computed, ref, shallowRef } from 'vue'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'

const props = defineProps<{
  index: number
  taskItems: PointResponse[]
  isCompleted?: boolean
}>()

const point = ref(props.taskItems[props.index])

const checkCircleIcon = shallowRef(CheckCircleIcon)

const emit = defineEmits<{
  delete: [index: number]
  toggleCompleted: [completed: boolean]
}>()

// Событие удаления элемента
const deleteItem = () => {
  emit('delete', props.index)
}

// Событие переключения статуса «выполнено»
const toggleCompleted = () => {
  emit('toggleCompleted', !props.isCompleted)
}

const isCompleted = computed(() => props.isCompleted ?? false)

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
  <div class="relative">
    <div class="flex flex-row justify-between items-center relative py-5 px-6">
      <!-- Дорожка -->
      <div :class="path(index)"></div>

      <!-- Точка на дорожке -->
      <div
        class="absolute left-8 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-white z-10"
        :class="{ 'animate-pulse-custom': index === 0 }"
        style="box-shadow: 0 0 0 2px #3b82f6"
      ></div>

      <!-- Информация о точке point -->
      <div class="ml-10">
        <div class="font-bold text-[#F0F0F0]">{{ point.name }}</div>
        <div class="text-sm text-[#ff5b4d]">{{ point.direction }}</div>
        <div class="text-xs text-[#999]">{{ point.address }}</div>
      </div>

      <div class="relative z-[70] flex flex-row items-center gap-3">
        <div
          class="cursor-pointer"
          :class="isCompleted ? 'text-[#5fb336]' : 'text-[#61646b]'"
          @mousedown.prevent
          @click="toggleCompleted"
        >
          <component :is="checkCircleIcon"></component>
        </div>

        <svg @mousedown.prevent @click="deleteItem" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400 active:text-red-500 cursor-pointer" viewBox="0 -960 960 960" fill="currentColor">
          <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
        </svg>
      </div>
    </div>

    <!-- Затемнение поверх выполненной задачи -->
    <div
      v-if="isCompleted"
      class="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black/50"
    >
      <span class="text-2xl font-bold text-[#5fb336]">Выполнено</span>
    </div>
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
