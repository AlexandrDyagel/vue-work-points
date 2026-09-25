<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useHaptics, type HapticImpact } from '@/composables/useHaptics.ts'

/**
 * Главная кнопка действия страницы: единый вид и поведение на всех платформах
 * (Android/Capacitor, Telegram Mini App, web).
 *
 *  - variant="full" — полоса во всю ширину над нижним меню («На карте»);
 *  - variant="fab"  — квадратная плавающая кнопка («+» для админа).
 *
 * Внутри уже учтены отступ от нижнего меню и безопасных зон (safe-area),
 * тактильный отклик (useHaptics), состояния нажатия, загрузки и блокировки.
 * z-index задаётся на месте вызова через class, если кнопка должна быть
 * выше конкретного слоя страницы (например, class="z-100").
 */
const props = withDefaults(
  defineProps<{
    /** Текст кнопки; без текста кнопка показывает только иконку */
    label?: string
    /** Иконка (компонент Heroicons/Lucide) слева от текста или по центру FAB */
    icon?: Component
    /** Вид кнопки: полоса во всю ширину или квадратная плавающая кнопка */
    variant?: 'full' | 'fab'
    /** Цвет: основное действие или подтверждающее */
    tone?: 'primary' | 'success'
    /** Прижать к низу экрана над нижним меню (иначе — в потоке страницы) */
    floating?: boolean
    /** Сила тактильного отклика */
    haptic?: HapticImpact
    /** Кнопка не нажимается */
    disabled?: boolean
    /** Идёт действие: вместо содержимого показывается индикатор */
    loading?: boolean
    /** Подпись для скринридеров (по умолчанию берётся из label) */
    ariaLabel?: string
  }>(),
  {
    variant: 'full',
    tone: 'primary',
    floating: true,
    haptic: 'light',
    disabled: false,
    loading: false,
  },
)

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const { tap } = useHaptics()

const isBlocked = computed(() => props.disabled || props.loading)

/** Общая основа: плавные переходы нажатия, состояния загрузки и блокировки */
const baseClass =
  'flex items-center justify-center select-none cursor-pointer transition-all duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100'

const toneClass = computed(() =>
  props.tone === 'success'
    ? 'bg-[#5fb336] text-white active:bg-[#4d9a2a]'
    : 'bg-[#3d7eff] text-white active:bg-[#3268d6]',
)

const sizeClass = computed(() =>
  props.variant === 'fab'
    ? 'w-14 h-14 shrink-0 rounded-2xl shadow-xl'
    : 'h-11 rounded-xl gap-1.5 px-4 text-sm font-medium',
)

/** Позиция: плавающая кнопка над нижним меню (с safe-area) или в потоке страницы */
const positionClass = computed(() => {
  if (!props.floating) return props.variant === 'fab' ? '' : 'w-full'
  if (props.variant === 'fab') return 'fixed end-4 bottom-24'
  return 'fixed start-0 end-0 bottom-[var(--bottom-nav-offset)] mx-4'
})

const iconClass = computed(() => (props.variant === 'fab' ? 'w-7 h-7' : 'w-6 h-6'))

const handleClick = (event: MouseEvent): void => {
  if (isBlocked.value) return

  tap(props.haptic)
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    :disabled="isBlocked"
    :aria-label="ariaLabel ?? label"
    :aria-busy="loading || undefined"
    :class="[baseClass, toneClass, sizeClass, positionClass]"
    @click="handleClick"
  >
    <span
      v-if="loading"
      aria-hidden="true"
      class="w-5 h-5 rounded-full border-2 border-white/40 border-t-white animate-spin"
    ></span>
    <component :is="icon" v-else-if="icon" :class="iconClass" aria-hidden="true" />
    <span v-if="label && !loading" class="truncate">{{ label }}</span>
  </button>
</template>
