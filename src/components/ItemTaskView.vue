<script setup lang="ts">
import { PointResponse } from '@/model/PointResponse.ts'
import { TaskTag } from '@/model/Enums.ts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { PhotoIcon } from '@heroicons/vue/24/outline'
import { useNoteEditor } from '@/store/NoteEditor.ts'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'
import TaskPhotoGallery from '@/components/TaskPhotoGallery.vue'
import PhotoViewer from '@/components/PhotoViewer.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import TaskActionsRail from '@/components/TaskActionsRail.vue'
import TaskShareSheet from '@/components/TaskShareSheet.vue'
import { useBackDismiss } from '@/composables/useBackButton.ts'

interface TagOption {
  value: TaskTag
  label: string
  activeClass: string
}

const tagOptions: TagOption[] = [
  { value: TaskTag.LIGHTING, label: 'Освещение', activeClass: 'bg-amber-500 border-amber-500 text-black' },
  { value: TaskTag.CAMERAS, label: 'Камеры', activeClass: 'bg-blue-500 border-blue-500 text-white' },
  { value: TaskTag.OTHER, label: 'Другое', activeClass: 'bg-purple-500 border-purple-500 text-white' },
]

const props = defineProps<{
  /** Точка-задание */
  point: PointResponse
  /** Позиция в отображаемом списке (для таймлайна) */
  index: number
  /** Сколько карточек в отображаемом списке */
  total: number
  isCompleted?: boolean
  tag?: TaskTag
  note?: string
  /** Прикреплённые к заданию фотографии */
  photos?: TaskPhotoView[]
  /** Компактный вид: вместо тегов, фото и заметки — короткая сводка */
  compact?: boolean
}>()

const emit = defineEmits<{
  delete: []
  toggleCompleted: [completed: boolean]
  selectTag: [tag: TaskTag]
  updateNote: [note: string]
  deleteNote: []
  addPhotos: [blobs: Blob[]]
  removePhoto: [id: string]
}>()

// Событие удаления элемента
const deleteItem = () => {
  emit('delete')
}

// Событие переключения статуса «выполнено»
const toggleCompleted = () => {
  emit('toggleCompleted', !props.isCompleted)
}

// Событие выбора тэга задачи
const onSelectTag = (tag: TaskTag) => {
  emit('selectTag', tag)
}

// --- Заметка ---
const isEditingNote = ref(false)
const noteDraft = ref('')
const noteTextareaRef = ref<HTMLTextAreaElement | null>(null)
const noteEditorRef = ref<HTMLElement | null>(null)

// Панель действий карточки: по её корню понимаем, что клик пришёл по кнопкам действий,
// и не закрываем из-за этого редактор заметки
const actionsRailRef = ref<InstanceType<typeof TaskActionsRail> | null>(null)
const showNoteExitConfirm = ref(false)

const noteEditorStore = useNoteEditor()

watch(isEditingNote, (editing) => {
  noteEditorStore.setEditing(props.point.uid, editing)
})

// Флаг подавления ближайшего document-клика после открытия редактора
let suppressNextDocumentClick = false

const openNoteEditor = async () => {
  if (!isEditingNote.value) {
    noteDraft.value = props.note ?? ''
    isEditingNote.value = true
    suppressNextDocumentClick = true
  }
  await nextTick()
  noteTextareaRef.value?.focus()
}

const cancelNoteEditor = () => {
  isEditingNote.value = false
  noteDraft.value = ''
}

const saveNote = () => {
  const trimmed = noteDraft.value.trim()
  if (trimmed) {
    emit('updateNote', trimmed)
  } else {
    emit('deleteNote')
  }
  isEditingNote.value = false
  noteDraft.value = ''
}

const deleteNote = () => {
  emit('deleteNote')
  isEditingNote.value = false
  noteDraft.value = ''
}

// Были ли изменения в тексте заметки относительно сохранённого значения
const hasNoteChanges = () => noteDraft.value !== (props.note ?? '')

// Попытка закрыть редактор при клике вне него
const attemptCloseEditor = () => {
  if (hasNoteChanges()) {
    showNoteExitConfirm.value = true
  } else {
    cancelNoteEditor()
  }
}

const confirmSaveNote = () => {
  showNoteExitConfirm.value = false
  saveNote()
}

const confirmDiscardNote = () => {
  showNoteExitConfirm.value = false
  cancelNoteEditor()
}

