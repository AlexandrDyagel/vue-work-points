<script setup lang="ts">

import { useRoute } from 'vue-router'
import Svg from '@/components/Svg.vue'
import { bottomNavItems } from '@/model/BottomMenu.ts'
import { watch } from 'vue'

const route = useRoute()



watch(route,() => {
  bottomNavItems.value.forEach((item) => {
    item.isActive = item.route === route.path || route.path.includes(item.route)
  })
})

</script>

<template>

  <div class="fixed start-0 bottom-0 w-full z-50 bg-[#17212B]">
    <ul
      class="text-xs font-medium text-center shadow flex divide-gray-700 text-gray-400 border-t border-gray-700">
      <RouterLink :key="navItem.route" v-for="navItem in bottomNavItems"
                  class="w-full transition mx-2 duration-500 my-2 rounded-lg active:text-white active:bg-gray-700"
                  :class="navItem.isActive ? `text-white bg-gray-700` : `bg-[#17212B]`"
                  :to="navItem.route">
        <li class="w-full py-2 focus-within:z-10 flex flex-col items-center justify-center">
          <Svg>
            <component ref="comp" :is="navItem.icon"></component>
          </Svg>
          <p>{{ navItem.name }}</p>
        </li>
      </RouterLink>
    </ul>
  </div>
</template>
