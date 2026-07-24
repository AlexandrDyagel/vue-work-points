<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { computed, onMounted, type Ref, ref, watch } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import SearchInputView from '@/components/SearchInputView.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { Routes as Route } from '@/model/Enums.ts'
import ItemTaskView from '@/components/ItemTaskView.vue'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ItemDropDown from '@/components/ItemDropDown.vue'
import { useTaskPointsStore } from '@/store/TaskPoints.ts'

const router = useRouter()
const tasksLocalStorage = useTasksLocalStorage()
const inputFocus = useInputFocus()
const { obtainCachedPoints } = useCache()
const taskPointsStore = useTaskPointsStore()

const isLoadingData = ref(false)
const lastItemRef = ref()
const taskItems: Ref<PointResponse[]> = ref([])
const queryString = ref('')
const filteredPoints = ref([] as PointResponse[])
const cachedPoints = ref<PointResponse[]>([])

const isVisibleTaskMapButton = computed(() => taskItems.value.length !== 0 && !inputFocus.isFocused)

const search = () => {
  filteredPoints.value = cachedPoints.value.filter((point) =>
    point.name.toLowerCase().includes(queryString.value.toLowerCase().trim()),
  )

  if (queryString.value === '') filteredPoints.value.splice(0, filteredPoints.value.length)
}

const handleFilterChange = (inputString: string) => {
  queryString.value = inputString
}

// Удаление элемента-задачи из массива добавленных задач
const deleteTaskItem = async (index: number) => {
  taskItems.value.splice(index, 1)
  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)
}

// Нажатие на элемент выпадающего списка найденных элементов point
const clickFilteredItem = async (point: PointResponse) => {
  if (point) {
    taskItems.value.push(point)
    await tasksLocalStorage.setItems(taskItems.value)
    taskPointsStore.savePoints(taskItems.value)

    if (lastItemRef.value) {
      lastItemRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }

    queryString.value = ''
  } else return
}

// Потеря фокуса input
const handleInputFocusBlur = () => {
  filteredPoints.value.splice(0, filteredPoints.value.length)
  queryString.value = ''
}

watch(queryString, () => search())

onMounted(async () => {
  try {
    isLoadingData.value = true
    taskItems.value = await tasksLocalStorage.getItems()
    taskPointsStore.savePoints(taskItems.value)

    await obtainCachedPoints().then((cachedDataPoints) => {
      cachedPoints.value = cachedDataPoints
    })
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

const emptyElements = computed(() => (taskItems.value.length === 0 ? 'Нет заданий' : ''))

function isAddedTaskList(item: PointResponse): boolean {
  if (taskItems.value.length !== 0) {
    return taskItems.value.map((item) => item.name).includes(item.name)
  } else return false
}
</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />
  <div class="fixed top-0 start-0 end-0 z-50 bg-[#242528] border-b-[1px] border-[#3d3e43]">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания ({{ taskPointsStore.points.length }})</strong></p>

    <!-- Поиск точки -->
    <div class="relative mb-3">
      <SearchInputView @focus-blur="handleInputFocusBlur" @filter-changed="handleFilterChange" />

      <!-- Результаты поиска -->
      <div
        v-if="filteredPoints.length > 0"
        class="absolute top-full left-6 right-6 mt-[-16px] bg-black border border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[50]"
      >
        <ItemDropDown
          v-for="[index, point] of filteredPoints.entries()"
          :key="point.uid"
          :dataPoint="point"
          :is-added-task-list="isAddedTaskList(point)"
          :class="{ 'border-b-[1px] border-[#3d3e43]': index !== filteredPoints.length - 1 }"
          @on-click="clickFilteredItem(point)"
        >
        </ItemDropDown>
    </div>
      <div
        v-if="queryString && filteredPoints.length === 0"
        class="absolute top-full left-6 right-6 mt-[-16px] bg-black border border-gray-500 rounded-lg shadow-lg p-2 text-center text-sm text-gray-200 z-[55]"
      >
        Точки не найдены
      </div>
    </div>
  </div>
  <div class="fixed overflow-auto start-0 top-[128px] end-0 bottom-0 w-full bg-[#242528]">
    <span
      v-if="taskItems.length === 0"
      class="absolute w-full h-full pb-[70px] flex justify-center items-center text-2xl text-[#F0F0F0]"
      >{{ emptyElements }}
    </span>
    <!-- добавленные элементы в список -->
    <div v-auto-animate>
      <ItemTaskView
        v-for="[index, point] of taskItems.entries()"
        :key="point.uid"
        :index="index"
        :task-items="taskItems"
        @delete="deleteTaskItem"
        :ref="
          (el) => {
            if (index === taskItems.length - 1) lastItemRef = el
          }
        "
      />
    </div>
    <div v-if="isVisibleTaskMapButton" class="bottom-0 start-0 end-0 h-[130px]"></div>

    <div
      v-if="isVisibleTaskMapButton"
      @click="router.push(Route.TaskMap)"
      class="fixed start-0 end-0 bottom-0 mb-[76px] z-10 bg-[#3d7eff] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer active:opacity-50"
    >
      <span class="text-sm font-medium">На карте</span>
    </div>
  </div>
</template>

<style scoped></style>
