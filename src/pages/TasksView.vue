<script setup lang="ts">
import { BackButton } from 'vue-tg'
import { useRouter } from 'vue-router'
import { computed, nextTick, onBeforeUnmount, onMounted, type Ref, ref, watch } from 'vue'
import { AdjustmentsHorizontalIcon } from '@heroicons/vue/24/outline'
import { PointResponse } from '@/model/PointResponse.ts'
import { useCache } from '@/composables/useCache.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { useTasksViewSettings } from '@/composables/useTasksViewSettings.ts'
import { createBackHandler } from '@/composables/useBackButton.ts'
import { useOptimalRoute } from '@/composables/useOptimalRoute.ts'
import SearchInputView from '@/components/SearchInputView.vue'
import { useInputFocus } from '@/store/TopAppBar.ts'
import { Routes as Route, TaskListSort, TaskTag, TypeSearchFilter } from '@/model/Enums.ts'
import ItemTaskView from '@/components/ItemTaskView.vue'
import TaskSkeletonCard from '@/components/TaskSkeletonCard.vue'
import BottomSheetView from '@/components/BottomSheetView.vue'
import TaskListViewSheet from '@/components/TaskListViewSheet.vue'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import LoadingScreen from '@/components/LoadingScreen.vue'
import ItemDropDown from '@/components/ItemDropDown.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useTaskPointsStore } from '@/store/TaskPoints.ts'
import { useNoteEditor } from '@/store/NoteEditor.ts'
import type { TaskPhoto, TaskPhotoView } from '@/model/TaskPhoto.ts'
import { ROUTE_START_POINT_UID } from '@/model/Route.ts'
import {
  addPhoto,
  deletePhoto,
  deletePhotosByUid,
  getAllPhotos,
  getPhotos,
  restorePhoto,
} from '@/utils/photoStorage.ts'

/** Группа заданий для отображения (при группировке по направлению) */
interface TaskGroup {
  key: string
  label: string
  points: PointResponse[]
  /** Индекс первой карточки группы в общем порядке отображения */
  startIndex: number
}

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
const { userSearchFilter, updateUserSearchFilter } = useSearchFilter()
const { getSettings: getViewSettings, saveSettings: saveViewSettings } = useTasksViewSettings()
const {
  points: routePoints,
  startPointId,
  optimalRoute,
  init: initOptimalRoute,
} = useOptimalRoute()
const taskPointsStore = useTaskPointsStore()

const isLoadingData = ref(false)
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

/** Контейнер списка заданий: нужен, чтобы найти карточку по uid */
const listRef = ref<HTMLElement | null>(null)

/** Шапка/панель поиска: по её реальной высоте считаем видимую часть списка */
const headerRef = ref<HTMLElement | null>(null)

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
let alignTimer: ReturnType<typeof setTimeout> | null = null

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
interface RemovedTask {
  point: PointResponse
  index: number
  completed: boolean
  tag?: TaskTag
  note?: string
}

/** Действие, которое можно отменить кнопкой в снакбаре */
interface UndoAction {
  /** Текст снакбара */
  message: string
  /** Возврат удалённого на прежнее место */
  restore: () => void | Promise<void>
  /** Что делать, если отмена не понадобилась (например, освободить фотографии задания) */
  finalize?: () => void | Promise<void>
}

/** Сколько держится возможность отмены удаления */
const UNDO_TIMEOUT = 4000

/** Последнее удаление, которое ещё можно отменить */
const undoAction = ref<UndoAction | null>(null)
let undoTimer: ReturnType<typeof setTimeout> | null = null

// --- Поиск точек для добавления в задания ---

/** Минимальная длина запроса: короче — поиск не запускаем */
const MIN_SEARCH_LENGTH = 2

/** Поле поиска: по названию / направлению / адресу (как на странице точек) */
const searchFilter = ref<TypeSearchFilter>(TypeSearchFilter.NAME)

const searchFilterOptions: { value: TypeSearchFilter; label: string }[] = [
  { value: TypeSearchFilter.NAME, label: 'Название' },
  { value: TypeSearchFilter.DIRECTION, label: 'Направление' },
  { value: TypeSearchFilter.ADDRESS, label: 'Адрес' },
]

/** uid заданий, уже добавленных в список: для перехода к карточке вместо повторного добавления */
const addedTaskUids = computed(() => new Set(taskItems.value.map((item) => item.uid)))

