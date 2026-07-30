<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useCache } from '@/composables/useCache.ts'
import { useUserRole } from '@/composables/useUserRole.ts'
import { useTasksLocalStorage } from '@/composables/useTasksLocalStorage.ts'
import { useSearchFilter } from '@/composables/useSearchFilter.ts'
import { usePlatform } from '@/composables/usePlatform.ts'
import {
  Environment,
  LocalStorageNames,
  TypeSearchFilter,
  TypeSort,
  UserRole,
} from '@/model/Enums.ts'
import { DEV_VERSION, ENVIRONMENT } from '@/main.ts'
import { storage } from '@/utils/storage.ts'

const router = useRouter()
const { clearCachePoints, checkForUpdate, setLastUpdateDataPoints, removeLastUpdateDataPoints } =
  useCache()
const { tryActivateAdmin, deactivateAdmin, getUserRole } = useUserRole()
const { removeItems: clearCacheTasks } = useTasksLocalStorage()
const { updateUserSearchFilter, updateUserSortType } = useSearchFilter()
const { isNative } = usePlatform()

// --- Состояние ---
const currentRole = ref<UserRole | null>(null)
const lastSyncDate = ref<string | null>(null)
const toastMessage = ref<string | null>(null)
let toastTimer: ReturnType<typeof setTimeout> | null = null

// Текущие настройки сортировки и фильтра (загружаются при монтировании)
const currentSortType = ref<TypeSort>(TypeSort.NAME_ASC)
const currentSearchFilter = ref<TypeSearchFilter>(TypeSearchFilter.NAME)

// --- Скрытая активация админа (долгое нажатие на заголовок) ---
const showActivationDialog = ref(false)
const adminPassword = ref('')
const activationError = ref<string | null>(null)
const activationSuccess = ref(false)

// Для переключения секций в админ-панели
const adminSection = ref<'main' | 'changePassword'>('main')
const newPassword = ref('')
const confirmPassword = ref('')
const passwordChangeError = ref<string | null>(null)
const passwordChangeSuccess = ref(false)

let longPressTimer: ReturnType<typeof setTimeout> | null = null
const longPressDuration = 2000

// --- Тосты ---
function showToast(msg: string, duration = 2500) {
  toastMessage.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = null
  }, duration)
}

// --- Загрузка начальных данных ---
onMounted(async () => {
  currentRole.value = await getUserRole()
  await loadCurrentSettings()
  await loadLastSyncDate()
})

async function loadCurrentSettings() {
  const sortType = await storage.get<TypeSort>(LocalStorageNames.SORT_TYPE)
  if (sortType) currentSortType.value = sortType

  const searchFilter = await storage.get<TypeSearchFilter>(LocalStorageNames.SEARCH_FILTER)
  if (searchFilter) currentSearchFilter.value = searchFilter
}

async function loadLastSyncDate() {
  const date = await storage.get<string>(LocalStorageNames.LAST_UPDATE_TIME)
  lastSyncDate.value = date
}

// --- Действия с данными ---
async function handleClearPointsCache() {
  await clearCachePoints()
  showToast('✅ Кэш точек очищен')
}

async function handleClearTasksCache() {
  await clearCacheTasks()
  showToast('✅ Кэш заданий очищен')
}

async function handleClearAllCache() {
  await clearCachePoints()
  await clearCacheTasks()
  showToast('✅ Весь кэш очищен')
}

async function handleForceSync() {
  try {
    await removeLastUpdateDataPoints()
    const hasUpdates = await checkForUpdate()
    if (hasUpdates) {
      // checkForUpdate сам вызывает obtainCachedPoints при необходимости
      showToast('🔄 Данные синхронизированы')
    } else {
      showToast('✅ Данные актуальны')
    }
    await loadLastSyncDate()
  } catch (e) {
    showToast('❌ Ошибка синхронизации')
    console.error(e)
  }
}

