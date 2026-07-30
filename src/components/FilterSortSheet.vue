<script setup lang="ts">
import { computed } from 'vue'
import { TypeSearchFilter, TypeSort } from '@/model/Enums.ts'

const props = defineProps<{
  typeSearchFilter: TypeSearchFilter
  typeSort: TypeSort
}>()

const emit = defineEmits<{
  'update:typeSearchFilter': [value: TypeSearchFilter]
  'update:typeSort': [value: TypeSort]
}>()

const searchFilterChips = [
  { value: TypeSearchFilter.NAME, label: 'По названию' },
  { value: TypeSearchFilter.DIRECTION, label: 'По направлению' },
  { value: TypeSearchFilter.ADDRESS, label: 'По адресу' },
] as const

const sortChips = [
  { value: TypeSort.NAME_ASC, label: 'А → Я', group: 'Алфавит' },
  { value: TypeSort.NAME_DESC, label: 'Я → А', group: 'Алфавит' },
  { value: TypeSort.CREATED_DESC, label: 'Новые', group: 'Дата добавления' },
  { value: TypeSort.CREATED_ASC, label: 'Старые', group: 'Дата добавления' },
  { value: TypeSort.UPDATED_DESC, label: 'Новые', group: 'Дата обновления' },
  { value: TypeSort.UPDATED_ASC, label: 'Старые', group: 'Дата обновления' },
  { value: TypeSort.TYPE, label: 'По типу', group: 'Тип' },
] as const

const groupedSortChips = computed(() => {
  const groups = new Map<string, { value: TypeSort; label: string; group: string }[]>()
  for (const chip of sortChips) {
    const entry = { value: chip.value as TypeSort, label: chip.label, group: chip.group }
    const list = groups.get(chip.group)
    if (list) {
      list.push(entry)
    } else {
      groups.set(chip.group, [entry])
    }
  }
  return Array.from(groups.entries())
})

function setSearchFilter(value: TypeSearchFilter) {
  emit('update:typeSearchFilter', value)
}

function setSort(value: TypeSort) {
  emit('update:typeSort', value)
}
</script>

<template>
  <div class="pb-4">
    <h2 class="text-center text-[#ccc] text-xl font-bold mb-5">
      Фильтры и сортировка
    </h2>

    <!-- Раздел: Поиск по -->
    <div class="mb-5">
      <h3 class="text-sm text-gray-400 font-medium mb-2">🔍 Поиск по</h3>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="chip in searchFilterChips"
          :key="chip.value"
          @click="setSearchFilter(chip.value)"
          class="px-4 py-2 rounded-full text-sm font-medium border transition-all"
          :class="
            typeSearchFilter === chip.value
              ? 'bg-[#5fb336] border-[#5fb336] text-white shadow-sm shadow-[#5fb336]/30'
              : 'bg-[#2a2a2e] border-[#3d3e43] text-[#aaa] hover:border-[#5fb336]/50'
          "
        >
          {{ chip.label }}
        </button>
      </div>
    </div>

    <!-- Раздел: Сортировка -->
    <div>
      <h3 class="text-sm text-gray-400 font-medium mb-2">📋 Сортировка</h3>
      <div class="space-y-3">
        <div v-for="[group, chips] in groupedSortChips" :key="group">
          <p class="text-xs text-gray-500 mb-1.5 uppercase tracking-wide">
            {{ group }}
          </p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="chip in chips"
              :key="chip.value"
              @click="setSort(chip.value)"
              class="px-4 py-2 rounded-full text-sm font-medium border transition-all"
              :class="
                typeSort === chip.value
                  ? 'bg-[#5fb336] border-[#5fb336] text-white shadow-sm shadow-[#5fb336]/30'
                  : 'bg-[#2a2a2e] border-[#3d3e43] text-[#aaa] hover:border-[#5fb336]/50'
              "
            >
              <span class="flex items-center gap-1.5">
                <svg
                  v-if="typeSort === chip.value"
                  xmlns="http://www.w3.org/2000/svg"
                  class="h-3.5 w-3.5"
                  viewBox="0 -960 960 960"
                  fill="currentColor"
                >
                  <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
                </svg>
                {{ chip.label }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
