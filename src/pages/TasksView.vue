<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { computed, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import SearchInputView from '@/components/SearchInputView.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { Routes as Route, TaskTag } from '@/model/Enums.ts'
import ItemTaskView from '@/components/ItemTaskView.vue'
import TaskSkeletonCard from '@/components/TaskSkeletonCard.vue'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ItemDropDown from '@/components/ItemDropDown.vue'
import { useTaskPointsStore } from '@/store/TaskPoints.ts'
import { useNoteEditor } from '@/store/NoteEditor.ts'
import type { TaskPhoto, TaskPhotoView } from '@/model/TaskPhoto.ts'
import { addPhoto, deletePhoto, deletePhotosByUid, getAllPhotos } from '@/utils/photoStorage.ts'

const router = useRouter()
const tasksLocalStorage = useTasksLocalStorage()
const {
  getCompletedTasks,
  setCompletedTask,
  getTaskTags,
  setTaskTag,
  getTaskNotes,
  setTaskNote,
  removeItems,
} = tasksLocalStorage
const inputFocus = useInputFocus()
const noteEditorStore = useNoteEditor()
const { obtainCachedPoints } = useCache()
const taskPointsStore = useTaskPointsStore()

const isLoadingData = ref(false)
const lastItemRef = ref()
const taskItems: Ref<PointResponse[]> = ref([])
const completedTaskIds = ref<string[]>([])
const taskTags = ref<Record<string, TaskTag>>({})
const taskNotes = ref<Record<string, string>>({})
const queryString = ref('')
const filteredPoints = ref([] as PointResponse[])
const cachedPoints = ref<PointResponse[]>([])

/** Прикреплённые к заданиям фотографии: uid задания → фотографии для отображения */
const taskPhotos = ref<Record<string, TaskPhotoView[]>>({})

// --- Каркас страницы: поиск, загрузка, подсветка нового задания ---

/** Поиск в фокусе: шапка превращается в нижнюю панель над клавиатурой */
const isSearchFocused = computed(() => inputFocus.isFocused)

/** Ссылка на поле поиска: нужна, чтобы вернуть шапку наверх («Готово») */
const searchInputRef = ref<InstanceType<typeof SearchInputView> | null>(null)

/**
 * Скелетоны и оверлей загрузки показываем только при затянувшейся загрузке:
 * чтение из локального хранилища занимает миллисекунды, и мигание
 * плейсхолдеров выглядит хуже, чем сразу появившийся список.
 */
const showListSkeleton = ref(false)
const isSlowLoading = ref(false)
let skeletonTimer: ReturnType<typeof setTimeout> | null = null
let slowLoadingTimer: ReturnType<typeof setTimeout> | null = null

watch(isLoadingData, (loading) => {
  if (skeletonTimer) {
    clearTimeout(skeletonTimer)
    skeletonTimer = null
  }
  if (slowLoadingTimer) {
    clearTimeout(slowLoadingTimer)
    slowLoadingTimer = null
  }

  if (!loading) {
    showListSkeleton.value = false
    isSlowLoading.value = false
    return
  }

  skeletonTimer = setTimeout(() => {
    showListSkeleton.value = true
  }, 200)

  slowLoadingTimer = setTimeout(() => {
    isSlowLoading.value = true
  }, 900)
})

/**
 * Задание, которое только что добавили: короткая подсветка карточки.
 * Длительность больше цикла animate-pulse (2 с), чтобы после анимации
 * появления auto-animate мигание успело быть заметным.
 */
const flashUid = ref<string | null>(null)
let flashTimer: ReturnType<typeof setTimeout> | null = null

const flashTask = (uid: string) => {
  flashUid.value = uid
  if (flashTimer) clearTimeout(flashTimer)
  flashTimer = setTimeout(() => {
    flashUid.value = null
    flashTimer = null
  }, 2000)
}

const isVisibleTaskMapButton = computed(
  () => taskItems.value.length !== 0 && !inputFocus.isFocused && !noteEditorStore.isEditing,
)

// Количество выполненных заданий (только среди текущего списка)
const completedCount = computed(() =>
  completedTaskIds.value.filter((uid) => taskItems.value.some((item) => item.uid === uid)).length,
)

// Процент выполнения заданий
const progressPercent = computed(() => {
  if (taskItems.value.length === 0) return 0
  return Math.round((completedCount.value / taskItems.value.length) * 100)
})

// Состояние подтверждения удаления всех заданий
const showDeleteAllConfirm = ref(false)

// Состояние подтверждения удаления одного задания
const deleteTaskConfirm = ref<{ index: number; name: string } | null>(null)

// Снимок удалённого задания для возможности отмены
const undoDelete = ref<{
  point: PointResponse
  index: number
  completed: boolean
  tag?: TaskTag
  note?: string
} | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | null = null

const search = () => {
  filteredPoints.value = cachedPoints.value.filter((point) =>
    point.name.toLowerCase().includes(queryString.value.toLowerCase().trim()),
  )

  if (queryString.value === '') filteredPoints.value.splice(0, filteredPoints.value.length)
}

const handleFilterChange = (inputString: string) => {
  queryString.value = inputString
}

// --- Фотографии заданий ---

// Подготовка фотографии к отображению (objectURL нужно освобождать вручную)
const toPhotoView = (photo: TaskPhoto): TaskPhotoView => ({
  id: photo.id,
  createdAt: photo.createdAt,
  url: URL.createObjectURL(photo.blob),
})

// Освобождение объектных ссылок (вызывается при удалении фотографий и размонтировании)
const revokePhotoUrls = (photos: TaskPhotoView[]) => {
  photos.forEach((photo) => URL.revokeObjectURL(photo.url))
}

// Добавление фотографий к заданию (сжатие уже выполнено в галерее задания)
const addTaskPhotos = async (uid: string, blobs: Blob[]) => {
  if (!blobs.length) return

  try {
    const addedPhotos: TaskPhotoView[] = []
    for (const blob of blobs) {
      addedPhotos.push(toPhotoView(await addPhoto(uid, blob)))
    }
    taskPhotos.value = {
      ...taskPhotos.value,
      [uid]: [...(taskPhotos.value[uid] ?? []), ...addedPhotos],
    }
  } catch (e) {
    console.error(`Ошибка добавления фотографий задания в TasksView.vue: ${e}`)
  }
}

// Удаление одной фотографии задания
const removeTaskPhoto = async (uid: string, photoId: string) => {
  const photos = taskPhotos.value[uid] ?? []
  revokePhotoUrls(photos.filter((photo) => photo.id === photoId))
  taskPhotos.value = { ...taskPhotos.value, [uid]: photos.filter((photo) => photo.id !== photoId) }

  try {
    await deletePhoto(photoId)
  } catch (e) {
    console.error(`Ошибка удаления фотографии задания в TasksView.vue: ${e}`)
  }
}

// Полное удаление фотографий задания (когда удаление задания уже нельзя отменить)
const purgeTaskPhotos = async (uid: string) => {
  revokePhotoUrls(taskPhotos.value[uid] ?? [])

  const restPhotos = { ...taskPhotos.value }
  delete restPhotos[uid]
  taskPhotos.value = restPhotos

  try {
    await deletePhotosByUid(uid)
  } catch (e) {
    console.error(`Ошибка очистки фотографий задания в TasksView.vue: ${e}`)
  }
}

// Удаление элемента-задачи из массива добавленных задач
const deleteTaskItem = async (index: number) => {
  const removed = taskItems.value[index]
  if (!removed) return

  // Предыдущее удаление стало окончательным — освобождаем его фотографии
  if (undoDelete.value) await purgeTaskPhotos(undoDelete.value.point.uid)

  // Фиксируем снимок для возможной отмены удаления
  const completed = completedTaskIds.value.includes(removed.uid)
  const tag = taskTags.value[removed.uid]
  const note = taskNotes.value[removed.uid]

  taskItems.value.splice(index, 1)
  completedTaskIds.value = completedTaskIds.value.filter((uid) => uid !== removed.uid)
  await setCompletedTask(removed.uid, false)

  const { [removed.uid]: _removedTag, ...restTags } = taskTags.value
  taskTags.value = restTags
  await setTaskTag(removed.uid, null)

  const { [removed.uid]: _removedNote, ...restNotes } = taskNotes.value
  taskNotes.value = restNotes
  await setTaskNote(removed.uid, null)

  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)

  // Показываем снакбар с возможностью отмены
  const removedUid = removed.uid
  undoDelete.value = { point: removed, index, completed, tag, note }
  if (undoTimer) clearTimeout(undoTimer)
  undoTimer = setTimeout(() => {
    undoDelete.value = null
    undoTimer = null
    // Отмены не произошло — фотографии задания удаляем окончательно
    void purgeTaskPhotos(removedUid)
  }, 4000)
}

