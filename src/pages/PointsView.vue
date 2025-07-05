<script setup lang="ts">

import { computed, inject, onMounted, type Ref, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route, TypeSearchFilter, UserRole } from '@/model/Enums.ts'
import TopAppBarView from '@/components/TopAppBarView.vue'
import { useInputFocus } from '../../store/TopAppBar.ts'
import BottomSheetView from '@/components/BottomSheetView.vue'
import { useCache } from '@/composables/useCache.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import ItemPointView from '@/components/ItemPointView.vue'
import { useUserRole } from '@/composables/useUserRole.ts'

const router = useRouter()

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

const { getUserRole } = useUserRole()
const userRole = ref(getUserRole())

const inputTopAppBarStore = useInputFocus()

const queryInput = ref('')

const filteredPoints = ref([] as PointResponse[])

const { obtainCachedPoints } = useCache()

const cachedPoints = ref<PointResponse[]>([])

onMounted(async () => {
  try {
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
})

const search = () => {
  switch (typeSearchFilter.value) {
    case TypeSearchFilter.NAME : {
      filteredPoints.value = cachedPoints.value.filter(point =>
        point.name.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break
    }
    case TypeSearchFilter.ADDRESS : {
      filteredPoints.value = cachedPoints.value.filter(point =>
        point.address.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break
    }
  }
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

// Bottom Sheet
const bottomSheetRef = ref()

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const { userSearchFilter, updateUserSearchFilter } = useSearchFilter()
const typeSearchFilter = ref()

onMounted(() => typeSearchFilter.value = userSearchFilter())

watch(typeSearchFilter, (newTypeSearchFilter) => {
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

</script>

<template>
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">

    <span v-if="filteredPoints.length === 0"
         class="fixed w-full h-full flex justify-center items-center text-2xl text-[#F0F0F0]">{{ emptyElements }}
    </span>

    <div
      v-if="filteredPoints.length === 0"
      @click="addNewPoint"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
      <p>Добавить точку +</p>
    </div>

    <TopAppBarView
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
          :dataPoint="point" />
      </div>
    </div>
  </div>

  <!--   Bottom Sheet  -->

  <BottomSheetView ref="bottomSheetRef">
    <p class="text-center text-[#ccc] text-2xl"><strong>Фильтры поиска</strong></p>
    <div class="ms-4 me-4 mt-4 mb-4">
      <fieldset>
        <div>
          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.NAME"
                 :name="TypeSearchFilter.NAME"
                 :value="TypeSearchFilter.NAME" />
          <label class="me-4 text-[#cccccc]" for="name">По названию точки</label>

          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.ADDRESS"
                 :name="TypeSearchFilter.ADDRESS"
                 :value="TypeSearchFilter.ADDRESS" />
          <label for="address" class="text-[#cccccc]">По адресу точки</label>

        </div>
      </fieldset>

    </div>
  </BottomSheetView>

  <!--  END Bottom Sheet  -->

</template>
<style scoped>

</style>
