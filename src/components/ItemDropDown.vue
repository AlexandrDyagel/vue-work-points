<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { shallowRef } from 'vue'
import AddIcon from '@/components/icons/AddIcon.vue'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'

const props = defineProps<{
  namePoint: string
  isAddedTaskList: boolean
}>()

const emit = defineEmits(['on-click'])

const addIcon = shallowRef(AddIcon)
const checkCircleIcon = shallowRef(CheckCircleIcon)

const onClick = () => {
  if (props.isAddedTaskList) return
  emit('on-click')
}
</script>

<template>
  <div @mousedown="onClick" class="flex gap-2 items-center px-3 pt-3 pb-3">
    <Svg :class="isAddedTaskList ? 'text-[#5fb336]' : 'text-[#3B82F6]'">
      <component ref="comp" :is="isAddedTaskList ? checkCircleIcon : addIcon"></component>
    </Svg>
    <div class="text-sm">
      {{ namePoint }}
    </div>
  </div>
</template>

<style scoped></style>
