<script setup lang="ts">

import { BackButton } from 'vue-tg'
import { useCloudStorage, usePopup } from 'vue-tg/8.0'
import { useRouter } from 'vue-router'
import { computed, onMounted, ref, watch } from 'vue'
import ItemTaskView from '@/components/ItemTaskView.vue'
import { useObtainPoints } from '../../store/Point.ts'
import { PointResponse } from '@/model/PointResponse.ts'
import { useUpdatedTaskList } from '../../store/TasksList.ts'
import { CloudStorageNames } from '@/model/CloudStorageNames.ts'
import { useInputFocus } from '../../store/TopAppBar.ts'

/*const fakeTaskItems = useFakeTaskItems()*/

const router = useRouter()

const tgCloudStorage = useCloudStorage()

const popup = usePopup()

const obtainPointsStore = useObtainPoints()
const updatedTaskListStore = useUpdatedTaskList()
const inputFocus = useInputFocus()

const saveProgress = ref(false)

const taskItems = ref([] as PointResponse[])

const queryString = ref('')

const filteredPoints = ref([] as PointResponse[])

const isVisibleSaveButton = computed(() => updatedTaskListStore.isUpdated && !inputFocus.isFocused)
const isVisibleClearTaskButton = computed(() => taskItems.value.length !== 0 && !inputFocus.isFocused)

const search = () => {
  filteredPoints.value = obtainPointsStore.points.filter(point =>
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
    await popup.showAlert('Данные успешно сохранены в облако!')
  } catch (error) {
    await popup.showAlert(`Не удалось сохранить данные: ${error}`)
  }
}

async function loadFromCloudStorage() {
  try {
    const data = await tgCloudStorage.getItem(CloudStorageNames.TASK_ITEMS)
    const result: PointResponse[] = data ? JSON.parse(data) : []
    taskItems.value.push(...result)

    updatedTaskListStore.updateList(false)
    await popup.showAlert('Данные загружены')
  } catch (error) {
    await popup.showAlert(`Не удалось загрузить данные: ${error}`)
    taskItems.value = []
  }
}

/*function deleteFromCloudStorage(): boolean {
  let response = false

  tgCloudStorage.removeItem(CloudStorageNames.TASK_ITEMS)
    .then(result => {
      response = result
      console.log('Даныне удалены')
    })
    .then(error => {
      console.log(`Ошибка удаления: ${error}`)
    })

  return response
}*/

const saveTasks = async () => {
  saveProgress.value = true
  await saveToCloudStorage(taskItems.value)
  saveProgress.value = false
}

const clearTasks = () => taskItems.value.splice(0, taskItems.value.length)

watch(queryString, () => search())

onMounted(async () => {
  await loadFromCloudStorage()

  /*if (fakeTaskItems.items !== '') {
    const items = obtainTaskItemsFromFakeStore()
    taskItems.value.push(...items)
  }*/
})

/*const save = () => {
  saveProgress.value = true

  const taskItemsToStringJson = JSON.stringify(taskItems.value)

  fakeTaskItems.addAll(taskItemsToStringJson)
  updatedTaskListStore.updateList(false)

  saveProgress.value = false
}

function obtainTaskItemsFromFakeStore(): PointResponse[]  {
  if (fakeTaskItems.items !== '') {
    return JSON.parse(fakeTaskItems.items) as PointResponse[]
  } else return [] as PointResponse[]
}*/

</script>

<template>
  <BackButton @click="router.back" />

  <div class="fixed overflow-auto start-0 top-0 end-0 bottom-0 w-full h-full body bg-[#242528]">
    <p class="text-center text-[#ccc] text-2xl mt-4"><strong>Мои задания</strong></p>

    <ItemTaskView @focus-blur="handleInputFocusBlur" @filter-changed="handleFilterChange" />
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

    <div v-auto-animate>
      <ItemTaskView
        v-for="[index, point] of taskItems.entries()"
        :key="point.uid"
        :index="index + 1"
        :point="point"
        @delete="deleteTaskItem"
        :class="index === taskItems.length - 1 ? `mb-[70px]` : `border-b-[1px] border-[#3d3e43]`" />
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
