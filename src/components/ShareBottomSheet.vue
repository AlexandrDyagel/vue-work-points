<script setup lang="ts">
import { ref } from 'vue'
import { Capacitor } from '@capacitor/core'
import { AppLauncher } from '@capacitor/app-launcher'
import BottomSheetView from '@/components/BottomSheetView.vue'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon.vue'
import TelegramIcon from '@/components/icons/TelegramIcon.vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useMiniApp } from 'vue-tg/8.0'
import Svg from '@/components/Svg.vue'
import ClipboardIcon from '@/components/icons/ClipboardIcon.vue'
import MaxIcon from '@/components/icons/MaxIcon.vue'

const { openLink } = useMiniApp()

/**
 * Открывает ссылку в зависимости от платформы.
 * В нативном Android/iOS приложении (Capacitor) используем системный intent/браузер,
 * чтобы корректно запускались приложения Telegram и МАКС по deep-link.
 */
const openShareLink = async (url: string): Promise<void> => {
  if (Capacitor.isNativePlatform()) {
    await AppLauncher.openUrl({ url })
  } else {
    openLink(url)
  }
}

const props = defineProps({
  sharePoint: PointResponse,
})

const shareMessage = ref('')
const shareStatus = ref<'success' | 'error'>('success')
const showFallbackMenu = ref(false)
const bottomSheetRef = ref()

// Опции для fallback меню
const shareOptions = [
  {
    id: 'copy',
    label: 'Скопировать текст',
    icon: ClipboardIcon,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: WhatsAppIcon,
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: TelegramIcon,
  },
  {
    id: 'max',
    label: 'МАКС',
    icon: MaxIcon,
  },
]

function pointMapUrl(point: PointResponse): string {
  const { toRegion, fromRegion } = point.location
  if (toRegion.latitude && toRegion.longitude) {
    return `https://yandex.ru/maps/?pt=${toRegion.longitude},${toRegion.latitude}&z=18&l=map`
  }
  return `https://yandex.ru/maps/?pt=${fromRegion.longitude},${fromRegion.latitude}&z=18&l=map`
}

function shareText(point: PointResponse): string {
  return `${point.name}\n${point.direction}\n${point.address}`
}

function sharedData(point: PointResponse): string {
  return `${shareText(point)}\n${pointMapUrl(point)}`
}

// Fallback методы поделиться
const fallbackShare = async (method: string): Promise<void> => {
  showFallbackMenu.value = false

  if (!props.sharePoint) return
  try {
    switch (method) {
      case 'copy':
        await navigator.clipboard.writeText(sharedData(props.sharePoint))
        showMessage('Текст скопирован в буфер обмена!', 'success')
        break

      case 'whatsapp':
        openLink(`https://wa.me/?text=${encodeURIComponent(sharedData(props.sharePoint))}`)
        showMessage('Открывается WhatsApp...', 'success')
        break

      case 'telegram': {
        const url = Capacitor.isNativePlatform()
          ? `tg://msg_url?url=${encodeURIComponent(pointMapUrl(props.sharePoint))}&text=${encodeURIComponent(shareText(props.sharePoint))}`
          : `https://t.me/share/url?url=${encodeURIComponent(pointMapUrl(props.sharePoint))}&text=${encodeURIComponent(shareText(props.sharePoint))}`
        await openShareLink(url)
        showMessage('Открывается Telegram...', 'success')
        break
      }

      case 'max':
        await openShareLink(`https://max.ru/:share?text=${encodeURIComponent(sharedData(props.sharePoint))}`)
        showMessage('Открывается МАКС...', 'success')
        break
    }
  } catch (error) {
    showMessage('Не удалось выполнить действие', 'error')
    console.error('Ошибка:', error)
  }
}

const openShareBottomSheet = () => {
  shareMessage.value = ''
  bottomSheetRef.value.openSheet()
}

const closeShareBottomSheet = () => {
  bottomSheetRef.value.closeSheet()
}

// Вспомогательная функция для показа сообщений
const showMessage = (message: string, status: 'success' | 'error'): void => {
  shareMessage.value = message
  shareStatus.value = status

  setTimeout(() => {
    shareMessage.value = ''
  }, 3000)
}

defineExpose({
  openShareBottomSheet,
})
</script>

<template>
  <BottomSheetView ref="bottomSheetRef">
    <p class="text-center text-[#ccc] text-2xl"><strong>Поделиться через</strong></p>
    <div class="text-[#ccc] ms-4 me-4 mt-4 mb-4">
      <div @click.stop class="flex flex-col items-center">
        <div class="flex flex-row gap-3 items-center justify-center">
          <button
            v-for="option in shareOptions"
            :key="option.id"
            @click="fallbackShare(option.id)"
            class="p-3 rounded-lg border border-[#4d4d4d]"
          >
            <Svg>
              <component ref="comp" :is="option.icon"></component>
            </Svg>
          </button>
        </div>
        <button
          @click="closeShareBottomSheet"
          class="mt-4 p-3 rounded-lg text-[#ccc] border border-[#4d4d4d]"
        >
          Отмена
        </button>
      </div>
    </div>
    <!-- Сообщение об успехе/ошибке -->
    <Transition name="fade" class="fixed bottom-4 start-4 end-4 z-100">
      <div
        v-if="shareMessage"
        :class="[
          'mt-4 p-4 rounded-lg text-center font-medium',
          shareStatus === 'success'
            ? 'bg-green-100 text-[#5fb336] border border-[#5fb336]'
            : 'bg-red-100 text-[#ff5b4d] border border-[#ff5b4d]',
        ]"
      >
        {{ shareMessage }}
      </div>
    </Transition>
  </BottomSheetView>
  <!-- Fallback меню для браузеров без поддержки Web Share API -->
</template>

<style scoped>
/* Дополнительные стили для мобильной оптимизации */
@media (max-width: 640px) {
  .min-h-screen {
    min-height: 100vh;
  }
}

/* Анимация для плавного появления сообщений */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
