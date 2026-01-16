<script setup lang="ts">

import { useCache } from '@/composables/useCache.ts'

const { clearCachePoints } = useCache()

</script>

<template>
  <div class="fixed start-0 end-0 bottom-0 top-0 bg-[#242528]">
    <h1 class="mt-2 text-center">Настройки</h1>
    <div
      @click="clearCachePoints"
      class="fixed start-0 end-0 bottom-0 mb-[100px] bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer active:opacity-50"
    >
      <span class="text-sm font-medium">Очистить кэш точек</span>
    </div>
  </div>
</template>

<style scoped>

</style>
