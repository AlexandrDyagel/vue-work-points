<script setup lang="ts">
import { computed, onMounted, ref, watch, watchEffect } from 'vue'
import { useRouter } from 'vue-router'
import { PointResponse } from '@/model/PointResponse.ts'
import { Routes as Route, TypeSearchFilter, TypeSort, UserRole, TypePoint } from '@/model/Enums.ts'
import TopAppBarView from '@/components/TopAppBarView.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import BottomSheetView from '@/components/BottomSheetView.vue'
import { useCache } from '@/composables/useCache.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import ItemPointView from '@/components/ItemPointView.vue'
import { useUserRole } from '@/composables/useUserRole.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ShareBottomSheet from '@/components/ShareBottomSheet.vue'
import { usePointsStore } from '@/store/Points.ts'
import { useLastUpdateTimeStore } from '@/store/LastUpdateTime.ts'

const isLoadingData = ref(false)
const queryInput = ref('')
const cachedPoints = ref<PointResponse[]>([])
const bottomSheetRef = ref()
const topAppBarRef = ref()
const sharePoint = ref<PointResponse>()
const shareBottomSheetRef = ref()

const router = useRouter()
const pointsStore = usePointsStore()
const lastUpdateTimeStore = useLastUpdateTimeStore()
const { obtainCachedPoints, clearCachePoints, setLastUpdateDataPoints } = useCache()
const {
  userSearchFilter,
  updateUserSearchFilter,
  userSortType,
  updateUserSortType,
} = useSearchFilter()
const typeSearchFilter = ref<TypeSearchFilter>(TypeSearchFilter.NAME)
const typeSort = ref<TypeSort>(TypeSort.NAME_ASC)
const inputTopAppBarStore = useInputFocus()
const { getUserRole } = useUserRole()
const userRole = ref<UserRole>(UserRole.USER)

