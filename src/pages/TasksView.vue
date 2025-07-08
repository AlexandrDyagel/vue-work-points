<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { computed, inject, onMounted, ref, type Ref, watch, watchPostEffect } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import SearchInputView from '@/components/SearchInputView.vue'
import { useCloudStorage } from 'vue-tg/8.0'
import { useUpdatedTaskList } from '@/store/TasksList.ts'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { CloudStorageNames } from '@/model/Enums.ts'
import ItemTaskView from '@/components/ItemTaskView.vue'

const router = useRouter()

const tgCloudStorage = useCloudStorage()

const updatedTaskListStore = useUpdatedTaskList()
const inputFocus = useInputFocus()

const lastItemRef = ref()

const saveProgress = ref(false)

const taskItems = ref([] as PointResponse[])

const queryString = ref('')

const filteredPoints = ref([] as PointResponse[])

const isLoadingData = inject<Ref<boolean>>('isLoadingData') || ref(true)

const { obtainCachedPoints } = useCache()

const cachedPoints = ref<PointResponse[]>([])

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
    class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full bg-[#242528]">

     <span v-if="taskItems.length === 0"
           class="absolute w-screen h-screen flex justify-center items-center text-2xl text-[#F0F0F0]">{{ emptyElements
       }}
    </span>

    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания</strong></p>
    <div class="sticky bg-[#242528] top-0 start-0 end-0 border-b-[1px] border-[#3d3e43] z-50">

      <div>
        <!-- строка поиска -->
        <SearchInputView @focus-blur="handleInputFocusBlur" @filter-changed="handleFilterChange" />

        <!-- выпадающий список поиска -->
        <div v-auto-animate v-if="filteredPoints.length !== 0"
             class="absolute bg-[#17212B] overflow-auto mt-[-16px] mx-6 shadow-xl z-50">
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
        :index="index"
        :task-items="taskItems"
        @delete="deleteTaskItem"
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


  <!--  <p>Карта</p>

    <div class="bg-[#242528] min-h-screen py-8">
      <div class="max-w-md mx-auto rounded-lg overflow-hidden">
        <ul>
          <li
            v-for="(point, index) in cachedPoints"
            :key="index"
            class="relative py-5 px-6"
            @click="indexClicked = index"
          >
            &lt;!&ndash; Дорожка &ndash;&gt;
            <div :class="path(index)"></div>

            &lt;!&ndash; Точка на дорожке &ndash;&gt;
            <div
              class="absolute left-8 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-white z-10"
              :class="{ 'animate-pulse-custom': index === indexClicked }"
              style="box-shadow: 0 0 0 2px #3b82f6;"
            ></div>

            &lt;!&ndash; Информация о точке point &ndash;&gt;
            <div class="ml-10">
              <div class="font-bold text-[#F0F0F0]">{{ point.name }}</div>
              <div class="text-sm text-[#999]">{{ point.direction }}</div>
            </div>
          </li>
        </ul>
      </div>
    </div>-->
</template>

<style scoped>
</style>