function formatDate(raw: unknown): string {
  if (!raw) return 'Никогда'
  try {
    let date: Date

    // Firebase Timestamp object: { seconds: number, nanoseconds: number }
    if (typeof raw === 'object' && raw !== null && 'seconds' in raw) {
      date = new Date((raw as { seconds: number }).seconds * 1000)
    }
    // Numeric timestamp as string ("1738000000000") or ISO string
    else if (typeof raw === 'string') {
      const num = Number(raw)
      if (!isNaN(num) && num > 1_000_000_000) {
        // Если число больше миллиарда — это миллисекунды (post-2001)
        date = new Date(num > 100_000_000_000 ? num : num * 1000)
      } else {
        date = new Date(raw)
      }
    }
    // Numeric timestamp as number
    else if (typeof raw === 'number') {
      date = new Date(raw > 100_000_000_000 ? raw : raw * 1000)
    }
    else {
      return String(raw)
    }

    if (isNaN(date.getTime())) return String(raw)

    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(raw)
  }
}

// --- Настройки сортировки и фильтрации ---
const sortOptions: { value: TypeSort; label: string }[] = [
  { value: TypeSort.NAME_ASC, label: 'По алфавиту (А → Я)' },
  { value: TypeSort.NAME_DESC, label: 'По алфавиту (Я → А)' },
  { value: TypeSort.CREATED_DESC, label: 'Новые сверху' },
  { value: TypeSort.CREATED_ASC, label: 'Старые сверху' },
  { value: TypeSort.UPDATED_DESC, label: 'Обновлённые сверху' },
  { value: TypeSort.UPDATED_ASC, label: 'Обновлённые снизу' },
  { value: TypeSort.TYPE, label: 'По типу точки' },
]

const filterOptions: { value: TypeSearchFilter; label: string }[] = [
  { value: TypeSearchFilter.NAME, label: 'По названию' },
  { value: TypeSearchFilter.ADDRESS, label: 'По адресу' },
  { value: TypeSearchFilter.DIRECTION, label: 'По направлению' },
]

async function handleSortChange(sortType: TypeSort) {
  currentSortType.value = sortType
  await updateUserSortType(sortType)
  showToast('✅ Сортировка сохранена')
}

async function handleFilterChange(filterType: TypeSearchFilter) {
  currentSearchFilter.value = filterType
  await updateUserSearchFilter(filterType)
  showToast('✅ Фильтр сохранён')
}

// --- Админ: долгое нажатие ---
const onTitlePressStart = () => {
  longPressTimer = setTimeout(() => {
    showActivationDialog.value = true
    activationError.value = null
    activationSuccess.value = false
    adminPassword.value = ''
    adminSection.value = 'main'
  }, longPressDuration)
}

const onTitlePressEnd = () => {
  if (longPressTimer) {
    clearTimeout(longPressTimer)
    longPressTimer = null
  }
}

const onTitleClick = async () => {
  currentRole.value = await getUserRole()
  showActivationDialog.value = true
  adminSection.value = 'main'
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
  adminSection.value = 'main'
  passwordChangeError.value = null
  passwordChangeSuccess.value = false
  newPassword.value = ''
  confirmPassword.value = ''
}

