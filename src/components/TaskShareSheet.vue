<script setup lang="ts">
import { computed, ref, type Component } from 'vue'
import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'
import { useMiniApp } from 'vue-tg/8.0'
import BottomSheetView from '@/components/BottomSheetView.vue'
import Svg from '@/components/Svg.vue'
import TelegramIcon from '@/components/icons/TelegramIcon.vue'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon.vue'
import MaxIcon from '@/components/icons/MaxIcon.vue'
import ShareIcon from '@/components/icons/ShareIcon.vue'
import type { TaskPhotoView } from '@/model/TaskPhoto.ts'
import { useHaptics } from '@/composables/useHaptics.ts'
import { usePlatform } from '@/composables/usePlatform.ts'
import {
  TASK_SHARE_TARGET_LABELS,
  canTransferPhotos,
  loadPhotoBlobs,
  shareTask,
  type TaskShareTarget,
} from '@/utils/taskShare.ts'

/**
 * Панель отправки фотографий задания в мессенджеры («пачкой», одним сообщением).
 *
 * Подпись к пачке — имя задания (точки). Что именно уходит мессенджеру и как,
 * решает утилита taskShare: нативный плагин Share, системное окно «Поделиться»
 * или ссылка мессенджера с сохранением снимков в память устройства.
 *
 * Панель знает о платформе только одно — как открыть ссылку мессенджера,
 * поэтому кнопки не дублируют логику утилиты.
 *
 * Компонент ничего не меняет в задании: он только отправляет снимки.
 */
const props = defineProps<{
  /** Подпись к пачке снимков — имя задания (точки) */
  caption: string
  /** Фотографии задания (те же ссылки, что показывает карточка) */
  photos?: TaskPhotoView[]
}>()

const { tap } = useHaptics()
const { isTelegram } = usePlatform()
const { openTelegramLink } = useMiniApp()

/** Сколько держится сообщение о результате отправки */
const MESSAGE_TIMEOUT = 8000

const bottomSheetRef = ref<InstanceType<typeof BottomSheetView> | null>(null)

/** Сообщение о результате: показывается под кнопками, пока панель открыта */
const message = ref('')
const messageTone = ref<'success' | 'error'>('success')

/** Готовим снимки к отправке: кнопки на это время неактивны */
const isBusy = ref(false)

/** Передаёт ли платформа файлы мессенджеру (иначе снимки придётся прикреплять вручную) */
const transfersPhotos = ref(true)

let messageTimer: ReturnType<typeof setTimeout> | null = null

const photoCount = computed(() => props.photos?.length ?? 0)

/** Кнопки панели: мессенджеры и системное окно выбора приложения */
const options: Array<{ id: TaskShareTarget; label: string; icon: Component }> = [
  { id: 'telegram', label: TASK_SHARE_TARGET_LABELS.telegram, icon: TelegramIcon },
  { id: 'whatsapp', label: TASK_SHARE_TARGET_LABELS.whatsapp, icon: WhatsAppIcon },
  { id: 'max', label: TASK_SHARE_TARGET_LABELS.max, icon: MaxIcon },
  { id: 'system', label: 'Другое', icon: ShareIcon },
]

/** Подсказка под кнопками: чего ждать от отправки на этой платформе */
const hint = computed(() =>
  transfersPhotos.value
    ? 'Снимки и подпись получатель увидит одним сообщением'
    : 'Платформа не передаёт файлы: снимки сохранятся в память устройства — прикрепите их в чате',
)

/** Сообщение о результате: ошибка остаётся на виду, успех гаснет сам */
const showMessage = (text: string, tone: 'success' | 'error'): void => {
  message.value = text
  messageTone.value = tone

  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => {
    message.value = ''
    messageTimer = null
  }, MESSAGE_TIMEOUT)
}

/** Открытие панели: результат прошлой отправки не переносим */
const openTaskShare = (): void => {
  message.value = ''
  isBusy.value = false
  transfersPhotos.value = canTransferPhotos()
  bottomSheetRef.value?.openSheet()
}

