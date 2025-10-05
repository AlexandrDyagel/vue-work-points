<template>
  <div class="min-h-screen bg-gray-50 p-4">
    <div class="max-w-md mx-auto">
      <!-- Контент -->
      <div class="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 class="text-2xl font-bold text-gray-800 mb-4">Интересный контент</h1>
        <p class="text-gray-600 leading-relaxed">
          {{ content }}
        </p>
      </div>

      <!-- Кнопка поделиться -->
      <button
        @click="handleShare"
        :disabled="isSharing"
        class="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-4 px-6 rounded-lg shadow-md transition-colors duration-200 flex items-center justify-center gap-3"
      >
        <ShareIcon :is-sharing="isSharing" />
        {{ isSharing ? 'Поделиться...' : 'Поделиться' }}
      </button>

      <!-- Fallback меню для браузеров без поддержки Web Share API -->
      <div
        v-if="showFallbackMenu"
        class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        @click="closeFallbackMenu"
      >
        <div class="bg-white rounded-lg w-full max-w-sm p-6" @click.stop>
          <h3 class="text-lg font-semibold text-gray-800 mb-4">Поделиться через</h3>
          <div class="space-y-3">
            <button
              v-for="option in shareOptions"
              :key="option.id"
              @click="fallbackShare(option.id)"
              class="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <component :is="option.icon" class="h-5 w-5 text-gray-600" />
              <span class="text-gray-700">{{ option.label }}</span>
            </button>
          </div>
          <button
            @click="closeFallbackMenu"
            class="w-full mt-4 p-3 text-gray-500 hover:text-gray-700 transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>

      <!-- Сообщение об успехе/ошибке -->
      <Transition name="fade">
        <div
          v-if="shareMessage"
          :class="[
            'mt-4 p-4 rounded-lg text-center font-medium',
            shareStatus === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200',
          ]"
        >
          {{ shareMessage }}
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ShareIcon from './ShareIcon.vue'

// Реактивные данные
const content = ref(`Это пример текста, которым можно поделиться с другими приложениями.
Вы можете заменить этот текст на любой другой контент, который хотите распространить.`)

const isSharing = ref(false)
const shareMessage = ref('')
const shareStatus = ref<'success' | 'error'>('success')
const showFallbackMenu = ref(false)

// Опции для fallback меню
const shareOptions = [
  {
    id: 'copy',
    label: 'Скопировать текст',
    icon: 'ClipboardIcon',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: 'ChatIcon',
  },
  {
    id: 'telegram',
    label: 'Telegram',
    icon: 'PaperAirplaneIcon',
  },
]

// Функция для проверки поддержки Web Share API
const isWebShareSupported = (): boolean => {
  return typeof navigator !== 'undefined' && !!navigator.share
}

// Основная функция поделиться
const shareContent = async (): Promise<void> => {
  shareMessage.value = ''

  if (!isWebShareSupported()) {
    showFallbackMenu.value = true
    return
  }

  isSharing.value = true

  try {
    await navigator.share({
      title: 'Интересный контент',
      text: content.value,
      url: window.location.href,
    })

    showMessage('Контент успешно отправлен!', 'success')
  } catch (error: unknown) {
    if (error instanceof Error && error.name !== 'AbortError') {
      showMessage('Не удалось поделиться контентом', 'error')
      console.error('Ошибка при попытке поделиться:', error)
    }
  } finally {
    isSharing.value = false
  }
}

// Обработчик кнопки поделиться
const handleShare = (): void => {
  shareContent()
}

// Fallback методы поделиться
const fallbackShare = async (method: string): Promise<void> => {
  showFallbackMenu.value = false
  isSharing.value = true

  try {
    switch (method) {
      case 'copy':
        await navigator.clipboard.writeText(content.value)
        showMessage('Текст скопирован в буфер обмена!', 'success')
        break

      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(content.value)}`, '_blank')
        showMessage('Открывается WhatsApp...', 'success')
        break

      case 'telegram':
        window.open(`https://t.me/share/url?text=${encodeURIComponent(content.value)}`, '_blank')
        showMessage('Открывается Telegram...', 'success')
        break
    }
  } catch (error) {
    showMessage('Не удалось выполнить действие', 'error')
    console.error('Ошибка:', error)
  } finally {
    isSharing.value = false
  }
}

// Закрытие fallback меню
const closeFallbackMenu = (): void => {
  showFallbackMenu.value = false
}

// Вспомогательная функция для показа сообщений
const showMessage = (message: string, status: 'success' | 'error'): void => {
  shareMessage.value = message
  shareStatus.value = status

  setTimeout(() => {
    shareMessage.value = ''
  }, 3000)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
