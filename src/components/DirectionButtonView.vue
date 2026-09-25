<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  isActive: boolean
}>()

const isActive = computed(() =>
  props.isActive ? 'text-[#ffffff] bg-[#5fb336]' : 'text-[#7a7acc] bg-[#4d4d4d]',
)
</script>

<template>
  <!-- Кнопка переключения направления: настоящий button + тап-таргет 44px по высоте -->
  <button
    type="button"
    :class="isActive"
    class="relative min-h-9 px-3 py-1.5 text-[14px] font-medium rounded-lg text-center content-center cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
  >
    {{ name }}
  </button>
</template>

<style scoped></style>
