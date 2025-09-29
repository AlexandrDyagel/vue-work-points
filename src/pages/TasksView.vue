<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { computed, onMounted, ref, watch, watchEffect, watchPostEffect } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import SearchInputView from '@/components/SearchInputView.vue'
import { useUpdatedTaskList } from '@/store/TasksList.ts'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { Routes as Route } from '@/model/Enums.ts'
import ItemTaskView from '@/components/ItemTaskView.vue'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ItemDropDown from '@/components/ItemDropDown.vue'
import { useVerticalScroll } from '@/composables/useVerticalScroll.ts'
import ArrowDropDownIcon from '@/components/icons/ArrowDropDownIcon.vue'
import Svg from '@/components/Svg.vue'

const router = useRouter()
const tasksLocalStorage = useTasksLocalStorage()
const updatedTaskListStore = useUpdatedTaskList()
const inputFocus = useInputFocus()
const { obtainCachedPoints } = useCache()

const isLoadingData = ref(false)
const lastItemRef = ref()
const saveProgress = ref(false)
const taskItems = ref([] as PointResponse[])
const queryString = ref('')
const filteredPoints = ref([] as PointResponse[])
const cachedPoints = ref<PointResponse[]>([])
const scrollDropDownContainerRef = ref<HTMLElement | null>(null)

const {
  isAtBottom,
  canScrollDown,
  checkScrollState,
} = useVerticalScroll(scrollDropDownContainerRef)

const isVisibleSaveButton = computed(() => updatedTaskListStore.isUpdated && !inputFocus.isFocused)
const isVisibleTaskMapButton = computed(() => taskItems.value.length !== 0 && !inputFocus.isFocused)
const isVisibleArrowDropDownIcon = computed(() => {
  if (canScrollDown.value) return true
  if (isAtBottom.value) return false
  return filteredPoints.value.length > 6
})

const search = () => {
  filteredPoints.value = cachedPoints.value.filter(point =>
    point.name.toLowerCase().includes(queryString.value.toLowerCase().trim()))

  if (queryString.value === '') filteredPoints.value.splice(0, filteredPoints.value.length)
}

const handleFilterChange = (inputString: string) => {
  queryString.value = inputString
}

// Удаление элемента-задачи из массива добавленных задач
const deleteTaskItem = (index: number) => {
  taskItems.value.splice(index, 1)
  updatedTaskListStore.updateList(true)
}

// Нажатие на элемент выподающего списка найденных элементов point
const clickFilteredItem = (point: PointResponse) => {
  if (point) {
    taskItems.value.push(point)
    updatedTaskListStore.updateList(true)
    queryString.value = ''
  } else return
}

// Потеря фокуса input
const handleInputFocusBlur = () => filteredPoints.value.splice(0, filteredPoints.value.length)

function loadTasksFromLocalStorage(): void {
  taskItems.value = tasksLocalStorage.getItems()
  updatedTaskListStore.updateList(false)
}

const saveTasks = (): void => {
  saveProgress.value = true
  tasksLocalStorage.setItems(taskItems.value)
  updatedTaskListStore.updateList(false)
  saveProgress.value = false
}

watch(queryString, () => search())

onMounted(async () => {
  try {
    isLoadingData.value = true
    loadTasksFromLocalStorage()

    obtainCachedPoints()
      .then(cachedDataPoints => {
        cachedPoints.value = cachedDataPoints
      })
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

const marginBottomLastItemTask = computed(() => {
  if (isVisibleTaskMapButton.value && isVisibleSaveButton.value) return 'mb-[180px]'
  return isVisibleSaveButton.value || isVisibleTaskMapButton.value ? 'mb-[130px]' : 'mb-[70px]'
})

const emptyElements = computed(() => taskItems.value.length === 0 ? 'Нет заданий' : '')

watchPostEffect(() => {
  if (lastItemRef.value) {
    lastItemRef.value.$el.scrollIntoView({ behavior: 'smooth' })
  }
})

function isAddedTaskList(item: PointResponse): boolean {
  return taskItems.value.map(item => item.name).includes(item.name)
}

const scrollDropDownContainerWidth = ref('')

watchEffect(() => {
  if (canScrollDown) {
    scrollDropDownContainerWidth.value = `w-[${scrollDropDownContainerRef.value?.clientWidth}px]`
  }
})
</script>

<template>
  <BackButton @click="router.back" />
  <LoadingScreen :is-loading="isLoadingData" />

  <div class="fixed top-0 start-0 end-0 z-50 bg-[#242528] border-b-[1px] border-[#3d3e43]">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания</strong></p>
    <!-- строка поиска -->
    <SearchInputView @focus-blur="handleInputFocusBlur" @filter-changed="handleFilterChange" />

    <div>
      <!-- выпадающий список поиска -->
      <div
        v-auto-animate
        ref="scrollDropDownContainerRef"
        @scroll="checkScrollState"
        v-if="filteredPoints.length !== 0"
        class="absolute max-h-[280px] bg-[#17212B] overflow-y-auto mt-[-16px] mx-6 shadow-xl z-50"
      >
        <ItemDropDown
          v-for="[index, point] of filteredPoints.entries()"
          :key="point.uid"
          :name-point="point.name"
          :is-added-task-list="isAddedTaskList(point)"
          :class="{'border-b-[1px] border-[#3d3e43]': index !== filteredPoints.length - 1}"
          @on-click="clickFilteredItem(point)"
        >
        </ItemDropDown>
        <Svg
          v-if="isVisibleArrowDropDownIcon"
          class="fixed inline-flex items-center justify-center text-[#88ce02] text-[10px] h-[10px] top-[380px] w-[calc(100vw-6.25rem)]">
          <component ref="comp" :is="ArrowDropDownIcon"></component>
        </Svg>
      </div>
    </div>
  </div>
  <div
    class="fixed overflow-auto start-0 top-[128px] end-0 bottom-0 w-full bg-[#242528]"
  >
     <span
       v-if="taskItems.length === 0"
       class="absolute w-screen h-screen flex justify-center items-center text-2xl text-[#F0F0F0]"
     >{{ emptyElements
       }}
    </span>

    <!-- добавленные элементы в список -->
    <div v-auto-animate>
      <ItemTaskView
        v-for="[index, point] of taskItems.entries()"
        :key="point.uid"
        :index="index"
        :task-items="taskItems"
        @delete="deleteTaskItem"
        :class="index === taskItems.length - 1 ? marginBottomLastItemTask : ``"
        :ref="(el) => { if (index === taskItems.length - 1) lastItemRef = el }"
      />
    </div>

    <div
      v-if="isVisibleSaveButton"
      @click="saveTasks"
      class="fixed start-0 end-0 bottom-0 z-10 mb-[80px] bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer"
      :class="isVisibleTaskMapButton ? 'mb-[130px]' : 'mb-[80px]'"
    >
      <span class="text-sm font-medium">{{ saveProgress ? 'Идет сохранение...' : 'Сохранить'
        }}</span>
    </div>

    <div
      v-if="isVisibleTaskMapButton"
      @click="router.push(Route.TaskMap)"
      class="fixed start-0 end-0 bottom-0 mb-[80px] z-10 bg-[#3d7eff] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer"
    >
      <span class="text-sm font-medium">На карте</span>
    </div>
  </div>
</template>

<style scoped>
</style>
