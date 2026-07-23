<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { shallowRef } from 'vue'
import AddIcon from '@/components/icons/AddIcon.vue'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'
import type { PointResponse } from '@/model/PointResponse.ts'
import { TypePoint } from '@/model/Enums.ts'
import StepUpImg from '@/assets/images/step_up.png'
import TunnelImg from '@/assets/images/tunnel.png'
import StepDownImg from '@/assets/images/step_down.png'

const props = defineProps<{
  dataPoint: PointResponse
  isAddedTaskList: boolean
}>()

const emit = defineEmits(['on-click'])

const addIcon = shallowRef(AddIcon)
const checkCircleIcon = shallowRef(CheckCircleIcon)

const onClick = () => {
  if (props.isAddedTaskList) return
  emit('on-click')
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
  }
}
</script>

<template>
  <div class="flex flex-row justify-between p-2">
    <div
      @mousedown="onClick"
      class="flex gap-2 items-center cursor-pointer transition-colors hover:bg-blue-50 last:border-0"
    >
      <Svg :class="isAddedTaskList ? 'text-[#5fb336]' : 'text-[#3B82F6]'">
        <component ref="comp" :is="isAddedTaskList ? checkCircleIcon : addIcon"></component>
      </Svg>
      <div class="text-sm">
        <div
          class="font-medium text-gray-200 text-sm"
        >{{ dataPoint.name }}
        </div>
        <div class="text-xs text-gray-400">{{ dataPoint.direction }}</div>
        <div class="text-[11px] text-gray-500">{{ dataPoint.address }}</div>
      </div>
    </div>
    <div class="w-8 h-8">
      <img :src="getIcon(dataPoint.type)" class="rounded-sm" alt="" />
    </div>
  </div>
</template>

<style scoped></style>