// Системная кнопка «Назад» (Android) закрывает редактор заметки,
// а не уводит со страницы (подтверждение закрывает себя само — см. ConfirmDialog)
useBackDismiss(isEditingNote, attemptCloseEditor)

const onDocumentClick = (event: MouseEvent) => {
  if (suppressNextDocumentClick) {
    suppressNextDocumentClick = false
    return
  }
  if (!isEditingNote.value || showNoteExitConfirm.value) return
  const target = event.target as Node
  if (noteEditorRef.value?.contains(target)) return
  if (actionsRailRef.value?.root?.contains(target)) return
  attemptCloseEditor()
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  if (isEditingNote.value) noteEditorStore.setEditing(props.point.uid, false)
})

const isCompleted = computed(() => props.isCompleted ?? false)

// --- Фотографии задания ---
const galleryRef = ref<InstanceType<typeof TaskPhotoGallery> | null>(null)
const viewerIndex = ref<number | null>(null)
const taskShareRef = ref<InstanceType<typeof TaskShareSheet> | null>(null)

const photoCount = computed(() => props.photos?.length ?? 0)

// Стабильный список для дочерних компонентов (без создания нового массива при каждом рендере)
const photoList = computed(() => props.photos ?? [])

// --- Компактный вид ---

/** Подпись выбранного тега (для сводки в компактном режиме) */
const activeTagOption = computed(() => tagOptions.find((option) => option.value === props.tag))

/** Цвет маркера тега в компактном режиме */
const tagDotClass = computed(() => {
  switch (props.tag) {
    case TaskTag.LIGHTING:
      return 'bg-amber-500'
    case TaskTag.CAMERAS:
      return 'bg-blue-500'
    case TaskTag.OTHER:
      return 'bg-purple-500'
    default:
      return 'bg-[#61646b]'
  }
})

// Кнопка в строке действий: открываем просмотрщик либо выбор фотографий
const handlePhotoButton = () => {
  if (photoCount.value === 0) {
    galleryRef.value?.openGallery()
    return
  }
  viewerIndex.value = 0
}

// Пользователь выбрал фотографии — передаём их наверх для сохранения
const onAddPhotos = (blobs: Blob[]) => {
  emit('addPhotos', blobs)
}

// Пользователь удалил фотографию — передаём id наверх
const onRemovePhoto = (id: string) => {
  emit('removePhoto', id)
}

// Отправка всех фотографий задания в мессенджер: подписью становится имя задания
const openTaskShare = () => {
  taskShareRef.value?.openTaskShare()
}
</script>

