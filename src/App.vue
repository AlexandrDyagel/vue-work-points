<script setup lang="ts">

import { useMiniApp, useTheme, useViewport } from 'vue-tg'
import { onMounted, ref } from 'vue'
import BottomMenu from '@/components/BottomMenuView.vue'

const miniApp = useMiniApp()
const theme = useTheme()
const viewport = useViewport()

onMounted(() => {
  theme.headerColor = ref('#242528')
  viewport.isVerticalSwipesEnabled = ref(false)
  viewport.expand()
  miniApp.ready()
})
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
