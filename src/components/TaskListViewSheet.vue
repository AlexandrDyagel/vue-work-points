<script setup lang="ts">
import { TaskListSort } from '@/model/Enums.ts'

defineProps<{
  sort: TaskListSort
  groupByDirection: boolean
  compact: boolean
  /** Идёт пересчёт порядка по маршруту */
  isReordering: boolean
  /** Можно ли упорядочить по маршруту (нужно минимум 2 задания) */
  canReorderByRoute: boolean
}>()

const emit = defineEmits<{
  'update:sort': [value: TaskListSort]
  'update:groupByDirection': [value: boolean]
  'update:compact': [value: boolean]
  'apply-route-order': []
}>()

const sortChips = [
  { value: TaskListSort.ADDED, label: 'Как добавлено' },
  { value: TaskListSort.NAME_ASC, label: 'А → Я' },
  { value: TaskListSort.NAME_DESC, label: 'Я → А' },
]
</script>

<template>
  <div class="pb-4">
    <h2 class="text-center text-[#ccc] text-xl font-bold mb-5">Вид списка</h2>

    <!-- Порядок заданий -->
    <div class="mb-5">
      <h3 class="text-sm text-gray-400 font-medium mb-2">Порядок</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in sortChips"
          :key="chip.value"
          type="button"
          class="px-4 py-2 rounded-full text-sm font-medium border transition-all cursor-pointer"
          :class="
            sort === chip.value
              ? 'bg-[#5fb336] border-[#5fb336] text-white shadow-sm shadow-[#5fb336]/30'
              : 'bg-[#2a2a2e] border-[#3d3e43] text-[#aaa] hover:border-[#5fb336]/50'
          "
          @click="emit('update:sort', chip.value)"
        >
          {{ chip.label }}
        </button>
      </div>
    </div>

    <!-- Отображение -->
    <div class="mb-5">
      <h3 class="text-sm text-gray-400 font-medium mb-2">Отображение</h3>
      <div class="rounded-2xl bg-[#2a2a2e] divide-y divide-[#3a3a3e] overflow-hidden">
        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer active:opacity-80"
          @click="emit('update:groupByDirection', !groupByDirection)"
        >
          <span class="text-sm text-[#E6E6E6]">Группировать по направлению</span>
          <span
            class="shrink-0 w-11 h-6 rounded-full relative transition-colors"
            :class="groupByDirection ? 'bg-[#5fb336]' : 'bg-[#4a4a4f]'"
          >
            <span
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              :class="groupByDirection ? 'start-[22px]' : 'start-0.5'"
            ></span>
          </span>
        </button>

        <button
          type="button"
          class="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left cursor-pointer active:opacity-80"
          @click="emit('update:compact', !compact)"
        >
          <span class="text-sm text-[#E6E6E6]">Компактный вид карточек</span>
          <span
            class="shrink-0 w-11 h-6 rounded-full relative transition-colors"
            :class="compact ? 'bg-[#5fb336]' : 'bg-[#4a4a4f]'"
          >
            <span
              class="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all"
              :class="compact ? 'start-[22px]' : 'start-0.5'"
            ></span>
          </span>
        </button>
      </div>
      <p class="mt-2 text-[11px] text-[#61646b] leading-snug">
        В компактном виде вместо тегов, фотографий и заметки показывается короткая сводка: тег, количество фото и
        пометка о заметке. Иконки в строке карточки (фото, заметка, «готово», удалить) продолжают работать, а теги
        удобнее менять в обычном виде.
      </p>
    </div>

    <!-- Порядок по маршруту -->
    <div>
      <h3 class="text-sm text-gray-400 font-medium mb-2">Маршрут</h3>
      <button
        type="button"
        :disabled="!canReorderByRoute || isReordering"
        class="w-full rounded-xl border border-[#5fb336] text-[#5fb336] px-4 py-2.5 text-sm font-medium transition-colors active:opacity-70 disabled:opacity-40 cursor-pointer disabled:cursor-default"
        @click="emit('apply-route-order')"
      >
        {{ isReordering ? 'Пересчитываем порядок...' : 'Упорядочить по маршруту' }}
      </button>
      <p class="mt-2 text-[11px] text-[#61646b] leading-snug">
        Задания выстраиваются по кратчайшему пути от базовой точки (как на карте маршрута). Порядок списка
        при этом станет «как добавлено», чтобы совпадать с маршрутом.
      </p>
    </div>
  </div>
</template>