onMounted(async () => {
  try {
    isLoadingData.value = true

    userRole.value = await getUserRole()
    typeSearchFilter.value = await userSearchFilter()
    typeSort.value = await userSortType()

    const time = performance.now()

    if (pointsStore.points.length !== 0) {
      cachedPoints.value = pointsStore.points
    } else {
      await obtainCachedPoints().then((cachedDataPoints) => {
        pointsStore.savePoints(cachedDataPoints)
        cachedPoints.value = pointsStore.points
      })
    }

    isLoadingData.value = false
    console.log('Время выполнения = ', performance.now() - time)
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

// --- Фильтрация ---

const applyFilter = (points: PointResponse[]): PointResponse[] => {
  if (!queryInput.value) return points

  const q = queryInput.value.toLowerCase().trim()
  return points.filter((point) => {
    switch (typeSearchFilter.value) {
      case TypeSearchFilter.NAME:
        return point.name.toLowerCase().includes(q)
      case TypeSearchFilter.DIRECTION:
        return point.direction.toLowerCase().includes(q)
      case TypeSearchFilter.ADDRESS:
        return point.address.toLowerCase().includes(q)
      default:
        return true
    }
  })
}

// --- Сортировка ---

/** Порядок типов для сортировки по type */
const typeOrder: Record<TypePoint, number> = {
  [TypePoint.TP]: 0,
  [TypePoint.TA]: 1,
  [TypePoint.PP]: 2,
  [TypePoint.Home]: 3,
}

const applySort = (points: PointResponse[]): PointResponse[] => {
  const sorted = [...points]
  switch (typeSort.value) {
    case TypeSort.NAME_ASC:
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      break
    case TypeSort.NAME_DESC:
      sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'))
      break
    case TypeSort.CREATED_DESC:
      sorted.sort((a, b) => Number(b.createdAt) - Number(a.createdAt))
      break
    case TypeSort.CREATED_ASC:
      sorted.sort((a, b) => Number(a.createdAt) - Number(b.createdAt))
      break
    case TypeSort.UPDATED_DESC:
      sorted.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt))
      break
    case TypeSort.UPDATED_ASC:
      sorted.sort((a, b) => Number(a.updatedAt) - Number(b.updatedAt))
      break
    case TypeSort.TYPE:
      sorted.sort(
        (a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99),
      )
      break
  }
  return sorted
}

const filteredPoints = computed<PointResponse[]>(() => {
  const filtered = applyFilter(cachedPoints.value)
  return applySort(filtered)
})

// --- Подсветка совпадений ---

const highlightMatches = (text: string) => {
  if (!queryInput.value) return text

  const query = queryInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${query})`, 'gi')

  return text.replace(
    regex,
    '<span class="bg-[#ffdc60] text-black font-bold">$1</span>',
  )
}

watch(queryInput, () => {
  // filteredPoints пересчитывается через computed автоматически
})

const handleFilterChange = (queryString: string) => {
  queryInput.value = queryString
}

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const closeBottomSheet = () => {
  bottomSheetRef.value.closeSheet()
}

watch(typeSearchFilter, async (newType) => {
  if (newType) {
    topAppBarRef.value.clearSearchInput()
    closeBottomSheet()
  }
  await updateUserSearchFilter(newType)
})

watch(typeSort, async (newSort) => {
  await updateUserSortType(newSort)
  closeBottomSheet()
})

// --- UI хелперы для чипсов ---

const searchFilterChips = [
  { value: TypeSearchFilter.NAME, label: 'По названию' },
  { value: TypeSearchFilter.DIRECTION, label: 'По направлению' },
  { value: TypeSearchFilter.ADDRESS, label: 'По адресу' },
] as const

const sortChips = [
  { value: TypeSort.NAME_ASC, label: 'А → Я', group: 'Алфавит' },
  { value: TypeSort.NAME_DESC, label: 'Я → А', group: 'Алфавит' },
  { value: TypeSort.CREATED_DESC, label: 'Новые', group: 'Дата добавления' },
  { value: TypeSort.CREATED_ASC, label: 'Старые', group: 'Дата добавления' },
  { value: TypeSort.UPDATED_DESC, label: 'Новые', group: 'Дата обновления' },
  { value: TypeSort.UPDATED_ASC, label: 'Старые', group: 'Дата обновления' },
  { value: TypeSort.TYPE, label: 'По типу', group: 'Тип' },
] as const

const groupedSortChips = computed(() => {
  const groups = new Map<string, typeof sortChips>()
  for (const chip of sortChips) {
    const list = groups.get(chip.group) ?? []
    list.push(chip)
    groups.set(chip.group, list)
  }
  return Array.from(groups.entries())
})

// --- Кнопка добавления ---

const addNewPoint = () => {
  if (userRole.value !== UserRole.ADMIN) return
  router.push(Route.AddPoint)
}

const emptyElements = computed(() => {
  if (filteredPoints.value.length === 0 && cachedPoints.value.length === 0) {
    return 'Нет данных'
  } else if (
    filteredPoints.value.length === 0 &&
    cachedPoints.value.length !== 0
  ) {
    return 'Нет результата поиска'
  } else return ''
})

const updateDataPoints = () => {
  try {
    isLoadingData.value = true
    clearCachePoints()

    obtainCachedPoints().then((cachedDataPoints) => {
      cachedPoints.value = cachedDataPoints
      filteredPoints.value = []
      filteredPoints.value = cachedDataPoints

      const lastUpdatedAt = cachedDataPoints.sort(
        (a, b) => Number(b.updatedAt) - Number(a.updatedAt),
      )[0].updatedAt

      setLastUpdateDataPoints(lastUpdatedAt)
    })
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
    lastUpdateTimeStore.setLastUpdateTime(false)
  }
}

const handleShare = (point: PointResponse): void => {
  sharePoint.value = point
  shareBottomSheetRef.value.openShareBottomSheet()
}
</script>

<template>
  <LoadingScreen :is-loading="isLoadingData" />

  <TopAppBarView
    ref="topAppBarRef"
    :class="
      inputTopAppBarStore.isFocused
        ? 'bottom-0 border-t-[1px]'
        : 'sticky top-0 border-b-[1px]'
    "
    class="fixed bg-[#242528] start-0 end-0 border-[#3d3e43] z-20"
    :type-search-filter="typeSearchFilter"
    @filter-changed="handleFilterChange"
    @icon-filter-click="openBottomSheet"
  />

  <div
    class="fixed overflow-auto start-0 end-0 w-full h-full bg-[#242528]"
    :class="
      inputTopAppBarStore.isFocused ? 'top-0 bottom-0' : 'top-[80px] pb-[80px]'
    "
  >
    <span
      v-if="filteredPoints.length === 0"
      class="absolute w-full h-full pb-[70px] flex justify-center items-center text-2xl text-[#F0F0F0]"
    >
      {{ emptyElements }}
    </span>

    <div
      v-if="filteredPoints.length === 0 && userRole === UserRole.ADMIN"
      @click="addNewPoint"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
    >
      <p>Добавить точку +</p>
    </div>

    <div class="t-4">
      <div v-auto-animate>
        <ItemPointView
          v-for="[index, point] of filteredPoints.entries()"
          :key="point.uid"
          :class="
            index === filteredPoints.length - 1
              ? `mb-[80px]`
              : `border-b-[1px] border-[#3d3e43]`
          "
          :dataPoint="point"
          @on-click-share="handleShare"
        >
          <template v-slot:name>
            <span
              v-html="
                typeSearchFilter === TypeSearchFilter.NAME
                  ? highlightMatches(point.name)
                  : point.name
              "
            ></span>
          </template>

          <template v-slot:direction>
            <span
              v-html="
                typeSearchFilter === TypeSearchFilter.DIRECTION
                  ? highlightMatches(point.direction)
                  : point.direction
              "
            ></span>
          </template>

          <template v-slot:address>
            <span
              v-html="
                typeSearchFilter === TypeSearchFilter.ADDRESS
                  ? highlightMatches(point.address)
                  : point.address
              "
            ></span>
          </template>
        </ItemPointView>
      </div>
    </div>
  </div>

  <!-- Bottom Sheet — фильтры и сортировка -->
  <BottomSheetView ref="bottomSheetRef">
    <div class="pb-4">
      <!-- Заголовок -->
      <h2 class="text-center text-[#ccc] text-xl font-bold mb-5">
        Фильтры и сортировка
      </h2>

      <!-- Раздел: Поиск по -->
      <div class="mb-5">
        <h3 class="text-sm text-gray-400 font-medium mb-2">🔍 Поиск по</h3>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="chip in searchFilterChips"
            :key="chip.value"
            @click="typeSearchFilter = chip.value"
            class="px-4 py-2 rounded-full text-sm font-medium border transition-all"
            :class="
              typeSearchFilter === chip.value
                ? 'bg-[#5fb336] border-[#5fb336] text-white shadow-sm shadow-[#5fb336]/30'
                : 'bg-[#2a2a2e] border-[#3d3e43] text-[#aaa] hover:border-[#5fb336]/50'
            "
          >
            {{ chip.label }}
          </button>
        </div>
      </div>

      <!-- Раздел: Сортировка -->
      <div>
        <h3 class="text-sm text-gray-400 font-medium mb-2">📋 Сортировка</h3>
        <div class="space-y-3">
          <div v-for="[group, chips] in groupedSortChips" :key="group">
            <p class="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
              {{ group }}
            </p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="chip in chips"
                :key="chip.value"
                @click="typeSort = chip.value"
                class="px-4 py-2 rounded-full text-sm font-medium border transition-all"
                :class="
                  typeSort === chip.value
                    ? 'bg-[#5fb336] border-[#5fb336] text-white shadow-sm shadow-[#5fb336]/30'
                    : 'bg-[#2a2a2e] border-[#3d3e43] text-[#aaa] hover:border-[#5fb336]/50'
                "
              >
                <span class="flex items-center gap-1.5">
                  <svg
                    v-if="typeSort === chip.value"
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-3.5 w-3.5"
                    viewBox="0 -960 960 960"
                    fill="currentColor"
                  >
                    <path
                      d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"
                    />
                  </svg>
                  {{ chip.label }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </BottomSheetView>

  <!-- Button Update Data -->
  <div
    v-if="lastUpdateTimeStore.isLastUpdateTime"
    @click="updateDataPoints"
    class="fixed start-0 end-0 bottom-0 mb-[80px] z-10 bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer active:opacity-50"
  >
    <span class="text-sm font-medium">Обновить данные</span>
  </div>

  <ShareBottomSheet ref="shareBottomSheetRef" :sharePoint="sharePoint" />
</template>
<style scoped></style>
