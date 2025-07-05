<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useCloudStorage } from 'vue-tg/8.0'
import { useRouter } from 'vue-router'
import {
  computed,
  inject,
  onMounted,
  onRenderTracked,
  type Ref,
  ref,
  watch,
  watchEffect, watchPostEffect
} from 'vue'
import ItemTaskView from '@/components/ItemTaskView.vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useUpdatedTaskList } from '../../store/TasksList.ts'
import { CloudStorageNames } from '@/model/Enums.ts'
import { useInputFocus } from '../../store/TopAppBar.ts'
import { useCache } from '@/composables/useCache.ts'

const router = useRouter()

const tgCloudStorage = useCloudStorage()

const updatedTaskListStore = useUpdatedTaskList()
const inputFocus = useInputFocus()

const saveProgress = ref(false)

const taskItems = ref([] as PointResponse[])

const queryString = ref('')

const filteredPoints = ref([] as PointResponse[])

const lastItemRef = ref()

const isVisibleSaveButton = computed(() => updatedTaskListStore.isUpdated && !inputFocus.isFocused)
const isVisibleClearTaskButton = computed(() => taskItems.value.length !== 0 && !inputFocus.isFocused)

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

async function saveToCloudStorage(taskItems: PointResponse[]) {
  try {
    await tgCloudStorage.setItem(CloudStorageNames.TASK_ITEMS, JSON.stringify(taskItems))
    updatedTaskListStore.updateList(false)
    console.log('Данные успешно сохранены в облако!')
  } catch (error) {
    console.log(`Не удалось сохранить данные: ${error}`)
  }
}

async function loadFromCloudStorage() {
  try {
    const data = await tgCloudStorage.getItem(CloudStorageNames.TASK_ITEMS)
    const result: PointResponse[] = data ? JSON.parse(data) : []
    taskItems.value.push(...result)

    updatedTaskListStore.updateList(false)
    console.log('Данные загружены')
  } catch (error) {
    console.log(`Не удалось загрузить данные: ${error}`)
    taskItems.value = []
  }
}

const saveTasks = async () => {
  saveProgress.value = true
  await saveToCloudStorage(taskItems.value)
  saveProgress.value = false
}

const clearTasks = () => taskItems.value.splice(0, taskItems.value.length)

watch(queryString, () => search())

onMounted(async () => {
  await loadFromCloudStorage()
})

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

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

const marginBottomLastItemTask = computed(() => {
  if (isVisibleClearTaskButton.value && isVisibleSaveButton.value) return 'mb-[180px]'
  return isVisibleSaveButton.value || isVisibleClearTaskButton.value ? 'mb-[130px]' : 'mb-[70px]'
})

const emptyElements = computed(() => taskItems.value.length === 0 ? 'Нет заданий' : '')

watchPostEffect(() => {
  console.log(marginBottomLastItemTask.value)
  if (lastItemRef.value) {
    lastItemRef.value.$el.scrollIntoView({ behavior: 'smooth' })
  }
})

</script>

<template>
  <BackButton @click="router.back" />

  <div
    class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full body bg-[#242528]">

     <span v-if="taskItems.length === 0"
           class="absolute w-screen h-screen flex justify-center items-center text-2xl text-[#F0F0F0]">{{ emptyElements
       }}
    </span>

    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания</strong></p>
    <div class="sticky bg-[#242528] top-0 start-0 end-0 border-b-[1px] border-[#3d3e43] z-50">

      <div>
        <!-- строка поиска -->
        <ItemTaskView @focus-blur="handleInputFocusBlur" @filter-changed="handleFilterChange" />

        <!-- выпадающий список поиска -->
        <div v-auto-animate v-if="filteredPoints.length !== 0"
             class="absolute bg-[#17212B] overflow-auto mt-[-16px] mx-6 shadow-xl z-20">
          <div
            v-for="[index, point] of filteredPoints.entries()"
            :key="point.uid"
            class="px-4 pt-4 pb-4 text-sm"
            :class="index === filteredPoints.length - 1 ? `` : `border-b-[1px] border-[#3d3e43]`"
            @mousedown="clickFilteredItem(point)"
          >
            {{ point.name }}
          </div>
        </div>
      </div>
    </div>

    <!-- добавленные элементы в список -->
    <div v-auto-animate>
      <ItemTaskView
        v-for="[index, point] of taskItems.entries()"
        :key="point.uid"
        :index="index + 1"
        :point="point"
        @delete="deleteTaskItem"
        class="border-b-[1px] border-[#3d3e43]"
        :class="index === taskItems.length - 1 ? marginBottomLastItemTask : ``"
        :ref="(el) => { if (index === taskItems.length - 1) lastItemRef = el }" />
    </div>

    <div
      v-if="isVisibleSaveButton"
      @click="saveTasks"
      class="fixed start-0 end-0 bottom-0 z-10 mb-[80px] bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer"
      :class="isVisibleClearTaskButton ? 'mb-[130px]' : 'mb-[80px]'"
    >
      <span class="text-sm font-medium">{{ saveProgress ? 'Идет сохранение...' : 'Сохранить'
        }}</span>
    </div>

    <div
      v-if="isVisibleClearTaskButton"
      @click="clearTasks"
      class="fixed start-0 end-0 bottom-0 mb-[80px] z-10 bg-[#ff5b4d] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer"
    >
      <span class="text-sm font-medium">Удалить все задания</span>
    </div>
  </div>

</template>

<style scoped>

</style>