/** Запрос достаточной длины — только тогда показываем результаты */
const hasSearchQuery = computed(() => queryString.value.trim().length >= MIN_SEARCH_LENGTH)

/** Подсказка в поле поиска зависит от выбранного поля */
const searchPlaceholder = computed(() => {
  switch (searchFilter.value) {
    case TypeSearchFilter.DIRECTION:
      return 'Поиск по направлению...'
    case TypeSearchFilter.ADDRESS:
      return 'Поиск по адресу...'
    default:
      return 'Поиск по названию...'
  }
})

/** Значение точки, по которому идёт поиск */
const searchableValue = (point: PointResponse): string => {
  switch (searchFilter.value) {
    case TypeSearchFilter.DIRECTION:
      return point.direction
    case TypeSearchFilter.ADDRESS:
      return point.address
    default:
      return point.name
  }
}

const search = () => {
  const query = queryString.value.trim().toLowerCase()

  // Короткий запрос не ищем: иначе в подсказках оказывается почти весь список точек
  if (query.length < MIN_SEARCH_LENGTH) {
    filteredPoints.value = []
    return
  }

  filteredPoints.value = cachedPoints.value.filter((point) =>
    searchableValue(point).toLowerCase().includes(query),
  )
}

const handleFilterChange = (inputString: string) => {
  queryString.value = inputString
}

