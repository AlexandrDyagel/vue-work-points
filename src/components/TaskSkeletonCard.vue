<script setup lang="ts">
/**
 * Скелетон карточки задания.
 * Показывается, пока список заданий читается из локального хранилища,
 * чтобы вместо надписи «Нет заданий» не мигало пустое состояние.
 */
</script>

<template>
  <div class="py-5 px-4 animate-pulse" aria-hidden="true">
    <div class="flex flex-row items-start gap-2">
      <!-- Точка на таймлайне -->
      <div class="w-5 h-5 rounded-full bg-[#2a2a2e] shrink-0 mt-0.5"></div>

      <div class="flex-1 min-w-0">
        <!-- Название, направление, адрес -->
        <div class="space-y-2">
          <div class="h-4 w-2/3 rounded bg-[#2a2a2e]"></div>
          <div class="h-3 w-1/2 rounded bg-[#2a2a2e]"></div>
          <div class="h-3 w-3/4 rounded bg-[#2a2a2e]"></div>
        </div>

        <!-- Тэги задачи -->
        <div class="flex flex-wrap gap-2 mt-3">
          <div class="h-5 w-20 rounded-full bg-[#2a2a2e]"></div>
          <div class="h-5 w-16 rounded-full bg-[#2a2a2e]"></div>
          <div class="h-5 w-14 rounded-full bg-[#2a2a2e]"></div>
        </div>

        <!-- Галерея фотографий -->
        <div class="flex flex-wrap gap-2 mt-3">
          <div class="w-14 h-14 rounded-lg bg-[#2a2a2e]"></div>
          <div class="w-14 h-14 rounded-lg bg-[#2a2a2e]"></div>
          <div class="w-14 h-14 rounded-lg bg-[#2a2a2e]"></div>
        </div>
      </div>
    </div>
  </div>
</template>