<template>
  <div class="relative">
    <div class="flex flex-row justify-between items-start gap-1 relative py-5 px-4">
      <!-- Информация о точке point -->
      <div class="flex-1 min-w-0">
        <div class="min-w-0">
          <div class="font-bold text-[#F0F0F0]">{{ point.name }}</div>
          <div class="text-sm text-[#ff5b4d]" :class="compact ? 'truncate' : ''">{{ point.direction }}</div>
          <div v-if="!compact" class="text-xs text-[#999]">{{ point.address }}</div>

          <!-- Компактный вид: адрес, тег, фото и заметка одной строкой -->
          <div v-else class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[#999]">
            <span class="truncate max-w-[200px]">{{ point.address }}</span>

            <span v-if="tag" class="inline-flex items-center gap-1">
              <span class="w-2 h-2 rounded-full" :class="tagDotClass"></span>
              {{ activeTagOption?.label }}
            </span>

            <span v-if="photoCount" class="inline-flex items-center gap-0.5">
              <PhotoIcon class="h-3 w-3" />{{ photoCount }}
            </span>

            <span v-if="note" class="inline-flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm360-520v-200H200v560h560v-360H560Z"/>
              </svg>
              Заметка
            </span>
          </div>
        </div>

        <!-- Тэги задачи (в компактном виде скрыты — тег показан в сводке) -->
        <div v-if="!compact" class="flex flex-wrap items-center gap-1.5 mt-2">
          <button
            v-for="tagOption in tagOptions"
            :key="tagOption.value"
            type="button"
            class="relative min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer after:absolute after:inset-x-0 after:-inset-y-1 after:content-[''] focus-visible:outline-2 focus-visible:outline-[#3d7eff]"
            :class="tag === tagOption.value ? tagOption.activeClass : 'border-[#3d3e43] text-gray-400'"
            @mousedown.prevent
            @click="onSelectTag(tagOption.value)"
          >
            {{ tagOption.label }}
          </button>
        </div>

        <!-- Фотографии задания. В компактном виде скрыты, но остаются смонтированными,
             чтобы кнопка фото в строке действий продолжала работать -->
        <div v-show="!compact">
          <TaskPhotoGallery
            ref="galleryRef"
            :photos="photos"
            @add="onAddPhotos"
            @remove="onRemovePhoto"
            @open="viewerIndex = $event"
          />
        </div>

        <!-- Заметка -->
        <div
          v-if="!compact && note && !isEditingNote"
          class="mt-2 flex items-start gap-1.5 text-xs text-[#c9c9d1]"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0 mt-px text-[#61646b]" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm360-520v-200H200v560h560v-360H560Zm-280 400h400v-80H280v80Zm0-160h400v-80H280v80Zm-80-320v560-560Z"/>
          </svg>
          <span class="break-words whitespace-pre-wrap">{{ note }}</span>
        </div>

        <!-- Редактор заметки -->
        <div v-if="isEditingNote" ref="noteEditorRef" class="mt-2">
          <textarea
            ref="noteTextareaRef"
            v-model="noteDraft"
            rows="2"
            placeholder="Введите заметку..."
            class="w-full bg-[#2a2a2e] text-white border border-[#444] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3d7eff] transition-colors resize-none"
          ></textarea>
          <div class="flex items-center gap-1 mt-0.5">
            <button
              type="button"
              class="min-h-11 rounded-lg px-3 text-xs font-medium text-[#3d7eff] cursor-pointer active:opacity-70"
              @mousedown.prevent
              @click="saveNote"
            >
              Сохранить
            </button>
            <button
              v-if="note"
              type="button"
              class="min-h-11 rounded-lg px-3 text-xs font-medium text-red-400 cursor-pointer active:opacity-70"
              @mousedown.prevent
              @click="deleteNote"
            >
              Удалить
            </button>
            <button
              type="button"
              class="min-h-11 rounded-lg px-3 text-xs font-medium text-gray-400 cursor-pointer active:opacity-70"
              @mousedown.prevent
              @click="cancelNoteEditor"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>

      <!--
        Распорка держит ширину под панель действий: сама панель вынесена из потока,
        поэтому место под кнопки нужно резервировать явно, иначе текст задания
        заходил бы под них.
      -->
      <div class="w-10 shrink-0" aria-hidden="true"></div>

      <!--
        Действия задания: столбик кнопок в правом верхнем углу карточки.
        Панель вынесена из потока — высоту карточки задаёт только её содержимое,
        поэтому высокий столбик не растягивает карточку, а прокручивается внутри
        неё (см. TaskActionsRail). min-h-11 оставляет место под свёрнутую панель
        даже в короткой карточке, а max-h-[calc(100%_-_2rem)] вместе с top-3
        ограничивает столбик по высоте карточки: снизу остаётся 20 px — нижний
        паддинг карточки (py-5).
      -->
      <TaskActionsRail
        ref="actionsRailRef"
        class="absolute top-3 end-3 z-[70] w-11 min-h-11 max-h-[calc(100%_-_2rem)]"
        :task-uid="point.uid"
        :is-completed="isCompleted"
        :has-note="!!note"
        :photo-count="photoCount"
        :compact="compact"
        @open-photos="handlePhotoButton"
        @open-note="openNoteEditor"
        @share="openTaskShare"
        @toggle-completed="toggleCompleted"
        @delete="deleteItem"
      />
    </div>

    <!-- Затемнение поверх выполненной задачи -->
    <div
      v-if="isCompleted"
      class="pointer-events-none absolute inset-0 z-[60] flex items-center justify-center bg-black/50"
    >
      <span class="text-2xl font-bold text-[#5fb336]">Выполнено</span>
    </div>
  </div>

  <!-- Подтверждение закрытия редактора заметки с несохранёнными изменениями -->
  <ConfirmDialog
    :open="showNoteExitConfirm"
    title="Сохранить изменения?"
    message="В заметке есть несохранённые изменения."
    confirm-label="Сохранить"
    tone="primary"
    @confirm="confirmSaveNote"
    @cancel="confirmDiscardNote"
  />

  <!-- Полноэкранный просмотр фотографий задания -->
  <PhotoViewer
    :photos="photoList"
    :index="viewerIndex"
    @close="viewerIndex = null"
    @remove="onRemovePhoto"
    @update:index="viewerIndex = $event"
  />

  <!-- Отправка фотографий задания в мессенджеры: подпись — имя задания -->
  <TaskShareSheet ref="taskShareRef" :caption="point.name" :photos="photoList" />
</template>
