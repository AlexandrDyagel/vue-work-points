<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
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
import FilterSortSheet from '@/components/FilterSortSheet.vue'
import { usePointsStore } from '@/store/Points.ts'
import { useLastUpdateTimeStore } from '@/store/LastUpdateTime.ts'

const router = useRouter()
const pointsStore = usePointsStore()
const lastUpdateTimeStore = useLastUpdateTimeStore()
const { obtainCachedPoints, clearCachePoints, setLastUpdateDataPoints } = useCache()
const { userSearchFilter, updateUserSearchFilter, userSortType, updateUserSortType } =
  useSearchFilter()
const inputTopAppBarStore = useInputFocus()
const { getUserRole } = useUserRole()

// --- Состояние ---
const isLoadingData = ref(false)
const queryInput = ref('')
const cachedPoints = ref<PointResponse[]>([])
const bottomSheetRef = ref()
const topAppBarRef = ref()
const sharePoint = ref<PointResponse>()
const shareBottomSheetRef = ref()

const typeSearchFilter = ref<TypeSearchFilter>(TypeSearchFilter.NAME)
const typeSort = ref<TypeSort>(TypeSort.NAME_ASC)
const userRole = ref<UserRole>(UserRole.USER)
const initialLoadDone = ref(false) // флаг, что первая загрузка завершена

// --- Типы для группировки ---
const typeLabels: Record<TypePoint, string> = {
  [TypePoint.TP]: 'Тоннель пешеходный',
  [TypePoint.TA]: 'Тоннель автомобильный',
  [TypePoint.PP]: 'Пешеходный путепровод',
  [TypePoint.Home]: 'Участок',
}

/** Порядок типов для сортировки по type */
const typeOrder: Record<TypePoint, number> = {
  [TypePoint.TP]: 0,
  [TypePoint.TA]: 1,
  [TypePoint.PP]: 2,
  [TypePoint.Home]: 3,
}

// --- Загрузка ---
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

    initialLoadDone.value = true
    console.log('Время выполнения = ', performance.now() - time)
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

// --- Экранирование HTML (защита от XSS) ---
function escapeHtml(str: string): string {
  const div = document.createElement('div')
  div.appendChild(document.createTextNode(str))
  return div.innerHTML
}

// --- Подсветка совпадений (безопасная) ---
function highlightMatches(text: string): string {
  if (!queryInput.value) return escapeHtml(text)

  const escapedText = escapeHtml(text)
  const query = queryInput.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedQuery = escapeHtml(query)
  const regex = new RegExp(`(${escapedQuery})`, 'gi')

  return escapedText.replace(
    regex,
    '<span class="bg-[#ffdc60] text-black font-bold">$1</span>',
  )
}

// --- Фильтрация ---
function applyFilter(points: PointResponse[]): PointResponse[] {
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
function applySort(points: PointResponse[]): PointResponse[] {
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
      sorted.sort((a, b) => (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99))
      break
  }
  return sorted
}

// --- Фильтрованные и сгруппированные по типу ---
const filteredPoints = computed<PointResponse[]>(() => {
  const filtered = applyFilter(cachedPoints.value)
  return applySort(filtered)
})

// Группировка по типу (ТП, ТА, ПП, УЧ) — сохраняет порядок сортировки
const groupedByType = computed(() => {
  const groups = new Map<TypePoint, PointResponse[]>()
  for (const point of filteredPoints.value) {
    const list = groups.get(point.type) ?? []
    list.push(point)
    groups.set(point.type, list)
  }
  // Сохраняем порядок из typeOrder
  const ordered: { type: TypePoint; label: string; points: PointResponse[] }[] = []
  for (const [type, order] of Object.entries(typeOrder).sort((a, b) => a[1] - b[1])) {
    const tp = type as TypePoint
    const pts = groups.get(tp)
    if (pts && pts.length > 0) {
      ordered.push({ type: tp, label: typeLabels[tp], points: pts })
    }
  }
  return ordered
})

const totalCount = computed(() => cachedPoints.value.length)
const filteredCount = computed(() => filteredPoints.value.length)

// --- Сообщение при пустом списке ---
const emptyMessage = computed(() => {
  if (cachedPoints.value.length === 0) return 'Нет данных'
  if (filteredPoints.value.length === 0 && cachedPoints.value.length > 0) return 'Нет результата поиска'
  return ''
})

// --- Обработчики фильтров/сортировки (watchers с защитой от срабатывания при инициализации) ---
const handleFilterChange = (queryString: string) => {
  queryInput.value = queryString
}

const openBottomSheet = () => {
  bottomSheetRef.value.openSheet()
}

const closeBottomSheet = () => {
  bottomSheetRef.value.closeSheet()
}

watch(typeSearchFilter, async (newType, oldType) => {
  if (!initialLoadDone.value) return
  if (newType && newType !== oldType) {
    topAppBarRef.value.clearSearchInput()
    closeBottomSheet()
    await updateUserSearchFilter(newType)
  }
})

