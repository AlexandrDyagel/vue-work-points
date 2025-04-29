<script setup lang="ts">
import Svg from '@/components/Svg.vue'
import { shallowRef } from 'vue'
import LoadingIcon from '@/components/icons/LoadingIcon.vue'

defineProps({
  isLoading: Boolean,
});

const loadingIcon = shallowRef(LoadingIcon)
</script>
<template>
  <div
    v-if="isLoading"
    class="fixed top-0 start-0 w-full h-full text-center content-center bg-[#242528] z-50"
  >
    <div class="flex flex-row justify-center">
      <Svg>
        <component ref="comp" :is="loadingIcon"></component>
      </Svg>
    </div>

  </div>
</template>
<style scoped>
</style>
