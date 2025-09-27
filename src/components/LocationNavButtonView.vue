<script setup lang="ts">

import { shallowRef } from 'vue'
import Svg from '@/components/Svg.vue'
import RouteIcon from '@/components/icons/RouteIcon.vue'
import WorldGlobeIcon from '@/components/icons/WorldGlobeIcon.vue'
import { TypeLocationNavButton } from '@/model/Enums.ts'

const props = defineProps<{
  type: TypeLocationNavButton,
  name?: string,
}>()

const icon = shallowRef()

switch (props.type) {
  case TypeLocationNavButton.POINT : {
    icon.value = WorldGlobeIcon
    break
  }
  case TypeLocationNavButton.ROUTE : {
    icon.value = RouteIcon
    break
  }
  case TypeLocationNavButton.ANY : {
    icon.value = RouteIcon
    break
  }
}

</script>

<template>
  <div
    :class="type === 'route' ? 'text-[#ffffff] bg-[#3d7eff]' : 'text-[#7a7acc] bg-[#4d4d4d]'"
    class="flex flex-row items-center gap-1 px-3 relative h-[40px] rounded-xl text-center content-center cursor-pointer">
    <span v-if="icon">
      <Svg>
        <component ref="comp" :is="icon"></component>
      </Svg>
    </span>

    <span v-if="name" class="text-[14px] font-medium">{{ name }}</span>
  </div>
</template>

<style scoped>

</style>
