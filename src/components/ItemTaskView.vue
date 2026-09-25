<script setup lang="ts">
import { PointResponse } from '@/model/PointResponse.ts'
import { TaskTag } from '@/model/Enums.ts'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { PhotoIcon } from '@heroicons/vue/24/outline'
import CheckCircleIcon from '@/components/icons/CheckCircleIcon.vue'
import { useNoteEditor } from '@/store/NoteEditor.ts'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'
import TaskPhotoGallery from '@/components/TaskPhotoGallery.vue'
import PhotoViewer from '@/components/PhotoViewer.vue'
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

const checkCircleIcon = shallowRef(CheckCircleIcon)

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
const noteButtonRef = ref<HTMLElement | null>(null)
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

// Системная кнопка «Назад» (Android) закрывает редактор заметки и подтверждение,
// а не уводит со страницы
useBackDismiss(isEditingNote, attemptCloseEditor)
useBackDismiss(showNoteExitConfirm, confirmDiscardNote)

const onDocumentClick = (event: MouseEvent) => {
  if (suppressNextDocumentClick) {
    suppressNextDocumentClick = false
    return
  }
  if (!isEditingNote.value || showNoteExitConfirm.value) return
  const target = event.target as Node
  if (noteEditorRef.value?.contains(target)) return
  if (noteButtonRef.value?.contains(target)) return
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

const path = (index: number): string => {
  if (index === 0 && props.total !== 1) {
    return 'absolute left-8 top-0 bottom-0 w-1 bg-blue-500 translate-y-1/2'
  } else if (index === 0 && props.total === 1) {
    return 'absolute left-8 top-0 bottom-0 w-1'
  } else if (index === props.total - 1) {
    return 'absolute left-8 top-0 bottom-0 w-1 bg-blue-500 -translate-y-1/2'
  } else {
    return 'absolute left-8 top-0 bottom-0 w-1 bg-blue-500'
  }
}
</script>

<template>
  <div class="relative">
    <div class="flex flex-row justify-between items-center relative py-5 px-4">
      <!-- Дорожка -->
      <div :class="path(index)"></div>

      <!-- Точка на дорожке -->
      <div
        class="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full bg-blue-500 border-4 border-white z-10"
        :class="{ 'animate-pulse-custom': index === 0 }"
        style="box-shadow: 0 0 0 2px #3b82f6"
      ></div>

      <!-- Информация о точке point -->
      <div class="ml-10 flex-1 min-w-0">
        <div class="w-full flex flex-row justify-between gap-2">
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

          <!--
            Кнопки действий над заданием: настоящие button (доступны с клавиатуры
            и скринридеру), тап-таргет 44px, отрицательные отступы сохраняют
            компактность карточки
          -->
          <div class="relative z-[70] flex flex-row items-center gap-2 shrink-0">
            <!-- Фотографии задания -->
            <button
              type="button"
              class="relative -mx-1 -my-3 h-11 w-11 flex items-center justify-center cursor-pointer rounded-lg active:opacity-70 focus-visible:outline-2 focus-visible:outline-[#3d7eff]"
              :class="photoCount ? 'text-[#3d7eff]' : 'text-[#61646b]'"
              :aria-label="`Фотографии задания: ${photoCount}`"
              @mousedown.prevent
              @click="handlePhotoButton"
            >
              <PhotoIcon class="h-5 w-5" />
              <span
                v-if="photoCount"
                class="absolute top-1 right-1 min-w-[14px] px-1 rounded-full bg-[#3d7eff] text-white text-[9px] font-bold leading-[14px] text-center"
              >
                {{ photoCount }}
              </span>
            </button>

            <button
              type="button"
              ref="noteButtonRef"
              class="-mx-1 -my-3 h-11 w-11 flex items-center justify-center cursor-pointer rounded-lg active:opacity-70 focus-visible:outline-2 focus-visible:outline-[#3d7eff]"
              :class="note ? 'text-[#3d7eff]' : 'text-[#61646b]'"
              :aria-label="note ? 'Редактировать заметку' : 'Добавить заметку'"
              @mousedown.prevent
              @click="openNoteEditor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h400l240 240v400q0 33-23.5 56.5T760-120H200Zm360-520v-200H200v560h560v-360H560Zm-280 400h400v-80H280v80Zm0-160h400v-80H280v80Zm-80-320v560-560Z"/>
              </svg>
            </button>
            <button
              type="button"
              class="-mx-1 -my-3 h-11 w-11 flex items-center justify-center cursor-pointer rounded-lg active:opacity-70 focus-visible:outline-2 focus-visible:outline-[#5fb336]"
              :class="isCompleted ? 'text-[#5fb336]' : 'text-[#61646b]'"
              :aria-label="isCompleted ? 'Снять отметку «выполнено»' : 'Отметить задание выполненным'"
              @mousedown.prevent
              @click="toggleCompleted"
            >
              <component :is="checkCircleIcon"></component>
            </button>

            <button
              type="button"
              class="-mx-1 -my-3 h-11 w-11 flex items-center justify-center cursor-pointer rounded-lg text-red-400 active:opacity-70 focus-visible:outline-2 focus-visible:outline-[#ff5b4d]"
              aria-label="Удалить задание"
              @mousedown.prevent
              @click="deleteItem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
                <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
              </svg>
            </button>
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
  <Teleport to="body">
    <Transition name="note-modal">
      <div v-if="showNoteExitConfirm" class="fixed inset-0 z-[9999]">
        <div class="absolute inset-0 bg-black/60" aria-hidden="true" @click="confirmDiscardNote"></div>

        <div
          class="note-modal-content absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[360px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]"
          role="dialog"
          aria-modal="true"
          aria-label="Несохранённые изменения заметки"
        >
          <h2 class="text-lg font-bold text-white mb-2 text-center">Сохранить изменения?</h2>
          <p class="text-gray-400 text-sm text-center mb-5">В заметке есть несохранённые изменения.</p>

          <button
            type="button"
            @click="confirmSaveNote"
            class="w-full min-h-11 bg-[#3d7eff] hover:bg-blue-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
          >
            Сохранить
          </button>
          <button
            type="button"
            @click="confirmDiscardNote"
            class="w-full min-h-11 bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Полноэкранный просмотр фотографий задания -->
  <PhotoViewer
    :photos="photoList"
    :index="viewerIndex"
    @close="viewerIndex = null"
    @remove="onRemovePhoto"
    @update:index="viewerIndex = $event"
  />
</template>

<style scoped>
@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
  }
  70% {
    box-shadow: 0 0 0 20px rgba(59, 130, 246, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
  }
}

.animate-pulse-custom {
  animation: pulse 2s infinite;
}

.note-modal-enter-active,
.note-modal-leave-active {
  transition: opacity 0.2s ease;
}
.note-modal-enter-active .note-modal-content,
.note-modal-leave-active .note-modal-content {
  transition: scale 0.2s ease;
}
.note-modal-enter-from,
.note-modal-leave-to {
  opacity: 0;
}
.note-modal-enter-from .note-modal-content,
.note-modal-leave-to .note-modal-content {
  scale: 0.95;
}
</style>
