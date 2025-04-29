<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'

const router = useRouter()
</script>

<template>
  <BackButton @click="router.back" />

<p>Настройки</p>
</template>

<style scoped>

</style>
