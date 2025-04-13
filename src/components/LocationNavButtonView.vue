<script setup lang="ts">

import { computed, ref, shallowRef } from 'vue'
import Svg from '@/components/Svg.vue'
import { useMiniApp } from 'vue-tg'
import RouteIcon from '@/components/icons/RouteIcon.vue'
import WorldGlobeIcon from '@/components/icons/WorldGlobeIcon.vue'
import { TypeLocationNavButton } from '@/model/TypeLocationNavButton.ts'

const miniApp = useMiniApp()

const props = defineProps<{
  type: TypeLocationNavButton,
  name: string,
  location: {
    latitude: string,
    longitude: string
  }
}>()

const url = ref('')

const icon = shallowRef()

switch (props.type) {
  case TypeLocationNavButton.POINT : {
    icon.value = WorldGlobeIcon
    url.value = `https://yandex.ru/maps/?pt=${props.location.longitude},${props.location.latitude}&z=18&l=map`
    break
  }
  case TypeLocationNavButton.ROUTE : {
    icon.value = RouteIcon
    url.value = `https://yandex.ru/maps/?rtext=~${props.location.latitude},${props.location.longitude}&rtt=auto`
    break
  }
}

</script>

<template>
  <div
    @click="miniApp.openLink(url)"
    :class="type === 'route' ? 'text-[#ffffff] bg-[#3d7eff]' : 'text-[#7a7acc] bg-[#4d4d4d]'"
    class="flex flex-row items-center gap-1 px-3 relative h-[40px] rounded-xl text-center content-center">
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