const clearUndo = () => {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  undoDelete.value = null
}

const undoDeleteItem = async () => {
  if (!undoDelete.value) return
  const { point, index, completed, tag, note } = undoDelete.value
  clearUndo()

  const insertAt = Math.min(index, taskItems.value.length)
  taskItems.value.splice(insertAt, 0, point)

  if (completed) {
    completedTaskIds.value = Array.from(new Set([...completedTaskIds.value, point.uid]))
    await setCompletedTask(point.uid, true)
  }
  if (tag) {
    taskTags.value = { ...taskTags.value, [point.uid]: tag }
    await setTaskTag(point.uid, tag)
  }
  if (note) {
    taskNotes.value = { ...taskNotes.value, [point.uid]: note }
    await setTaskNote(point.uid, note)
  }

  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)
}

// Запрос подтверждения удаления одного задания
const requestDeleteTaskItem = (index: number) => {
  const item = taskItems.value[index]
  if (!item) return
  deleteTaskConfirm.value = { index, name: item.name }
}

const confirmDeleteTaskItem = async () => {
  if (!deleteTaskConfirm.value) return
  const { index } = deleteTaskConfirm.value
  deleteTaskConfirm.value = null
  await deleteTaskItem(index)
}

const cancelDeleteTaskItem = () => {
  deleteTaskConfirm.value = null
}