// Переключение поля поиска (название / направление / адрес)
const setSearchFilter = async (filter: TypeSearchFilter) => {
  if (searchFilter.value === filter) return

  searchFilter.value = filter
  await updateUserSearchFilter(filter)
  search()
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

// Удаление одной фотографии задания (с возможностью отмены)
const removeTaskPhoto = async (uid: string, photoId: string) => {
  const photos = taskPhotos.value[uid] ?? []
  const index = photos.findIndex((photo) => photo.id === photoId)
  const removed = photos[index]
  if (!removed) return

  // Скрываем фотографию сразу, чтобы просмотрщик не мигнул удалённым кадром
  revokePhotoUrls([removed])
  taskPhotos.value = { ...taskPhotos.value, [uid]: photos.filter((photo) => photo.id !== photoId) }

  // Предыдущее удаление стало окончательным
  await finishUndo()

  // Бинарник нужен для возврата: берём его из хранилища до удаления
  const stored = (await getPhotos(uid)).find((photo) => photo.id === photoId)

  try {
    await deletePhoto(photoId)
  } catch (e) {
    console.error(`Ошибка удаления фотографии задания в TasksView.vue: ${e}`)
  }

  // Данных для возврата нет — считаем удаление окончательным
  if (!stored) return

  showUndo({
    message: 'Фотография удалена',
    restore: () => restoreTaskPhoto(stored, index),
  })
}

/** Возврат удалённой фотографии задания на прежнее место (кнопка «Отменить») */
const restoreTaskPhoto = async (photo: TaskPhoto, index: number) => {
  try {
    const restored = toPhotoView(await restorePhoto(photo))
    const current = taskPhotos.value[photo.uid] ?? []
    const insertAt = Math.min(index, current.length)

    taskPhotos.value = {
      ...taskPhotos.value,
      [photo.uid]: [...current.slice(0, insertAt), restored, ...current.slice(insertAt)],
    }
  } catch (e) {
    console.error(`Ошибка восстановления фотографии задания в TasksView.vue: ${e}`)
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
  await finishUndo()

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

  // Снакбар с возможностью отмены: фотографии задания пока не освобождаем
  showUndo({
    message: `Задание «${removed.name}» удалено`,
    restore: () => restoreTaskItem({ point: removed, index, completed, tag, note }),
    finalize: () => purgeTaskPhotos(removed.uid),
  })
}

/** Скрывает снакбар отмены, не выполняя восстановления */
const clearUndo = () => {
  if (undoTimer) {
    clearTimeout(undoTimer)
    undoTimer = null
  }
  undoAction.value = null
}

/** Возможность отмены истекла: доводим удаление до конца (например, освобождаем фотографии) */
const finishUndo = async () => {
  const action = undoAction.value
  clearUndo()
  await action?.finalize?.()
}

/** Показывает снакбар отмены на время UNDO_TIMEOUT */
const showUndo = (action: UndoAction) => {
  clearUndo()
  undoAction.value = action

  undoTimer = setTimeout(() => {
    undoAction.value = null
    undoTimer = null
    void action.finalize?.()
  }, UNDO_TIMEOUT)
}

/** Отмена последнего удаления по кнопке в снакбаре */
const undoLastAction = async () => {
  const restore = undoAction.value?.restore
  clearUndo()
  await restore?.()
}

/** Возврат удалённого задания на прежнее место (кнопка «Отменить») */
const restoreTaskItem = async (snapshot: RemovedTask) => {
  const { point, index, completed, tag, note } = snapshot

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
// (порядок отображения может отличаться от порядка хранения — ищем по uid)
const requestDeleteTaskItem = (point: PointResponse) => {
  const index = taskItems.value.findIndex((item) => item.uid === point.uid)
  if (index === -1) return
  deleteTaskConfirm.value = { index, name: point.name }
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

  // Освобождаем объектные ссылки фотографий; их хранилище очистит removeItems()
  Object.values(taskPhotos.value).forEach(revokePhotoUrls)
  taskPhotos.value = {}

  await removeItems()
  taskPointsStore.savePoints([])
}

// Подтверждения удаления (задание, все задания) регистрируются сами:
// окно ConfirmDialog закрывается системной кнопкой «Назад» и Esc через useBackButton

/** Кнопка «Назад» в шапке (Telegram): закрывает открытый оверлей, затем уводит со страницы */
const handleBack = createBackHandler(() => router.back())

/** Зазор между карточкой и панелью поиска */
const PANEL_GAP = 12

/** Высота панели, закреплённой снизу (0, если поиск не активен) */
const bottomPanelHeight = () =>
  isSearchFocused.value ? (headerRef.value?.getBoundingClientRect().height ?? 0) : 0

/**
 * Прокрутка так, чтобы карточка была видна целиком.
 * При активном поиске панель снизу закрывает нижнюю часть списка,
 * поэтому карточку поднимаем выше панели, а не просто центрируем.
 */
const alignCardInList = (card: HTMLElement, behavior: ScrollBehavior = 'smooth') => {
  const container = listRef.value
  if (!container) return

  const panelHeight = bottomPanelHeight()

  // Панель поиска не мешает — центрируем карточку
  if (!panelHeight) {
    card.scrollIntoView({ behavior, block: 'center' })
    return
  }

  const containerRect = container.getBoundingClientRect()
  const cardRect = card.getBoundingClientRect()
  const visibleBottom = containerRect.bottom - panelHeight
  const delta = cardRect.bottom - visibleBottom + PANEL_GAP

  // Карточка уже целиком выше панели
  if (delta <= 0) return

  container.scrollTo({ top: container.scrollTop + delta, behavior })
}

/** Плавная прокрутка к карточке задания с подсветкой */
const scrollToTask = async (uid: string) => {
  await nextTick()

  const card = listRef.value?.querySelector<HTMLElement>(`[data-task-uid="${uid}"]`)
  if (!card) return

  flashTask(uid)
  alignCardInList(card)

  // После анимации и пересчёта высоты (клавиатура, отступы) позиция может «уехать» —
  // проверяем ещё раз, иначе карточка остаётся наполовину скрытой панелью
  if (alignTimer) clearTimeout(alignTimer)
  alignTimer = setTimeout(() => {
    alignTimer = null
    alignCardInList(card)
  }, 500)
}

// --- Вид списка: порядок, группировка по направлению, компактный режим ---

const listSort = ref<TaskListSort>(TaskListSort.ADDED)
const groupByDirection = ref(false)
const isCompactView = ref(false)
const viewSheetRef = ref<InstanceType<typeof BottomSheetView> | null>(null)
const isReorderingByRoute = ref(false)
const listMessage = ref('')
let listMessageTimer: ReturnType<typeof setTimeout> | null = null

/** Задания в порядке отображения (с учётом выбранного порядка) */
const displayedTasks = computed(() => {
  if (listSort.value === TaskListSort.ADDED) return taskItems.value

  const sorted = [...taskItems.value]
  if (listSort.value === TaskListSort.NAME_ASC) {
    sorted.sort((first, second) => first.name.localeCompare(second.name, 'ru'))
  } else {
    sorted.sort((first, second) => second.name.localeCompare(first.name, 'ru'))
  }
  return sorted
})

/** Группы заданий: одна общая или по направлениям (сначала собираем одно направление рядом) */
const displayedGroups = computed((): TaskGroup[] => {
  const tasks = [...displayedTasks.value]

  if (!groupByDirection.value) {
    return [{ key: 'all', label: '', points: tasks, startIndex: 0 }]
  }

  tasks.sort((first, second) => (first.direction ?? '').localeCompare(second.direction ?? '', 'ru'))

  const groups: TaskGroup[] = []
  let startIndex = 0

  tasks.forEach((task) => {
    const direction = task.direction?.trim() || 'Без направления'
    const lastGroup = groups[groups.length - 1]

    if (lastGroup && lastGroup.key === direction) {
      lastGroup.points.push(task)
    } else {
      groups.push({ key: direction, label: direction, points: [task], startIndex })
    }

    startIndex += 1
  })

  return groups
})

/** Короткое сообщение о результате действия (маршрут, ошибки) */
const showListMessage = (text: string, duration = 3200) => {
  listMessage.value = text
  if (listMessageTimer) clearTimeout(listMessageTimer)
  listMessageTimer = setTimeout(() => {
    listMessage.value = ''
    listMessageTimer = null
  }, duration)
}

const persistViewSettings = () =>
  saveViewSettings({
    sort: listSort.value,
    groupByDirection: groupByDirection.value,
    compact: isCompactView.value,
  })

const setListSort = (value: TaskListSort) => {
  listSort.value = value
  void persistViewSettings()
}

const setGroupByDirection = (value: boolean) => {
  groupByDirection.value = value
  void persistViewSettings()
}

const setCompactView = (value: boolean) => {
  isCompactView.value = value
  void persistViewSettings()
}

const openViewSheet = () => viewSheetRef.value?.openSheet()
const closeViewSheet = () => viewSheetRef.value?.closeSheet()

/**
 * Упорядочивает задания по кратчайшему маршруту.
 * Стартовая точка — первое задание в списке (как и на карте маршрута).
 */
const applyRouteOrder = async () => {
  if (taskItems.value.length < 2) {
    showListMessage('Для маршрута нужно минимум 2 задания')
    return
  }

  isReorderingByRoute.value = true

  try {
    routePoints.value = [...taskItems.value]

    // Старт — как на карте маршрута: базовая точка, если она есть среди заданий
    const routeStartTask = taskItems.value.find((task) => task.uid === ROUTE_START_POINT_UID)
    startPointId.value = (routeStartTask ?? taskItems.value[0]).uid
    await initOptimalRoute()

    const orderedRoute = optimalRoute.value
    if (orderedRoute.length !== taskItems.value.length) {
      showListMessage('Не удалось построить маршрут: проверьте координаты точек')
      return
    }

    const orderByUid = new Map(orderedRoute.map((point, index) => [point.uid, index]))
    taskItems.value = [...taskItems.value].sort(
      (first, second) => (orderByUid.get(first.uid) ?? 0) - (orderByUid.get(second.uid) ?? 0),
    )

    // Порядок списка теперь совпадает с маршрутом — показываем «как добавлено»
    const sortedByRoute = listSort.value !== TaskListSort.ADDED
    listSort.value = TaskListSort.ADDED

    await tasksLocalStorage.setItems(taskItems.value)
    taskPointsStore.savePoints(taskItems.value)

    showListMessage(
      sortedByRoute
        ? 'Порядок заданий обновлён по маршруту, порядок списка — «как добавлено»'
        : 'Порядок заданий обновлён по маршруту',
    )
  } catch (e) {
    console.error(`Ошибка построения маршрута в TasksView.vue: ${e}`)
    showListMessage('Не удалось построить маршрут')
  } finally {
    isReorderingByRoute.value = false
    await persistViewSettings()
    closeViewSheet()
  }
}

// Нажатие на элемент выпадающего списка найденных точек
const clickFilteredItem = async (point: PointResponse) => {
  if (!point) return

  // Точка уже добавлена: не дублируем, а показываем её карточку в списке
  if (addedTaskUids.value.has(point.uid)) {
    searchInputRef.value?.clear()
    searchInputRef.value?.blur()
    await scrollToTask(point.uid)
    return
  }

  taskItems.value.push(point)
  await tasksLocalStorage.setItems(taskItems.value)
  taskPointsStore.savePoints(taskItems.value)

  // Поле не теряет фокус, поэтому панель поиска остаётся снизу и можно
  // добавлять точки подряд; список плавно прокручивается к новой карточке
  searchInputRef.value?.clear()
  queryString.value = ''
  await scrollToTask(point.uid)
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
    searchFilter.value = await userSearchFilter()

    const viewSettings = await getViewSettings()
    listSort.value = viewSettings.sort
    groupByDirection.value = viewSettings.groupByDirection
    isCompactView.value = viewSettings.compact

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
  if (alignTimer) clearTimeout(alignTimer)
  if (listMessageTimer) clearTimeout(listMessageTimer)
  Object.values(taskPhotos.value).forEach(revokePhotoUrls)
})
</script>

<template>
  <BackButton @click="handleBack" />

  <!-- Подтверждение удаления всех заданий (работает на всех платформах) -->
  <ConfirmDialog
    :open="showDeleteAllConfirm"
    title="Удалить все задания?"
    message="Это действие нельзя отменить."
    @confirm="onDeleteAllConfirm(true)"
    @cancel="onDeleteAllConfirm(false)"
  />

  <!-- Подтверждение удаления одного задания -->
  <ConfirmDialog
    :open="deleteTaskConfirm !== null"
    title="Удалить задание?"
    :message="deleteTaskConfirm?.name"
    @confirm="confirmDeleteTaskItem"
    @cancel="cancelDeleteTaskItem"
  />

  <!-- Снакбар отмены удаления (над кнопкой «На карте») -->
  <Teleport to="body">
    <Transition name="snackbar">
      <div
        v-if="undoAction"
        role="status"
        aria-live="polite"
        class="fixed start-4 end-4 bottom-[var(--snackbar-offset)] z-[10002] flex items-center gap-2 justify-between bg-[#1e1e21] border border-[#333] text-sm rounded-xl ps-4 pe-1 py-1 shadow-2xl"
      >
        <span class="text-gray-300 truncate">{{ undoAction.message }}</span>
        <button
          type="button"
          class="shrink-0 min-h-11 rounded-lg px-3 text-[#3d7eff] font-medium cursor-pointer active:opacity-70"
          @click="undoLastAction"
        >
          Отменить
        </button>
      </div>
    </Transition>
  </Teleport>

  <!-- Короткое сообщение о результате действия (например, пересчёт порядка по маршруту) -->
  <Teleport to="body">
    <Transition name="snackbar">
      <div
        v-if="listMessage"
        role="status"
        aria-live="polite"
        class="fixed start-4 end-4 bottom-[var(--toast-offset)] z-[120] rounded-xl border border-[#333] bg-[#1e1e21] px-4 py-3 text-center text-sm text-gray-300 shadow-2xl"
      >
        {{ listMessage }}
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
      ref="headerRef"
      class="z-[110] bg-[#242528]"
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

        <!-- Вид списка: порядок, группировка по направлению, компактный режим, маршрут -->
        <button
          v-if="taskItems.length !== 0"
          type="button"
          class="absolute top-1/2 -translate-y-1/2 start-1 h-11 w-11 rounded-lg flex items-center justify-center text-[#999] active:text-[#ccc] active:bg-white/5 cursor-pointer"
          aria-label="Вид списка"
          @click="openViewSheet"
        >
          <AdjustmentsHorizontalIcon class="h-5 w-5" />
        </button>

        <button
          v-if="taskItems.length !== 0"
          type="button"
          class="absolute top-1/2 -translate-y-1/2 end-1 h-11 w-11 rounded-lg flex items-center justify-center text-red-400 active:text-red-500 active:bg-white/5 cursor-pointer"
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
        <!-- Поле поиска: название / направление / адрес -->
        <div v-if="isSearchFocused" class="flex items-center gap-1.5 px-4 pt-4">
          <button
            v-for="option in searchFilterOptions"
            :key="option.value"
            type="button"
            class="relative min-h-9 px-3 py-1.5 rounded-full border text-[10px] font-medium transition-colors cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 after:content-['']"
            :class="
              searchFilter === option.value
                ? 'bg-[#3d7eff] border-[#3d7eff] text-white'
                : 'border-[#3d3e43] text-[#999] active:opacity-70'
            "
            @mousedown.prevent
            @click="setSearchFilter(option.value)"
          >
            {{ option.label }}
          </button>
        </div>

        <SearchInputView
          ref="searchInputRef"
          :placeholder="searchPlaceholder"
          @focus-blur="handleInputFocusBlur"
          @filter-changed="handleFilterChange"
        />

        <!-- Результаты поиска (запрос не короче 2 символов) -->
        <div
          v-if="filteredPoints.length > 0"
          class="absolute z-[100] start-6 end-6 bg-black border border-gray-500 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          :class="isSearchFocused ? 'bottom-full' : 'top-full mt-[-16px]'"
        >
          <ItemDropDown
            v-for="[index, point] of filteredPoints.entries()"
            :key="point.uid"
            :dataPoint="point"
            :is-added-task-list="addedTaskUids.has(point.uid)"
            :class="{ 'border-b-[1px] border-[#3d3e43]': index !== filteredPoints.length - 1 }"
            @on-click="clickFilteredItem(point)"
          >
          </ItemDropDown>
        </div>

        <!-- Ничего не найдено -->
        <div
          v-else-if="hasSearchQuery"
          class="absolute z-[100] start-6 end-6 bg-black border border-gray-500 rounded-lg shadow-lg p-2 text-center text-sm text-gray-200"
          :class="isSearchFocused ? 'bottom-full' : 'top-full mt-[-16px]'"
        >
          Точки не найдены
        </div>

        <!-- Слишком короткий запрос: подсказываем, сколько символов нужно -->
        <div
          v-else-if="queryString.trim().length > 0"
          class="absolute z-[100] start-6 end-6 bg-black border border-gray-500 rounded-lg shadow-lg p-2 text-center text-xs text-[#999]"
          :class="isSearchFocused ? 'bottom-full' : 'top-full mt-[-16px]'"
        >
          Введите минимум {{ MIN_SEARCH_LENGTH }} символа
        </div>
      </div>
    </header>
    <!-- Скроллируемый список заданий -->
    <div
      ref="listRef"
      class="flex-1 min-h-0 overflow-y-auto overscroll-contain"
      :class="isSearchFocused ? 'pb-[var(--search-panel-list-offset)]' : 'pb-[var(--content-bottom-offset)]'"
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
      <!-- Добавленные элементы в список (с учётом выбранного порядка и группировки) -->
      <div v-else v-auto-animate>
        <template v-for="group in displayedGroups" :key="group.key">
          <!-- Заголовок группы направлений -->
          <div
            v-if="groupByDirection"
            class="mx-4 mt-3 mb-1 inline-block rounded-lg bg-[#2a2a2e] px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#9aa0a6]"
          >
            {{ group.label }} — {{ group.points.length }}
          </div>

          <!--
            Обёртка нужна по двум причинам: ItemTaskView имеет несколько корневых
            узлов (карточка + Teleport + просмотрщик фото), поэтому :class на него
            не попадает, а класс подсветки должен быть на прямом потомке
            v-auto-animate — именно его анимирует библиотека при вставке.
          -->
          <div
            v-for="(task, groupIndex) in group.points"
            :key="task.uid"
            :data-task-uid="task.uid"
            class="rounded-xl transition-colors duration-300"
            :class="flashUid === task.uid ? 'bg-[#3d7eff]/10 ring-2 ring-[#3d7eff] animate-pulse' : ''"
          >
            <ItemTaskView
              :point="task"
              :index="group.startIndex + groupIndex"
              :total="displayedTasks.length"
              :is-completed="completedTaskIds.includes(task.uid)"
              :tag="taskTags[task.uid]"
              :note="taskNotes[task.uid]"
              :photos="taskPhotos[task.uid]"
              :compact="isCompactView"
              @delete="requestDeleteTaskItem(task)"
              @toggle-completed="toggleTaskCompleted(task.uid, $event)"
              @select-tag="toggleTaskTag(task.uid, $event)"
              @update-note="saveTaskNote(task.uid, $event)"
              @delete-note="deleteTaskNote(task.uid)"
              @add-photos="addTaskPhotos(task.uid, $event)"
              @remove-photo="removeTaskPhoto(task.uid, $event)"
            />
          </div>
        </template>
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

  <!-- Вид списка: порядок, группировка по направлению, компактный режим, порядок по маршруту -->
  <BottomSheetView ref="viewSheetRef">
    <TaskListViewSheet
      :sort="listSort"
      :group-by-direction="groupByDirection"
      :compact="isCompactView"
      :is-reordering="isReorderingByRoute"
      :can-reorder-by-route="taskItems.length >= 2"
      @update:sort="setListSort"
      @update:group-by-direction="setGroupByDirection"
      @update:compact="setCompactView"
      @apply-route-order="applyRouteOrder"
    />
  </BottomSheetView>
</template>

<style scoped>
.snackbar-enter-active,
.snackbar-leave-active {
  transition: opacity 0.2s ease;
}
.snackbar-enter-from,
.snackbar-leave-to {
  opacity: 0;
}
</style>
