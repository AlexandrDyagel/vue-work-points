<script setup lang="ts">

import { getPoints } from '../../firebase/init.ts'
import { inject, type Ref, ref, watch, watchEffect } from 'vue'
import { useObtainPoints } from '../../store/Point.ts'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { LocalStorageNames, Routes as Route, TypeSearchFilter } from '@/model/Enums.ts'
import PointItemView from '@/components/PointItemView.vue'
import TopAppBarView from '@/components/TopAppBarView.vue'
import { useInputFocus } from '../../store/TopAppBar.ts'
import BottomSheetView from '@/components/BottomSheetView.vue'

function setItemsLocalStorage(items: PointResponse[]) {
  if (typeof(Storage) !== 'undefined') {
    console.log("localStorage поддерживается")
    localStorage.clear()
    localStorage.setItem(LocalStorageNames.POINTS, JSON.stringify(items))
  } else {
    console.log("localStorage не поддерживается")
  }
}

function getItemsLocalStorage(key: LocalStorageNames): PointResponse[] {
  return JSON.parse(localStorage.getItem(key) || '')
}

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

const inputTopAppBarStore = useInputFocus()

const obtainPointsStore = useObtainPoints()

function obtainPoints() {
  try {
    isLoadingData.value = true
    getPoints()
      .then(result => {
          obtainPointsStore.setPoints(result)
          setItemsLocalStorage(result)
          isLoadingData.value = false
          console.log(getItemsLocalStorage(LocalStorageNames.POINTS))
        },
        error => {
          console.log(`Ошибка error: ${error}`)
          isLoadingData.value = false
        })
    obtainPointsStore.updatePoints(false)
  } catch (e) {
    isLoadingData.value = false
    obtainPointsStore.updatePoints(false)
    console.log(`Ошибка catch: ${e}`)
  }
}

const queryInput = ref('')

const filteredPoints = ref([] as PointResponse[])

const router = useRouter()

const search = () => {
  switch (typeSearchFilter.value) {
    case TypeSearchFilter.NAME : {
      filteredPoints.value = obtainPointsStore.points.filter(point =>
        point.name.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break;
    }
    case TypeSearchFilter.ADDRESS : {
      filteredPoints.value = obtainPointsStore.points.filter(point =>
        point.address.toLowerCase().includes(queryInput.value.toLowerCase().trim()))
      break;
    }
  }
}

watchEffect(() => {
  if (obtainPointsStore.updated || obtainPointsStore.points.length === 0) {
    obtainPoints()
    console.log('УДАЛЕННЫЙ ЗАПРОС НА СЕРВЕР')
  } else {
    isLoadingData.value = false
  }
  if (queryInput.value === '' && filteredPoints.value.length === 0) {
    filteredPoints.value = obtainPointsStore.points
    console.log('ЗАПРОС НА КЭШ')
  }
})

watch(queryInput, () => search())

const handleFilterChange = (queryString: string) => {
  queryInput.value = queryString
}

// Bottom Sheet
const bottomSheetRef = ref(null)

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const typeSearchFilter = ref(TypeSearchFilter.NAME)

</script>

<template>
  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full bg-[#242528]">
    <div
      v-if="filteredPoints.length === 0"
      @click="router.push(Route.AddPoint)"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none">
      <p>Добавить точку +</p>
    </div>

    <TopAppBarView
      :class="inputTopAppBarStore.isFocused ? 'bottom-0 border-t-[1px]' : 'sticky top-0 border-b-[1px]'"
      class="fixed bg-[#242528] start-0 end-0 border-[#3d3e43] z-10"
      :type-search-filter="typeSearchFilter"
      @filter-changed="handleFilterChange"
      @icon-filter-click="openBottomSheet"
    />

    <!--    <div class="me-4 ms-4">
          <div
            @click="focus"
            class="text-center w-full shadow-xl border-[#5fb336] rounded-lg bg-[#5fb336] border text-sm p-2.5 focus:outline-none"
          >Показать на карте</div>
        </div>-->

    <div class="t-4">
      <div v-auto-animate>
        <PointItemView
          v-for="[index, point] of filteredPoints.entries()" :key="point.uid"
          :class="index === filteredPoints.length - 1 ? `mb-[70px]` : `border-b-[1px] border-[#3d3e43]`"
          :dataPoint="point" />
      </div>
    </div>
  </div>

<!--   Bottom Sheet  -->

  <BottomSheetView ref="bottomSheetRef">
    <p class="text-center text-[#ccc] text-2xl"><strong>Фильтры поиска</strong></p>
    <div class="ms-4 me-4 mt-4">
      <fieldset>
        <div>
          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.NAME" :name="TypeSearchFilter.NAME"
                 :value="TypeSearchFilter.NAME" />
          <label class="me-4 text-[#cccccc]" for="name">По названию точки</label>

          <input v-model="typeSearchFilter" class="me-2" type="radio" :id="TypeSearchFilter.ADDRESS" :name="TypeSearchFilter.ADDRESS"
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
