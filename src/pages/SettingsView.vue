<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, ref, type Ref } from 'vue'
import { DEV_VERSION } from '@/main.ts'

const router = useRouter()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false
</script>

<template>
  <BackButton @click="router.back" />

<p>Настройки</p>
  <div class="fixed w-full text-center text-lg">
    <p>Версия: {{ DEV_VERSION }}</p>
  </div>
</template>

<style scoped>

</style>