const closeTaskShare = (): void => {
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = null
  message.value = ''
  bottomSheetRef.value?.closeSheet()
}

/**
 * Открытие ссылки мессенджера средствами платформы.
 * false — ссылку открыть не удалось: приложение не установлено или
 * браузер заблокировал новое окно.
 */
const openMessengerLink = async (url: string): Promise<boolean> => {
  try {
    // Нативная сборка: ссылку отдаём системе, deep-link запускает приложение
    if (Capacitor.isNativePlatform()) {
      await AppLauncher.openUrl({ url })
      return true
    }

    // Telegram Mini App: ссылку t.me открывает сам мессенджер, а не его встроенный браузер
    if (isTelegram()) {
      openTelegramLink(url)
      return true
    }

    // Браузер: window.open сообщает, не заблокировал ли окно блокировщик всплывающих окон
    return Boolean(window.open(url, '_blank', 'noopener'))
  } catch (error) {
    console.error('taskShare: не удалось открыть мессенджер', error)
    return false
  }
}

/** Отправка пачки снимков задания в выбранный мессенджер */
const send = async (target: TaskShareTarget): Promise<void> => {
  if (isBusy.value) return

  tap()
  isBusy.value = true

  try {
    const photos = await loadPhotoBlobs(props.photos ?? [])
    const result = await shareTask({
      caption: props.caption,
      photos,
      target,
      openLink: openMessengerLink,
    })

    if (result.message) showMessage(result.message, result.ok ? 'success' : 'error')
  } finally {
    isBusy.value = false
  }
}

defineExpose({
  openTaskShare,
  closeTaskShare,
})
</script>

<template>
  <BottomSheetView ref="bottomSheetRef">
    <!-- Клик внутри панели не считается кликом «мимо» редактора заметки на карточке -->
    <div @click.stop>
      <p class="text-center text-lg font-semibold text-[#F0F0F0]">Отправить фотографии задания</p>
      <p class="mt-1 text-center text-xs text-[#999]">
        Подпись: <span class="text-[#c9c9d1]">{{ caption }}</span> · снимков: {{ photoCount }}
      </p>

      <!-- Мессенджеры и системное окно выбора приложения -->
      <div class="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <button
          v-for="option in options"
          :key="option.id"
          type="button"
          class="flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[#3d3e43] bg-[#2a2a2e] px-2 py-3 text-[#c9c9d1] transition-all duration-200 ease-out cursor-pointer active:scale-95 active:bg-white/10 disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-[#3d7eff]"
          :disabled="isBusy"
          :aria-label="`Отправить в ${option.label}`"
          @click="send(option.id)"
        >
          <Svg>
            <component :is="option.icon" class="h-8 w-8" />
          </Svg>
          <span class="text-xs">{{ option.label }}</span>
        </button>
      </div>

      <!-- Чего ждать от отправки на этой платформе -->
      <p class="mt-3 text-center text-[11px] leading-snug text-[#999]">
        {{ isBusy ? 'Готовим снимки к отправке…' : hint }}
      </p>

      <!-- Результат отправки -->
      <Transition
        enter-active-class="transition-opacity duration-200 ease-out"
        leave-active-class="transition-opacity duration-200 ease-out"
        enter-from-class="opacity-0"
        leave-to-class="opacity-0"
      >
        <p
          v-if="message"
          class="mt-2 rounded-lg border p-2 text-center text-[11px] leading-snug"
          :class="
            messageTone === 'success'
              ? 'border-[#5fb336] bg-green-100 text-[#5fb336]'
              : 'border-[#ff5b4d] bg-red-100 text-[#ff5b4d]'
          "
        >
          {{ message }}
        </p>
      </Transition>

      <button
        type="button"
        class="mt-3 min-h-11 w-full rounded-xl border border-[#3d3e43] text-sm text-[#c9c9d1] transition-colors duration-200 cursor-pointer active:bg-white/5 motion-reduce:transition-none"
        @click="closeTaskShare"
      >
        Отмена
      </button>
    </div>
  </BottomSheetView>
</template>
