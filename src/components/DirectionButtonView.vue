<script setup lang="ts">

import { computed } from 'vue'

const props = defineProps<{
  name: string,
  isActive: boolean
}>()

const isActive = computed(() => props.isActive ? 'text-[#ffffff] bg-[#5fb336]' : 'text-[#7a7acc] bg-[#4d4d4d]')

</script>

<template>
  <div
    :class="isActive"
    class="text-[14px] font-medium px-2 py-0.5 relative rounded-lg text-center content-center cursor-pointer"
  > {{ name }}
  </div>
</template>

<style scoped>

</style>