// Переключение статуса «выполнено» для задачи
const toggleTaskCompleted = async (uid: string, completed: boolean) => {
  if (completed) {
    completedTaskIds.value = Array.from(new Set([...completedTaskIds.value, uid]))
  } else {
    completedTaskIds.value = completedTaskIds.value.filter((item) => item !== uid)
  }
  await setCompletedTask(uid, completed)
}

// Переключение тэга задачи (Освещение / Камеры / Другое)
const toggleTaskTag = async (uid: string, tag: TaskTag) => {
  const current = taskTags.value[uid]
  const next = current === tag ? null : tag

  if (next) {
    taskTags.value = { ...taskTags.value, [uid]: next }
  } else {
    const { [uid]: _removedTag, ...restTags } = taskTags.value
    taskTags.value = restTags
  }
  await setTaskTag(uid, next)
}

// Сохранение заметки задачи
const saveTaskNote = async (uid: string, note: string) => {
  taskNotes.value = { ...taskNotes.value, [uid]: note }
  await setTaskNote(uid, note)
}

// Удаление заметки задачи
const deleteTaskNote = async (uid: string) => {
  const { [uid]: _removedNote, ...restNotes } = taskNotes.value
  taskNotes.value = restNotes
  await setTaskNote(uid, null)
}

// Запрос подтверждения на удаление всех заданий
const deleteAllTasks = () => {
  showDeleteAllConfirm.value = true
}

