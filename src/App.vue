<script setup lang="ts">

import { useMiniApp, useViewport } from 'vue-tg'
import { onMounted, ref } from 'vue'
import BottomMenu from '@/components/BottomMenuView.vue'

const miniApp = useMiniApp()

onMounted(() => {
  miniApp.ready()
})

const viewport = useViewport()
viewport.isVerticalSwipesEnabled = ref(false)
viewport.expand()

</script>

<template>
<header>

</header>

<main class="mb-20">
<router-view></router-view>
</main>

<nav>
    <BottomMenu />
</nav>

</template>
