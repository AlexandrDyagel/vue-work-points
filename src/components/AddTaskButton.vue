<script setup lang="ts">
import Svg from '@/components/Svg.vue'

defineProps({
  icon: Object,
})
</script>

<template>
  <div
    class="flex flex-row items-center gap-1 px-3 text-[#7a7acc] bg-[#4d4d4d] relative h-[40px] rounded-xl text-center content-center cursor-pointer"
  >
    <span v-if="icon">
      <Svg>
        <component ref="comp" :is="icon"></component>
      </Svg>
    </span>
    <slot />
  </div>
</template>

<style scoped></style>
