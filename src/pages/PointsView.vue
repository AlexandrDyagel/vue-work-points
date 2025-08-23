<script setup lang="ts">

import { computed, inject, onMounted, type Ref, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route, TypeSearchFilter, UserRole } from '@/model/Enums.ts'
import TopAppBarView from '@/components/TopAppBarView.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import BottomSheetView from '@/components/BottomSheetView.vue'
import { useCache } from '@/composables/useCache.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import ItemPointView from '@/components/ItemPointView.vue'
import { useUserRole } from '@/composables/useUserRole.ts'

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

const queryInput = ref('')
const filteredPoints = ref([] as PointResponse[])
const cachedPoints = ref<PointResponse[]>([])
const bottomSheetRef = ref()
const topAppBarRef = ref()
const isLastUpdateTime = ref(false)

const router = useRouter()
const { obtainCachedPoints, checkForUpdate, clearCachePoints } = useCache()
const { userSearchFilter, updateUserSearchFilter } = useSearchFilter()
const typeSearchFilter = ref(userSearchFilter())
const inputTopAppBarStore = useInputFocus()
const { getUserRole } = useUserRole()
const userRole = ref(getUserRole())

onMounted(async () => {
  try {
    await checkForUpdate()
      .then(isLastUpdate => isLastUpdateTime.value = isLastUpdate)
      .catch(error => console.log('Ошибка checkForUpdate() в App.vue: ', error))

    isLoadingData.value = true
    console.log('isLastUpdateTime.value ', isLastUpdateTime.value)
    await obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })
    isLoadingData.value = false

  } catch (e) {
    isLoadingData.value = false
    console.log(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  }
})

watch(isLastUpdateTime, () => {

}, { once: true })

const search = () => {
  switch (typeSearchFilter.value) {
    case TypeSearchFilter.NAME : {
      filteredPoints.value = cachedPoints.value.filter(point =>
        point.name.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break
    }
    case TypeSearchFilter.DIRECTION : {
      filteredPoints.value = cachedPoints.value.filter(point =>
        point.direction.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break
    }
    case TypeSearchFilter.ADDRESS : {
      filteredPoints.value = cachedPoints.value.filter(point =>
        point.address.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break
    }
  }
}

const highlightMatches = (text: string) => {
  if (!queryInput.value) return text

  const query = queryInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${query})`, 'gi')

  return text.replace(regex, '<span class="bg-[#ffdc60] text-black font-bold">$1</span>')
}

watchEffect(() => {
  if (queryInput.value === '' && filteredPoints.value.length === 0) {
    filteredPoints.value = cachedPoints.value
    console.log('Заполнение filteredPoints из cachedPoints')
  }
})

watch(queryInput, () => search())

const handleFilterChange = (queryString: string) => {
  queryInput.value = queryString
}

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const closeBottomSheet = () => {
  bottomSheetRef.value.closeSheet()
}

watch(typeSearchFilter, (newTypeSearchFilter) => {
  if (newTypeSearchFilter) {
    topAppBarRef.value.clearSearchInput()
    closeBottomSheet()
  }
  updateUserSearchFilter(newTypeSearchFilter)
})

const addNewPoint = () => {
  if (userRole.value !== UserRole.ADMIN) return

  router.push(Route.AddPoint)
}

const emptyElements = computed(() => {
  if (filteredPoints.value.length === 0 && cachedPoints.value.length === 0) {
    return 'Нет данных'
  } else if (filteredPoints.value.length === 0 && cachedPoints.value.length !== 0) {
    return 'Нет результата поиска'
  } else return ''
})

const updateDataPoints = () => {
  try {
    clearCachePoints()
    isLoadingData.value = true

    obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })
    isLoadingData.value = false
  } catch (e) {
    isLoadingData.value = false
    console.log(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  }
}

</script>

<template>
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
    <span v-if="filteredPoints.length === 0"
          class="fixed w-full h-full flex justify-center items-center text-2xl text-[#F0F0F0]">{{ emptyElements
      }}
    </span>

    <div
      v-if="filteredPoints.length === 0 && userRole === UserRole.ADMIN"
      @click="addNewPoint"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
      <p>Добавить точку +</p>
    </div>

    <TopAppBarView
      ref="topAppBarRef"
      :class="inputTopAppBarStore.isFocused ? 'bottom-0 border-t-[1px]' : 'sticky top-0 border-b-[1px]'"
      class="fixed bg-[#242528] start-0 end-0 border-[#3d3e43] z-20"
      :type-search-filter="typeSearchFilter"
      @filter-changed="handleFilterChange"
      @icon-filter-click="openBottomSheet"
    />

    <div class="t-4">
      <div v-auto-animate>
        <ItemPointView
          v-for="[index, point] of filteredPoints.entries()" :key="point.uid"
          :class="index === filteredPoints.length - 1 ? `mb-[70px]` : `border-b-[1px] border-[#3d3e43]`"
          :dataPoint="point">

          <template v-slot:name>
            <span
              v-html="typeSearchFilter === TypeSearchFilter.NAME ? highlightMatches(point.name) : point.name"></span>
          </template>

          <template v-slot:direction>
            <span
              v-html="typeSearchFilter === TypeSearchFilter.DIRECTION ? highlightMatches(point.direction) : point.direction"></span>
          </template>

          <template v-slot:address>
            <span
              v-html="typeSearchFilter === TypeSearchFilter.ADDRESS ? highlightMatches(point.address) : point.address"></span>
          </template>

        </ItemPointView>
      </div>
    </div>
  </div>

  <!--   Bottom Sheet  -->

  <BottomSheetView ref="bottomSheetRef">
    <p class="text-center text-[#ccc] text-2xl"><strong>Фильтры поиска</strong></p>
    <div class="ms-4 me-4 mt-4 mb-4">
      <fieldset>
        <div class="flex flex-wrap gap-4">
          <div class="flex items-center">
            <input v-model="typeSearchFilter" class="me-2" type="radio"
                   :id="TypeSearchFilter.NAME"
                   :name="TypeSearchFilter.NAME"
                   :value="TypeSearchFilter.NAME" />
            <label class="text-[#cccccc] whitespace-nowrap" :for="TypeSearchFilter.NAME">По
              названию</label>
          </div>
          <div class="flex items-center">
            <input v-model="typeSearchFilter" class="me-2" type="radio"
                   :id="TypeSearchFilter.DIRECTION"
                   :name="TypeSearchFilter.DIRECTION"
                   :value="TypeSearchFilter.DIRECTION" />
            <label :for="TypeSearchFilter.DIRECTION" class="text-[#cccccc] whitespace-nowrap">По
              направлению</label>
          </div>
          <div class="flex items-center">
            <input v-model="typeSearchFilter" class="me-2" type="radio"
                   :id="TypeSearchFilter.ADDRESS"
                   :name="TypeSearchFilter.ADDRESS"
                   :value="TypeSearchFilter.ADDRESS" />
            <label :for="TypeSearchFilter.ADDRESS" class="text-[#cccccc] whitespace-nowrap">По
              адресу</label>
          </div>
        </div>
      </fieldset>

    </div>
  </BottomSheetView>

  <!--  END Bottom Sheet  -->

  <div
    v-if="isLastUpdateTime"
    @click="updateDataPoints"
    class="fixed start-0 end-0 bottom-0 mb-[80px] z-10 bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer"
  >
    <span class="text-sm font-medium">Обновить данные</span>
  </div>

</template>
<style scoped>
</style>
