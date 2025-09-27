<script setup lang="ts">

import { PointResponse } from '@/model/PointResponse.ts'
import LocationNavButton from '@/components/LocationNavButtonView.vue'
import { ref } from 'vue'
import { useEditPoint } from '@/store/Point.ts'
import {
  Routes as Route,
  TypeDirectionButton,
  TypeLocationNavButton,
  TypePoint,
  UserRole
} from '@/model/Enums.ts'
import { useRouter } from 'vue-router'
import DirectionButtonView from '@/components/DirectionButtonView.vue'
import { useMiniApp } from 'vue-tg/8.0'
import TunnelImg from '@/assets/images/tunnel.png'
import StepUpImg from '@/assets/images/step_up.png'
import StepDownImg from '@/assets/images/step_down.png'
import { useUserRole } from '@/composables/useUserRole.ts'
import { Location } from '@/model/Location.ts'

const props = defineProps<{
  dataPoint: PointResponse;
}>()

const { openLink } = useMiniApp()

const router = useRouter()

const { getUserRole } = useUserRole()
const userRole = ref(getUserRole())

const isActiveToRegionButton = ref(props.dataPoint.location.toRegion.latitude.length !== 0)
const isActiveFromRegionButton = ref(props.dataPoint.location.fromRegion.latitude.length !== 0 && props.dataPoint.location.toRegion.latitude.length === 0)

const clickDirectButton = (direct: TypeDirectionButton) => {
  switch (direct) {
    case TypeDirectionButton.TO_REGION: {
      isActiveToRegionButton.value = true
      isActiveFromRegionButton.value = false
      break
    }
    case TypeDirectionButton.FROM_REGION: {
      isActiveFromRegionButton.value = true
      isActiveToRegionButton.value = false
      break
    }
  }
}

function openLocation(type: TypeLocationNavButton) {
  switch (type) {
    case TypeLocationNavButton.ROUTE: {
      if (isActiveToRegionButton.value) {
        openLink(stringUrl(
          props.dataPoint.location.toRegion.longitude,
          props.dataPoint.location.toRegion.latitude,
          TypeLocationNavButton.ROUTE))
      } else if (isActiveFromRegionButton.value) {
        openLink(stringUrl(
          props.dataPoint.location.fromRegion.longitude,
          props.dataPoint.location.fromRegion.latitude,
          TypeLocationNavButton.ROUTE))
      }
      break
    }
    case TypeLocationNavButton.POINT: {
      if (isActiveToRegionButton.value) {
        openLink(stringUrl(
          props.dataPoint.location.toRegion.longitude,
          props.dataPoint.location.toRegion.latitude,
          TypeLocationNavButton.POINT))
      } else if (isActiveFromRegionButton.value) {
        openLink(stringUrl(
          props.dataPoint.location.fromRegion.longitude,
          props.dataPoint.location.fromRegion.latitude,
          TypeLocationNavButton.POINT))
      }
      break
    }
  }
}

function stringUrl(lon: string, lat: string, type: TypeLocationNavButton): string {
  switch (type) {
    case TypeLocationNavButton.POINT: {
      return `https://yandex.ru/maps/?pt=${lon},${lat}&z=18&l=map`
    }
    case TypeLocationNavButton.ROUTE: {
      return `https://yandex.ru/maps/?rtext=~${lat},${lon}&rtt=auto`
    }
    case TypeLocationNavButton.ANY: return ''
  }
}

const editPointStore = useEditPoint()

function editPoint(point: PointResponse | null) {
  if (userRole.value !== UserRole.ADMIN) return

  editPointStore.savePoint(point)
  router.push(Route.EditPoint)
}

const getColor = (typePoint: TypePoint) => {
  switch (typePoint) {
    case TypePoint.PP: {
      return 'bg-blue-500'
    }
    case TypePoint.TA: {
      return 'bg-[#a3a5a6]'
    }
    case TypePoint.TP: {
      return 'bg-[#ff5b4d]'
    }
  }
}

const getIcon = (typePoint: TypePoint) => {
  switch (typePoint) {
    case TypePoint.PP: {
      return StepUpImg
    }
    case TypePoint.TA: {
      return TunnelImg
    }
    case TypePoint.TP: {
      return StepDownImg
    }
  }
}

// const showSelect = () => miniApp.switchInlineQuery('')

</script>

<template>
  <div
    :key="dataPoint.uid"
    class="flex flex-row justify-between px-4 pt-4 pb-5"
  >
    <div>
      <div
        @click="editPoint(dataPoint)"
        class="pb-1 text-base font-medium text-[#F0F0F0] max-w-xs"
      >
        <slot name="name"></slot>
      </div>
      <div
        class="text-sm text-[#ff5b4d] font-medium max-w-xs"
      >
        <slot name="direction"></slot>
      </div>
      <div class="text-sm text-[#999] pb-5 max-w-xs">
        <slot name="address"></slot>
      </div>

      <div class="flex flex-row gap-2 items-center pb-5">
        <DirectionButtonView
          v-if="dataPoint.location.toRegion.latitude"
          @click="clickDirectButton(TypeDirectionButton.TO_REGION)"
          :name="dataPoint.type === TypePoint.TA ? 'Внешняя' : 'В область'"
          :is-active="isActiveToRegionButton"
        />
        <DirectionButtonView
          v-if="dataPoint.location.fromRegion.latitude"
          @click="clickDirectButton(TypeDirectionButton.FROM_REGION)"
          :name="dataPoint.type === TypePoint.TA ? 'Внутренняя' : 'Из области'"
          :is-active="isActiveFromRegionButton"
        />
      </div>

      <div
        v-if="dataPoint.location.toRegion.latitude || dataPoint.location.fromRegion.latitude"
        class="flex flex-row gap-2 items-center"
      >
        <LocationNavButton
          name="Маршрут" @click="openLocation(TypeLocationNavButton.ROUTE)"
          :type="TypeLocationNavButton.ROUTE"
        />
        <LocationNavButton
          name="На карте" @click="openLocation(TypeLocationNavButton.POINT)"
          :type="TypeLocationNavButton.POINT"
        />

        <!--        <div
                  @click="showSelect"
                  class="flex flex-row cursor-pointer text-[#7a7acc] bg-[#4d4d4d] items-center gap-1 px-3 relative h-[40px] rounded-xl text-center content-center">

                  <span class="text-[14px] font-medium">GO</span>
                </div>-->

      </div>
    </div>
    <!--    <div :class="getColor(dataPoint.type)" class="w-10 h-10">-->
    <div class="w-16 h-16">
      <img :src="getIcon(dataPoint.type)" class="rounded-sm" alt="" />
    </div>
  </div>
</template>

<style scoped>

/*--color-background-primary: #242528;
color #3d7eff BLUE
--color-background-additional: #111;
--color-background-separator: #3d3e43;
ЗЕЛЕНЫЙ ЦВЕТ КНОПКИ color-transit-bus: #5fb336;
ЖЕЛТЫЙ ЦВЕТ ЗВЕЗД color-yellow-active: #ffdc60;
ФИОЛЕТОВЫЙ color-purple: #7a7acc;
КРАСНЫЙ color-red: #ff5b4d;
КРАСИВЫЙ САЛАТОВЫЙ ЦВЕТ: #88ce02
*/

</style>
