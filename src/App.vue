<script setup lang="ts">

import { onMounted, provide, ref } from 'vue'
import BottomMenu from '@/components/BottomMenuView.vue'
import { useMiniApp, useTheme, useViewport } from 'vue-tg/8.0'
import { useInputFocus } from '../store/TopAppBar.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import { useUserRole } from '@/composables/useUserRole.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'

const { clearUserRole } = useUserRole()
const { removeUserSearchFilter } = useSearchFilter()

const loading = ref<boolean>(true)
provide('isLoadingData', loading)

const miniApp = useMiniApp()
const theme = useTheme()
const viewport = useViewport()

const inputTopAppBarStore = useInputFocus()

onMounted(() => {
  clearUserRole()
  removeUserSearchFilter()
  theme.headerColor.value = '#242528'
  viewport.expand()
  viewport.isVerticalSwipesEnabled.value = false
  miniApp.ready()
})
</script>

<template>
  <LoadingScreen :is-loading="loading" />
  <header>

  </header>

  <main class="mb-20">
    <router-view></router-view>
  </main>

  <nav>
    <BottomMenu v-if="!inputTopAppBarStore.isFocused" />
  </nav>

</template>
