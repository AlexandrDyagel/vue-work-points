<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { shallowRef } from 'vue'
import AddIcon from '@/components/icons/AddIcon.vue'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'
import type { PointResponse } from '@/model/PointResponse.ts'
import { TypePoint } from '@/model/Enums.ts'
import StepUpImg from '@/assets/images/step_up.png'
import TunnelImg from '@/assets/images/tunnel.png'
import WorkHomeImg from '@/assets/images/work_home.png'
import StepDownImg from '@/assets/images/step_down.png'

const props = defineProps<{
  dataPoint: PointResponse
  isAddedTaskList: boolean
}>()

const emit = defineEmits<{
  /** Клик по точке: родитель сам решает — добавить её или перейти к карточке */
  'on-click': [uid: string]
}>()

const addIcon = shallowRef(AddIcon)
const checkCircleIcon = shallowRef(CheckCircleIcon)

const onClick = () => {
  emit('on-click', props.dataPoint.uid)
}

const getIcon = (typePoint: TypePoint) => {
  switch (typePoint) {
    case TypePoint.PP: {
      return StepUpImg
    }
    case TypePoint.TA: {
      return TunnelImg
    }
    case TypePoint.TP: {
      return StepDownImg
    }
    case TypePoint.Home: {
      return WorkHomeImg
    }
  }
}
</script>

<template>
  <!--
    Строка подсказки — настоящая кнопка: работает с клавиатуры (Enter/Space),
    доступна скринридеру и имеет тап-таргет не меньше 44px.
    mousedown.prevent сохраняет фокус в поле поиска, а click выбирает точку.
  -->
  <button
    type="button"
    class="w-full min-h-14 flex flex-row justify-between p-2 text-left transition-colors hover:bg-white/5 active:bg-white/10 focus-visible:bg-white/10 focus-visible:outline-none cursor-pointer"
    :aria-label="`${dataPoint.name}, ${dataPoint.direction}, ${dataPoint.address}`"
    @mousedown.prevent
    @click="onClick"
  >
    <span class="flex gap-2 items-center">
      <Svg :class="isAddedTaskList ? 'text-[#5fb336]' : 'text-[#3B82F6]'">
        <component ref="comp" :is="isAddedTaskList ? checkCircleIcon : addIcon"></component>
      </Svg>
      <span class="text-sm">
        <span class="block font-medium text-gray-200 text-sm">
          {{ dataPoint.name }}
          <span v-if="isAddedTaskList" class="ms-1 text-[10px] font-normal text-[#5fb336]">в списке</span>
        </span>
        <span class="block text-xs text-gray-400">{{ dataPoint.direction }}</span>
        <span class="block text-[11px] text-gray-500">{{ dataPoint.address }}</span>
      </span>
    </span>
    <span class="w-8 h-8 shrink-0">
      <img :src="getIcon(dataPoint.type)" class="rounded-sm" alt="" />
    </span>
  </button>
</template>

<style scoped></style>
