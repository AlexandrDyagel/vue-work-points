<script setup lang="ts">
import { onMounted, provide, ref } from 'vue'
import { useMiniApp, useTheme, useViewport } from 'vue-tg/8.0'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { useUserRole } from '@/composables/useUserRole.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { useRouter } from 'vue-router'
import { SettingsButton } from 'vue-tg'
import { Routes } from '@/model/Enums.ts'
import RoundedBottomMenu from '@/components/RoundedBottomMenu.vue'
import { useCache } from '@/composables/useCache.ts'
import { useLastUpdateTimeStore } from '@/store/LastUpdateTime.ts'

const router = useRouter()

const { clearUserRole } = useUserRole()
const { removeUserSearchFilter } = useSearchFilter()
const { checkForUpdate } = useCache()
const lastUpdateTimeStore = useLastUpdateTimeStore()

const loading = ref<boolean>(true)
provide('isLoadingData', loading)

const miniApp = useMiniApp()
const theme = useTheme()
const viewport = useViewport()

const inputTopAppBarStore = useInputFocus()

onMounted(async () => {
  clearUserRole()
  removeUserSearchFilter()
  theme.headerColor.value = '#242528'
  viewport.expand()
  viewport.isVerticalSwipesEnabled.value = false
  miniApp.ready()

  await checkForUpdate()
    .then((isLastUpdate) => (lastUpdateTimeStore.setLastUpdateTime(isLastUpdate)))
    .catch((error) => console.error('Ошибка checkForUpdate() в App.vue: ', error))

  if (lastUpdateTimeStore.isLastUpdateTime) {
    console.log('Есть новые обновления')
  } else {
    console.log('Нет новых обновлений')
  }
})
</script>

<template>
  <header></header>

  <main class="mb-20">
    <router-view></router-view>
  </main>

  <nav>
    <RoundedBottomMenu v-if="!inputTopAppBarStore.isFocused" />
  </nav>

  <SettingsButton @click="router.push(Routes.TgSettingApp)" />
</template>