// Обработка результата подтверждения удаления всех заданий
const onDeleteAllConfirm = async (confirmed: boolean) => {
  showDeleteAllConfirm.value = false
  if (!confirmed) return

  clearUndo()
  taskItems.value = []
  completedTaskIds.value = []
  taskTags.value = {}
  taskNotes.value = {}
  lastItemRef.value = null

  // Освобождаем объектные ссылки фотографий; их хранилище очистит removeItems()
  Object.values(taskPhotos.value).forEach(revokePhotoUrls)
  taskPhotos.value = {}

  await removeItems()
  taskPointsStore.savePoints([])
}

// Нажатие на элемент выпадающего списка найденных элементов point
const clickFilteredItem = async (point: PointResponse) => {
  if (!point) return

  taskItems.value.push(point)
  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)

  // Подсвечиваем новую карточку, чтобы было видно, что именно добавилось
  flashTask(point.uid)

  // Пока открыт поиск, список перекрыт нижней панелью и клавиатурой:
  // не скроллим — пользователь, скорее всего, добавляет ещё точки
  if (!isSearchFocused.value && lastItemRef.value) {
    lastItemRef.value.$el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  queryString.value = ''
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
    completedTaskIds.value = await getCompletedTasks()
    taskTags.value = await getTaskTags()
    taskNotes.value = await getTaskNotes()
    taskPointsStore.savePoints(taskItems.value)

    // Загружаем фотографии заданий и удаляем те, чьи задания уже убраны из списка
    const storedPhotos = await getAllPhotos()
    const existingUids = new Set(taskItems.value.map((item) => item.uid))
    const groupedPhotos: Record<string, TaskPhotoView[]> = {}
    const orphanUids = new Set<string>()

    storedPhotos.forEach((photo) => {
      if (!existingUids.has(photo.uid)) {
        orphanUids.add(photo.uid)
        return
      }
      if (!groupedPhotos[photo.uid]) groupedPhotos[photo.uid] = []
      groupedPhotos[photo.uid].push(toPhotoView(photo))
    })

    taskPhotos.value = groupedPhotos
    await Promise.all(Array.from(orphanUids).map((uid) => deletePhotosByUid(uid)))

    await obtainCachedPoints().then((cachedDataPoints) => {
      cachedPoints.value = cachedDataPoints
    })
  } catch (e) {
    console.error(`Ошибка PointsView.vue в onMounted catch: ${e}`)
  } finally {
    isLoadingData.value = false
  }
})

onBeforeUnmount(() => {
  if (undoTimer) clearTimeout(undoTimer)
  if (skeletonTimer) clearTimeout(skeletonTimer)
  if (slowLoadingTimer) clearTimeout(slowLoadingTimer)
  if (flashTimer) clearTimeout(flashTimer)
  Object.values(taskPhotos.value).forEach(revokePhotoUrls)
})

function isAddedTaskList(item: PointResponse): boolean {
  if (taskItems.value.length !== 0) {
    return taskItems.value.map((item) => item.name).includes(item.name)
  } else return false
}
</script>

