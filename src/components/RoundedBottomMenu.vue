<script setup lang="ts">
import { useRoute } from 'vue-router'
import Svg from '@/components/Svg.vue'
import { bottomNavItems } from '@/model/BottomMenu.ts'
import { computed, onMounted, ref, watch } from 'vue'
import { Routes as Route } from '@/model/Enums.ts'
import { useCache } from '@/composables/useCache.ts'
import { usePointsStore } from '@/store/Points.ts'
const { obtainCachedPoints } = useCache()

const route = useRoute()
const countPoints = ref(0)
const pointsStore = usePointsStore()

onMounted(async() => {
  if (pointsStore.points.length !== 0) {
    countPoints.value = pointsStore.points.length
  } else {
    await obtainCachedPoints().then((cachedDataPoints) => {
      pointsStore.savePoints(cachedDataPoints)
      countPoints.value = pointsStore.points.length
    })
  }
})

watch(route, () => {
  bottomNavItems.value.forEach((item) => {
    item.isActive = item.route === route.path || route.path.includes(item.route)
  })
})

// Цвет bg меню на странице с картой задач
const styleBgBottomMenu = computed(() => {
  if (route.path === Route.TaskMap) return 'bg-[#1e1e21]/70' // bg full menu bar
  else return 'bg-[#1e1e21]'
})

const styleItemsBottomMenu = (isActive: boolean): string => {
  if (isActive) {
    if (route.path !== Route.TaskMap) return 'text-[#5fb336] scale-110 bg-[#5fb336]/30'
    else return 'text-[#5fb336] scale-110 bg-[#242528]/30'
  } else {
    if (route.path !== Route.TaskMap) return 'bg-[#1e1e21]' // bg items
    else return 'bg-[#1e1e21]/0'
  }
}
</script>

<template>
  <div class="fixed start-0 bottom-0 end-0 w-auto h-16 z-19 bg-gradient-to-b from-transparent to-black/90">
    <div class="fixed start-10 bottom-4 end-10 w-auto z-20 rounded-3xl shadow-3xl border-1 border-[#17181a]" :class="styleBgBottomMenu">
      <div
        class="text-xs font-bold text-medium shadow flex text-gray-400"
      >
        <RouterLink
          :key="navItem.route"
          v-for="navItem in bottomNavItems"
          class="w-full transition-all mx-1.5 my-1 rounded-[18px] cursor-pointer"
          :class="styleItemsBottomMenu(navItem.isActive)"
          :to="navItem.route"
        >
          <div class="w-full py-0.5 focus-within:z-10 flex flex-col items-center justify-center">
            <Svg>
              <component ref="comp" :is="navItem.icon"></component>
            </Svg>
            <p>{{ navItem.name }}</p>

            <!-- Badge -->
            <div v-if="navItem.isActive && navItem.route === Route.Points" class="fixed px-1 -top-1 -right-0.5 h-6 bg-[#5fb336]/30 border-4 border-[#242528] rounded-2xl flex items-center justify-center">
              <span class="text-[#5fb336] text-[9px] font-bold">{{ countPoints }}</span>
            </div>

            <!--
            <span v-if="navItem.route === Route.Points" class="fixed z-50 start-13 top-2 bg-black px-1 rounded-sm text-[8px]">{{ countPoints }}</span>
  -->
          </div>
        </RouterLink>
      </div>
    </div>
  </div>

</template>
