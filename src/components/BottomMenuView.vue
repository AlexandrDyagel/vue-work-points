<script setup lang="ts">

import { useRoute } from 'vue-router'
import Svg from '@/components/Svg.vue'
import { bottomNavItems } from '@/model/BottomMenu.ts'
import { provide, ref, watch } from 'vue'
import { Routes as Route } from '@/model/Enums.ts'

const route = useRoute()

const countPoints = ref<number>(0)
provide('countPoints', countPoints)

watch(route,() => {
  bottomNavItems.value.forEach((item) => {
    item.isActive = item.route === route.path || route.path.includes(item.route)
  })
})

</script>

<template>

  <div class="fixed start-0 bottom-0 w-full z-20 bg-[#242528]">
    <div
      class="text-xs font-medium text-center shadow flex divide-gray-700 text-gray-400 border-t border-gray-700">
      <RouterLink :key="navItem.route" v-for="navItem in bottomNavItems"
                  class="w-full transition mx-2 duration-500 my-2 rounded-lg cursor-pointer"
                  :class="navItem.isActive ? `text-[#5fb336] scale-110 bg-[#242528]` : `bg-[#242528]`"
                  :to="navItem.route">
        <div class="w-full py-2 focus-within:z-10 flex flex-col items-center justify-center">
          <Svg>
            <component ref="comp" :is="navItem.icon"></component>
          </Svg>
          <p>{{ navItem.name }}</p>

<!--
          <span v-if="navItem.route === Route.Points" class="fixed z-50 start-13 top-2 bg-black px-1 rounded-sm text-[8px]">{{ countPoints }}</span>
-->

        </div>
      </RouterLink>
    </div>
  </div>
</template>
