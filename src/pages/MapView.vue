<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { inject, ref, type Ref } from 'vue'

const router = useRouter()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)
isLoadingData.value = false

</script>

<template>
  <BackButton @click="router.back" />
  <p>Карта</p>
</template>

<style scoped>

</style>