watch(typeSort, async (newSort, oldSort) => {
  if (!initialLoadDone.value) return
  if (newSort !== oldSort) {
    await updateUserSortType(newSort)
    closeBottomSheet()
  }
})

// --- Кнопка добавления (FAB для админа) ---
const addNewPoint = () => {
  if (userRole.value !== UserRole.ADMIN) return
  router.push(Route.AddPoint)
}

// --- Обновление данных ---
const updateDataPoints = async () => {
  try {
    isLoadingData.value = true
    await clearCachePoints()
    const cachedDataPoints = await obtainCachedPoints()
    pointsStore.savePoints(cachedDataPoints)
    cachedPoints.value = pointsStore.points

    const lastUpdatedAt = cachedDataPoints.sort(
      (a, b) => Number(b.updatedAt) - Number(a.updatedAt),
    )[0].updatedAt

    await setLastUpdateDataPoints(lastUpdatedAt)
    lastUpdateTimeStore.setLastUpdateTime(false)
  } catch (e) {
    console.error(`Ошибка PointsView.vue в updateDataPoints: ${e}`)
  } finally {
    isLoadingData.value = false
  }
}

// --- Шеринг ---
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
    <!-- Пустой список -->
    <span
      v-if="filteredPoints.length === 0"
      class="absolute w-full h-full pb-[70px] flex justify-center items-center text-2xl text-[#F0F0F0]"
    >
      {{ emptyMessage }}
    </span>

    <!-- Кнопка «+» при пустом списке (admin) -->
    <div
      v-if="filteredPoints.length === 0 && userRole === UserRole.ADMIN"
      @click="addNewPoint"
      class="fixed z-20 shadow-xl start-4 end-4 bottom-20 rounded-xl bg-black border border-[#000] text-sm p-2.5 focus:outline-none"
    >
      <p>Добавить точку +</p>
    </div>

    <!-- Счётчик и список -->
    <div v-if="filteredPoints.length > 0">
      <!-- Счётчик -->
      <div class="px-4 pt-2 pb-1 text-xs text-gray-500">
        Найдено: {{ filteredCount }} / Всего: {{ totalCount }}
      </div>

      <!-- Точки, сгруппированные по типу -->
      <div v-auto-animate>
        <template v-for="group in groupedByType" :key="group.type">
          <!-- Заголовок группы -->
          <div
            class="mx-4 mt-3 mb-1 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wider inline-block"
            :class="{
              'bg-green-900/40 text-green-400': group.type === TypePoint.TP,
              'bg-blue-900/40 text-blue-400': group.type === TypePoint.TA,
              'bg-purple-900/40 text-purple-400': group.type === TypePoint.PP,
              'bg-yellow-900/40 text-yellow-400': group.type === TypePoint.Home,
            }"
          >
            {{ group.label }} — {{ group.points.length }}
          </div>

          <ItemPointView
            v-for="[index, point] of group.points.entries()"
            :key="point.uid"
            :class="
              index === group.points.length - 1 && group === groupedByType[groupedByType.length - 1]
                ? 'mb-[80px]'
                : 'border-b-[1px] border-[#3d3e43]'
            "
            :dataPoint="point"
            @on-click-share="handleShare"
          >
            <template v-slot:name>
              <span
                v-html="
                  typeSearchFilter === TypeSearchFilter.NAME
                    ? highlightMatches(point.name)
                    : escapeHtml(point.name)
                "
              ></span>
            </template>

            <template v-slot:direction>
              <span
                v-html="
                  typeSearchFilter === TypeSearchFilter.DIRECTION
                    ? highlightMatches(point.direction)
                    : escapeHtml(point.direction)
                "
              ></span>
            </template>

            <template v-slot:address>
              <span
                v-html="
                  typeSearchFilter === TypeSearchFilter.ADDRESS
                    ? highlightMatches(point.address)
                    : escapeHtml(point.address)
                "
              ></span>
            </template>
          </ItemPointView>
        </template>
      </div>
    </div>
  </div>

  <!-- FAB кнопка «+» для админа (всегда видна, когда есть данные) -->
  <button
    v-if="userRole === UserRole.ADMIN && cachedPoints.length > 0"
    @click="addNewPoint"
    class="fixed z-20 end-4 bottom-24 w-14 h-14 bg-[#5fb336] hover:bg-[#4d9a2a] text-white rounded-2xl shadow-xl flex items-center justify-center active:scale-95 transition-transform"
  >
    <svg xmlns="http://www.w3.org/2000/svg" class="h-7 w-7" viewBox="0 -960 960 960" fill="currentColor">
      <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
    </svg>
  </button>

  <!-- Bottom Sheet — фильтры и сортировка -->
  <BottomSheetView ref="bottomSheetRef">
    <FilterSortSheet
      :typeSearchFilter="typeSearchFilter"
      :typeSort="typeSort"
      @update:typeSearchFilter="typeSearchFilter = $event"
      @update:typeSort="typeSort = $event"
    />
  </BottomSheetView>

  <!-- Кнопка обновления данных -->
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