// --- Экспорт/импорт точек (админ) ---
async function handleExportPoints() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pointsRaw = await storage.get<any[]>(LocalStorageNames.CACHE_POINTS)
  if (!pointsRaw || pointsRaw.length === 0) {
    showToast('⚠️ Нет данных для экспорта')
    return
  }
  const json = JSON.stringify(pointsRaw, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `points-export-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  showToast('📥 Экспорт выполнен')
}

async function handleImportPoints() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  input.onchange = async (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      if (!Array.isArray(data)) {
        showToast('❌ Неверный формат файла')
        return
      }
      await storage.set(LocalStorageNames.CACHE_POINTS, data)
      showToast(`✅ Импортировано ${data.length} точек`)
    } catch (err) {
      showToast('❌ Ошибка импорта')
      console.error(err)
    }
  }
  input.click()
}

// --- Смена пароля (админ) ---
async function handleChangePassword() {
  passwordChangeError.value = null
  passwordChangeSuccess.value = false

  if (!newPassword.value.trim() || !confirmPassword.value.trim()) {
    passwordChangeError.value = 'Заполните оба поля'
    return
  }
  if (newPassword.value.trim() !== confirmPassword.value.trim()) {
    passwordChangeError.value = 'Пароли не совпадают'
    return
  }
  if (newPassword.value.trim().length < 6) {
    passwordChangeError.value = 'Пароль должен быть не менее 6 символов'
    return
  }

  // Вычисляем хеш SHA-256 и сохраняем в localStorage для проверки в useUserRole
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(newPassword.value.trim())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')

    // Сохраняем новый хеш в localStorage (временное решение, т.к. ADMIN_SECRET_HASH захардкожен)
    await storage.set('admin_secret_hash_override', hashHex)

    passwordChangeSuccess.value = true
    newPassword.value = ''
    confirmPassword.value = ''
    showToast('🔐 Пароль изменён (только для этого устройства)')
  } catch {
    passwordChangeError.value = 'Ошибка при смене пароля'
  }
}

// --- Полный сброс ---
async function handleFullReset() {
  if (!confirm('Вы уверены? Будут удалены все локальные данные: кэш, настройки, роль.')) return
  const allKeys = await storage.keys()
  for (const key of allKeys) {
    await storage.remove(key)
  }
  currentRole.value = null
  currentSortType.value = TypeSort.NAME_ASC
  currentSearchFilter.value = TypeSearchFilter.NAME
  lastSyncDate.value = null
  showToast('🔄 Все настройки сброшены')
}

// --- Вычисляемые ---
const platformLabel = computed(() => {
  if (isNative()) return 'Android / Capacitor'
  return 'Web / Telegram Mini App'
})

const envLabel = computed(() => {
  return Number(ENVIRONMENT) === Number(Environment.DEVELOPMENT) ? 'Development' : 'Production'
})
</script>

<template>
  <div class="fixed start-0 end-0 bottom-0 top-0 bg-[#242528] overflow-y-auto">
    <!-- Кнопка назад -->
    <button
      @click="router.back()"
      class="absolute start-3 top-3 w-10 h-10 flex items-center justify-center rounded-xl bg-[#2a2a2e] text-gray-300 hover:text-white active:bg-[#3a3a3e] transition-colors z-20"
    >
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 -960 960 960" fill="currentColor">
        <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z" />
      </svg>
    </button>

    <!-- Заголовок (долгое нажатие для активации админа) -->
    <h1
      class="mt-2 text-center text-white text-lg font-semibold select-none cursor-pointer pt-8"
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

    <!-- ==================== СЕКЦИЯ 1: Управление данными ==================== -->
    <section class="mx-4 mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
        💾 Управление данными и кэшем
      </h2>

      <div class="bg-[#2a2a2e] rounded-2xl divide-y divide-[#3a3a3e] overflow-hidden">
        <!-- Дата последней синхронизации -->
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Дата последней синхронизации</span>
          <span class="text-xs text-gray-500">{{ formatDate(lastSyncDate) }}</span>
        </div>

        <!-- Принудительная синхронизация -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleForceSync"
        >
          <span class="text-sm text-gray-300">Принудительная синхронизация</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#5fb336]" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/>
          </svg>
        </div>

        <!-- Очистить кэш точек -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleClearPointsCache"
        >
          <span class="text-sm text-gray-300">Очистить кэш точек</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
          </svg>
        </div>

        <!-- Очистить кэш заданий -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleClearTasksCache"
        >
          <span class="text-sm text-gray-300">Очистить кэш заданий</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
          </svg>
        </div>

        <!-- Очистить весь кэш -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleClearAllCache"
        >
          <span class="text-sm text-red-400">Очистить весь кэш</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-500" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
          </svg>
        </div>
      </div>
    </section>

    <!-- ==================== СЕКЦИЯ 2: Настройки отображения ==================== -->
    <section class="mx-4 mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
        📊 Настройки отображения и сортировки
      </h2>

      <div class="bg-[#2a2a2e] rounded-2xl divide-y divide-[#3a3a3e] overflow-hidden">
        <!-- Сортировка точек по умолчанию -->
        <div class="px-4 py-3.5">
          <span class="text-sm text-gray-300 block mb-2">Сортировка точек по умолчанию</span>
          <select
            :value="currentSortType"
            @change="handleSortChange(($event.target as HTMLSelectElement).value as TypeSort)"
            class="w-full bg-[#1e1e21] text-white border border-[#444] rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#5fb336] transition-colors appearance-none"
          >
            <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <!-- Фильтр поиска по умолчанию -->
        <div class="px-4 py-3.5">
          <span class="text-sm text-gray-300 block mb-2">Фильтр поиска по умолчанию</span>
          <div class="flex gap-2">
            <button
              v-for="opt in filterOptions"
              :key="opt.value"
              @click="handleFilterChange(opt.value)"
              class="flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-colors"
              :class="
                currentSearchFilter === opt.value
                  ? 'bg-[#5fb336] text-white'
                  : 'bg-[#1e1e21] text-gray-400 border border-[#444] hover:border-[#5fb336]'
              "
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- ==================== СЕКЦИЯ 3: Админ-панель (только для ADMIN) ==================== -->
    <section v-if="currentRole === UserRole.ADMIN" class="mx-4 mt-6">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
        👑 Админ-панель
      </h2>

      <div class="bg-[#2a2a2e] rounded-2xl divide-y divide-[#3a3a3e] overflow-hidden">
        <!-- Статус админа -->
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Статус</span>
          <span class="text-xs text-[#5fb336] font-medium">👑 Администратор</span>
        </div>

        <!-- Деактивировать админа -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleDeactivate"
        >
          <span class="text-sm text-red-400">Деактивировать админа</span>
        </div>

        <!-- Экспорт точек -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleExportPoints"
        >
          <span class="text-sm text-gray-300">Экспорт точек (JSON)</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#5fb336]" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
          </svg>
        </div>

        <!-- Импорт точек -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="handleImportPoints"
        >
          <span class="text-sm text-gray-300">Импорт точек (JSON)</span>
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#5fb336]" viewBox="0 -960 960 960" fill="currentColor">
            <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
          </svg>
        </div>

        <!-- Смена пароля -->
        <div
          class="flex items-center justify-between px-4 py-3.5 cursor-pointer active:bg-[#3a3a3e] transition-colors"
          @click="adminSection = 'changePassword'; showActivationDialog = true"
        >
          <span class="text-sm text-gray-300">Сменить секретный пароль</span>
        </div>
      </div>
    </section>

    <!-- ==================== СЕКЦИЯ 4: О приложении ==================== -->
    <section class="mx-4 mt-6 mb-[120px]">
      <h2 class="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3 px-1">
        ℹ️ О приложении
      </h2>

      <div class="bg-[#2a2a2e] rounded-2xl divide-y divide-[#3a3a3e] overflow-hidden">
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Версия</span>
          <span class="text-xs text-gray-500">v{{ DEV_VERSION }}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Платформа</span>
          <span class="text-xs text-gray-500">{{ platformLabel }}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Окружение</span>
          <span class="text-xs text-gray-500">{{ envLabel }}</span>
        </div>
        <div class="flex items-center justify-between px-4 py-3.5">
          <span class="text-sm text-gray-300">Роль</span>
          <span class="text-xs" :class="currentRole === UserRole.ADMIN ? 'text-[#5fb336]' : 'text-gray-500'">
            {{ currentRole === UserRole.ADMIN ? 'Админ' : 'Пользователь' }}
          </span>
        </div>
      </div>
    </section>

    <!-- Кнопка полного сброса -->
    <div class="mx-4 mb-[100px]">
      <div
        @click="handleFullReset"
        class="bg-red-500/20 border border-red-500/40 px-3 h-[40px] rounded-xl text-center content-center cursor-pointer active:bg-red-500/30 transition-colors"
      >
        <span class="text-sm font-medium text-red-400">Сбросить все настройки</span>
      </div>
    </div>

    <!-- ==================== Модальное окно активации / админ-панели ==================== -->
    <Teleport to="body">
      <div v-if="showActivationDialog" class="fixed" style="left:0;top:0;right:0;bottom:0;z-index:9999">
        <!-- Затемнение -->
        <div class="absolute left-0 top-0 right-0 bottom-0 bg-black/60" @click="closeDialog"></div>

        <!-- Контент -->
        <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-[380px] bg-[#1e1e21] rounded-2xl p-6 shadow-2xl border border-[#333] max-h-[85vh] overflow-y-auto">
          <!-- ===== Смена пароля ===== -->
          <template v-if="adminSection === 'changePassword'">
            <h2 class="text-lg font-bold text-white mb-4 text-center">🔐 Смена пароля</h2>
            <p class="text-gray-400 text-xs text-center mb-4">
              Задайте новый секретный пароль для активации админ-режима.
            </p>
            <input
              v-model="newPassword"
              type="password"
              placeholder="Новый пароль"
              autocomplete="off"
              class="w-full bg-[#2a2a2e] text-white border border-[#444] rounded-xl px-4 py-3 text-sm mb-2 outline-none focus:border-[#5fb336] transition-colors"
            />
            <input
              v-model="confirmPassword"
              type="password"
              placeholder="Подтвердите пароль"
              autocomplete="off"
              class="w-full bg-[#2a2a2e] text-white border border-[#444] rounded-xl px-4 py-3 text-sm mb-3 outline-none focus:border-[#5fb336] transition-colors"
            />
            <p v-if="passwordChangeError" class="text-red-400 text-xs mb-3 text-center">
              {{ passwordChangeError }}
            </p>
            <p v-if="passwordChangeSuccess" class="text-green-400 text-xs mb-3 text-center">
              ✅ Пароль успешно изменён!
            </p>
            <button
              @click="handleChangePassword"
              class="w-full bg-[#5fb336] hover:bg-[#4d9a2a] text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
            >
              Сменить пароль
            </button>
            <button
              @click="adminSection = 'main'; passwordChangeError = null; passwordChangeSuccess = false; newPassword = ''; confirmPassword = ''"
              class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
            >
              ← Назад
            </button>
          </template>

          <!-- ===== Основное окно админ-панели ===== -->
          <template v-else-if="currentRole === UserRole.ADMIN">
            <h2 class="text-lg font-bold text-white mb-4 text-center">👑 Админ-панель</h2>
            <p class="text-gray-300 text-sm text-center mb-4">
              Ваше устройство имеет права администратора.
            </p>
            <button
              @click="handleDeactivate"
              class="w-full bg-red-500 hover:bg-red-600 text-white px-4 py-2.5 rounded-xl font-medium transition-colors mb-2"
            >
              Деактивировать админа
            </button>
            <button
              @click="closeDialog"
              class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 rounded-xl text-sm transition-colors"
            >
              Закрыть
            </button>
          </template>

          <!-- ===== Активация админа ===== -->
          <template v-else>
            <h2 class="text-lg font-bold text-white mb-4 text-center">🔐 Активация админа</h2>
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
              ✅ Админ права активированы!
            </p>

            <button
              @click="tryActivate"
              :disabled="!adminPassword.trim()"
              class="w-full bg-[#5fb336] hover:bg-[#4d9a2a] disabled:bg-[#3a3a3e] disabled:text-gray-500 text-white px-4 py-2.5 rounded-xl font-medium transition-colors"
            >
              Активировать
            </button>
            <button
              @click="closeDialog"
              class="w-full bg-transparent text-gray-400 hover:text-white px-4 py-2 mt-1 rounded-xl text-sm transition-colors"
            >
              Закрыть
            </button>
          </template>
        </div>
      </div>
    </Teleport>

    <!-- ==================== Тост-уведомление ==================== -->
    <Teleport to="body">
      <Transition name="toast">
        <div
          v-if="toastMessage"
          class="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] bg-[#1e1e21] border border-[#444] text-white text-sm px-5 py-3 rounded-2xl shadow-2xl text-center whitespace-nowrap"
        >
          {{ toastMessage }}
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 -960 960 960' fill='%23999'%3E%3Cpath d='M480-360 280-560h400L480-360Z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  background-size: 20px;
  padding-right: 32px;
}

.toast-enter-active {
  transition: all 0.3s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}
</style>
