<script setup lang="ts">
import { ref } from 'vue'
import BottomSheetView from '@/components/BottomSheetView.vue'
import WhatsAppIcon from '@/components/icons/WhatsAppIcon.vue'
import TelegramIcon from '@/components/icons/TelegramIcon.vue'
import { PointResponse } from '@/model/PointResponse.ts'
import { useMiniApp } from 'vue-tg/8.0'
import Svg from '@/components/Svg.vue'
import ClipboardIcon from '@/components/icons/ClipboardIcon.vue'

const { openLink } = useMiniApp()

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
]

function sharedData(point: PointResponse): string {
  let urlPoint: string
  if (point.location.toRegion.latitude && point.location.toRegion.longitude) {
    urlPoint = `https://yandex.ru/maps/?pt=${point.location.toRegion.longitude},${point.location.toRegion.latitude}&z=18&l=map`
  } else {
    urlPoint = `https://yandex.ru/maps/?pt=${point.location.fromRegion.longitude},${point.location.fromRegion.latitude}&z=18&l=map`
  }

  return `${point.name}\n${point.direction}\n${point.address}\n${urlPoint}`
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

      case 'telegram':
        openLink(`https://t.me/share/url?text=${encodeURIComponent(sharedData(props.sharePoint))}`)
        showMessage('Открывается Telegram...', 'success')
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
