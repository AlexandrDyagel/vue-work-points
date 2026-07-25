<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCache } from '@/composables/useCache.ts'
import { useUserRole } from '@/composables/useUserRole.ts'
import { UserRole } from '@/model/Enums.ts'

const router = useRouter()
const { clearCachePoints } = useCache()
const { tryActivateAdmin, deactivateAdmin, getUserRole } = useUserRole()

// --- Скрытая активация админа (долгое нажатие на заголовок) ---
const showActivationDialog = ref(false)
const adminPassword = ref('')
const activationError = ref<string | null>(null)
const activationSuccess = ref(false)
const currentRole = ref<UserRole | null>(null)

let longPressTimer: ReturnType<typeof setTimeout> | null = null
const longPressDuration = 2000 // 2 секунды

const onTitlePressStart = () => {
  longPressTimer = setTimeout(() => {
    showActivationDialog.value = true
    activationError.value = null
    activationSuccess.value = false
    adminPassword.value = ''
  }, longPressDuration)
}

const onTitlePressEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onTitleClick = () => {
  // Короткое нажатие — проверяем текущую роль и показываем диалог, если уже админ
  checkAndShowAdminPanel()
}

const checkAndShowAdminPanel = async () => {
  currentRole.value = await getUserRole()
  showActivationDialog.value = true
}

const tryActivate = async () => {
  activationError.value = null
  activationSuccess.value = false

  if (!adminPassword.value.trim()) {
    activationError.value = 'Введите пароль'
    return
  }

  const success = await tryActivateAdmin(adminPassword.value.trim())
  if (success) {
    activationSuccess.value = true
    currentRole.value = UserRole.ADMIN
    adminPassword.value = ''
  } else {
    activationError.value = 'Неверный пароль'
  }
}

const handleDeactivate = async () => {
  await deactivateAdmin()
  currentRole.value = null
  activationSuccess.value = false
  showActivationDialog.value = false
}

const closeDialog = () => {
  showActivationDialog.value = false
  activationError.value = null
  activationSuccess.value = false
  adminPassword.value = ''
}
</script>

<template>
  <div class="fixed start-0 end-0 bottom-0 top-0 bg-[#242528]">
    <!-- Кнопка назад (для Android, где нет Telegram BackButton) -->
    <button
      @click="router.back()"
      class="absolute start-3 top-3 w-10 h-10 flex items-center justify-center rounded-xl bg-[#2a2a2e] text-gray-300 hover:text-white active:bg-[#3a3a3e] transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
        <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" />
      </svg>
    </button>

    <h1
      class="mt-2 text-center select-none"
      :class="{ 'cursor-pointer': true }"
      @mousedown="onTitlePressStart"
      @mouseup="onTitlePressEnd"
      @mouseleave="onTitlePressEnd"
      @touchstart="onTitlePressStart"
      @touchend="onTitlePressEnd"
      @touchcancel="onTitlePressEnd"
      @click="onTitleClick"
    >
      Настройки
    </h1>
    <div
      @click="clearCachePoints"
      class="fixed start-0 end-0 bottom-0 mb-[100px] bg-[#5fb336] mx-4 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer active:opacity-50"
    >
      <span class="text-sm font-medium">Очистить кэш точек</span>
    </div>

    <!-- Модальное окно активации админа / панель управления админом -->
    <Teleport to="body">
      <div v-if="showActivationDialog" class="fixed" style="left:0;top:0;right:0;bottom:0;z-index:9999">
        <!-- Затемнение фона -->
        <div
          class="absolute left-0 top-0 right-0 bottom-0 bg-black/60"
          @click="closeDialog"
        ></div>

        <!-- Контент -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[380px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333]">
          <h2 class="text-lg font-bold text-white mb-4 text-center">
            {{ currentRole === UserRole.ADMIN ? '👑 Админ-панель' : '🔐 Активация админа' }}
          </h2>

          <!-- Если уже админ -->
          <template v-if="currentRole === UserRole.ADMIN">
            <p class="text-gray-300 text-sm text-center mb-4">
              Ваше устройство имеет права администратора.
            </p>
            <button
              @click="handleDeactivate"
              class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
            >
              Деактивировать админа
            </button>
          </template>

          <!-- Если не админ — поле ввода пароля -->
          <template v-else>
            <p class="text-gray-400 text-xs text-center mb-4">
              Введите секретный пароль для активации прав администратора на этом устройстве.
            </p>
            <input
              v-model="adminPassword"
              type="password"
              placeholder="Секретный пароль"
              autocomplete="off"
              class="w-full bg-[#2a2a2e] text-white border border-[#444] rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-[#5fb336] transition-colors"
              @keyup.enter="tryActivate"
            />

            <p v-if="activationError" class="text-red-400 text-xs mb-3 text-center">
              {{ activationError }}
            </p>
            <p v-if="activationSuccess" class="text-green-400 text-xs mb-3 text-center">
              ✅ Админ права активированы! При следующем запуске вы будете админом.
            </p>

            <button
              @click="tryActivate"
              :disabled="!adminPassword.trim()"
              class="w-full bg-[#5fb336] hover:bg-[#4d9a2a] disabled:bg-[#3a3a3e] disabled:text-gray-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              Активировать
            </button>
          </template>

          <button
            @click="closeDialog"
            class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 mt-1 rounded-xl text-sm transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
</style>