<template>
  <BackButton @click="router.back" />

  <!-- Подтверждение удаления всех заданий (работает на всех платформах) -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showDeleteAllConfirm" class="fixed inset-0 z-[9999]">
        <div class="absolute inset-0 bg-black/60" @click="onDeleteAllConfirm(false)"></div>

        <div
          class="modal-content absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]"
        >
          <h2 class="text-lg font-bold text-white mb-2 text-center">Удалить все задания?</h2>
          <p class="text-gray-400 text-sm text-center mb-5">Это действие нельзя отменить.</p>

          <button
            @click="onDeleteAllConfirm(true)"
            class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
          >
            Удалить
          </button>
          <button
            @click="onDeleteAllConfirm(false)"
            class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Подтверждение удаления одного задания -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="deleteTaskConfirm" class="fixed inset-0 z-[9999]">
        <div class="absolute inset-0 bg-black/60" @click="cancelDeleteTaskItem"></div>

        <div
          class="modal-content absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]"
        >
          <h2 class="text-lg font-bold text-white mb-2 text-center">Удалить задание?</h2>
          <p class="text-gray-400 text-sm text-center mb-5 break-words">{{ deleteTaskConfirm?.name }}</p>

          <button
            @click="confirmDeleteTaskItem"
            class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
          >
            Удалить
          </button>
          <button
            @click="cancelDeleteTaskItem"
            class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Снакбар отмены удаления (над кнопкой «На карте») -->
  <Teleport to="body">
    <Transition name="snackbar">
      <div
        v-if="undoDelete"
        role="status"
        aria-live="polite"
        class="fixed start-4 end-4 bottom-[var(--snackbar-offset)] z-[120] flex items-center gap-3 justify-between bg-[#1e1e21] border border-[#333] text-sm rounded-xl px-4 py-3 shadow-2xl cursor-pointer active:opacity-80"
        @click="undoDeleteItem"
      >
        <span class="text-gray-300 truncate">Задание «{{ undoDelete.point.name }}» удалено</span>
        <span class="text-[#3d7eff] font-medium shrink-0">Отменить</span>
      </div>
    </Transition>
  </Teleport>

  <!-- Оверлей загрузки: только при реально долгой загрузке (иначе — скелетоны) -->
  <LoadingScreen :is-loading="isSlowLoading" />

  <!-- Каркас страницы: шапка не скроллится, список скроллится -->
  <div class="fixed inset-0 flex flex-col bg-[#242528]">
    <!--
      Шапка. При фокусе поиска становится нижней панелью над клавиатурой,
      а заголовок и прогресс скрываются. DOM-порядок не меняется,
      поэтому фокус и каретка в поле поиска сохраняются.
    -->
    <header
      class="z-50 bg-[#242528]"
      :class="
        isSearchFocused
          ? 'fixed start-0 end-0 bottom-0 border-t border-[#3d3e43] pb-[var(--safe-bottom)]'
          : 'shrink-0 border-b border-[#3d3e43] pt-[var(--safe-top)]'
      "
    >
      <!-- Заголовок -->
      <div v-show="!isSearchFocused" class="relative mt-4 px-4">
        <p class="text-center text-[#ccc] text-2xl">
          <strong>Мои задания ({{ taskPointsStore.points.length }})</strong>
        </p>

        <button
          v-if="taskItems.length !== 0"
          type="button"
          class="absolute top-1/2 -translate-y-1/2 end-4 text-red-400 active:text-red-500 cursor-pointer"
          aria-label="Удалить все задания"
          @click="deleteAllTasks"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
          </svg>
        </button>
      </div>

      <!-- Прогресс выполнения -->
      <div v-show="!isSearchFocused && taskItems.length !== 0" class="px-4 mt-2">
        <div class="flex items-center justify-between text-xs text-[#999] mb-1">
          <span>Выполнено {{ completedCount }} из {{ taskItems.length }}</span>
          <span>{{ progressPercent }}%</span>
        </div>
        <div class="h-1.5 w-full rounded-full bg-[#3d3e43] overflow-hidden">
          <div
            class="h-full bg-[#5fb336] rounded-full transition-all duration-300"
            :style="{ width: progressPercent + '%' }"
          ></div>
        </div>
      </div>

      <!-- Поиск точки: подсказки открываются вверх, когда поле закреплено снизу -->
      <div class="relative z-[100]">
        <SearchInputView
          ref="searchInputRef"
          @focus-blur="handleInputFocusBlur"
          @filter-changed="handleFilterChange"
        />

        <!-- Результаты поиска -->
        <div
          v-if="filteredPoints.length > 0"
          class="absolute z-[100] start-6 end-6 bg-black border border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          :class="isSearchFocused ? 'bottom-full mb-[-16px]' : 'top-full mt-[-16px]'"
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

        <!-- Ничего не найдено -->
        <div
          v-if="queryString && filteredPoints.length === 0"
          class="absolute z-[100] start-6 end-6 bg-black border border-gray-500 rounded-lg shadow-lg p-2 text-center text-sm text-gray-200"
          :class="isSearchFocused ? 'bottom-full mb-[-16px]' : 'top-full mt-[-16px]'"
        >
          Точки не найдены
        </div>
      </div>
    </header>
    <!-- Скроллируемый список заданий -->
    <div
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      :class="isSearchFocused ? 'pb-[var(--search-panel-offset)]' : 'pb-[var(--content-bottom-offset)]'"
    >
      <!-- Скелетоны: только если загрузка длится дольше 200 мс -->
      <div v-if="showListSkeleton" class="pt-2" aria-hidden="true">
        <TaskSkeletonCard v-for="n in 3" :key="`skeleton-${n}`" />
      </div>

      <!-- Пустое состояние (показывается только после загрузки) -->
      <div
        v-else-if="!isLoadingData && taskItems.length === 0"
        class="min-h-full flex flex-col items-center justify-center gap-3 text-center px-8 py-16"
      >
        <div class="w-16 h-16 rounded-full bg-[#2a2a2e] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[#3d7eff]" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h168q13-36 43.5-58t68.5-22q38 0 68.5 22t43.5 58h168q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm80-80h280v-80H280v80Zm0-160h400v-80H280v80Zm0-160h400v-80H280v80Zm200-190q13 0 21.5-8.5T510-820q0-13-8.5-21.5T480-850q-13 0-21.5 8.5T450-820q0 13 8.5 21.5T480-790ZM200-200v-560 560Z"/>
          </svg>
        </div>
        <p class="text-xl text-[#F0F0F0] font-medium">Нет заданий</p>
        <p class="text-sm text-[#999] max-w-[260px]">Добавьте точки через поиск сверху, чтобы построить маршрут</p>
      </div>
      <!-- Добавленные элементы в список -->
      <div v-else v-auto-animate>
        <!--
          Обёртка нужна по двум причинам: ItemTaskView имеет несколько корневых
          узлов (карточка + Teleport + просмотрщик фото), поэтому :class на него
          не попадает, а класс подсветки должен быть на прямом потомке
          v-auto-animate — именно его анимирует библиотека при вставке.
        -->
        <div
          v-for="[index, point] of taskItems.entries()"
          :key="point.uid"
          class="rounded-xl transition-colors duration-300"
          :class="flashUid === point.uid ? 'bg-[#3d7eff]/10 ring-2 ring-[#3d7eff] animate-pulse' : ''"
        >
          <ItemTaskView
            :index="index"
            :task-items="taskItems"
            :is-completed="completedTaskIds.includes(point.uid)"
            :tag="taskTags[point.uid]"
            :note="taskNotes[point.uid]"
            :photos="taskPhotos[point.uid]"
            @delete="requestDeleteTaskItem"
            @toggle-completed="toggleTaskCompleted(point.uid, $event)"
            @select-tag="toggleTaskTag(point.uid, $event)"
            @update-note="saveTaskNote(point.uid, $event)"
            @delete-note="deleteTaskNote(point.uid)"
            @add-photos="addTaskPhotos(point.uid, $event)"
            @remove-photo="removeTaskPhoto(point.uid, $event)"
            :ref="
              (el) => {
                if (index === taskItems.length - 1) lastItemRef = el
              }
            "
          />
        </div>
      </div>
    </div>

    <!-- Кнопка «На карте»: отступ считается от нижнего меню + safe-area -->
    <button
      v-if="isVisibleTaskMapButton"
      type="button"
      class="fixed start-0 end-0 bottom-[var(--bottom-nav-offset)] z-100 mx-4 h-11 rounded-xl bg-[#3d7eff] flex items-center justify-center transition-colors active:opacity-50 cursor-pointer"
      aria-label="Открыть маршрут на карте"
      @click="router.push(Route.TaskMap)"
    >
      <span class="text-sm font-medium">На карте</span>
    </button>
  </div>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: scale 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  scale: 0.95;
}

.snackbar-enter-active,
.snackbar-leave-active {
  transition: opacity 0.2s ease;
}
.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
}
</style>
