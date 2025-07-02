<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const isOpen = ref(false)
const startY = ref(0)
const currentY = ref(0)
const isDragging = ref(false)

// Открыть панель
const openSheet = () => {
  isOpen.value = true
  document.body.style.overflow = 'hidden'
}

// Закрыть панель
const closeSheet = () => {
  isOpen.value = false
  document.body.style.overflow = ''
}

// Начало перетаскивания
const startDrag = (e) => {
  isDragging.value = true
  startY.value = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY
  currentY.value = startY.value

  // Добавляем обработчики для движения и отпускания
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('touchmove', onDrag)
  document.addEventListener('mouseup', endDrag)
  document.addEventListener('touchend', endDrag)
}

// Перетаскивание
const onDrag = (e) => {
  if (!isDragging.value) return

  const y = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY
  const deltaY = y - startY.value

  // Ограничиваем движение вверх
  if (deltaY < 0) return

  currentY.value = y

  // Если сдвинули достаточно вниз - закрываем
  if (deltaY > 100) {
    endDrag()
    closeSheet()
  }
}

// Конец перетаскивания
const endDrag = () => {
  isDragging.value = false

  // Удаляем обработчики
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('touchmove', onDrag)
  document.removeEventListener('mouseup', endDrag)
  document.removeEventListener('touchend', endDrag)

  // Возвращаем на место, если не закрыли
  if (isOpen.value) {
    currentY.value = 0
  }
}

// Обработчик клавиши ESC
const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isOpen.value) {
    closeSheet()
  }
}

// Устанавливаем обработчики
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})

// Убираем обработчики при размонтировании
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})

// Экспортируем методы для использования извне
defineExpose({
  openSheet,
  closeSheet
})
</script>

<template>
  <div class="bottom-sheet-container">
    <!-- Overlay -->
    <div
      class="bottom-sheet-overlay"
      :class="{ 'overlay-visible': isOpen }"
      @click="closeSheet"
    ></div>

    <!-- Bottom Sheet -->
    <div
      class="bottom-sheet"
      :class="{ 'sheet-open': isOpen }"
    >
      <!-- Handle -->
      <div class="sheet-handle" @mousedown="startDrag" @touchstart="startDrag">
        <div class="handle-icon"></div>
      </div>

      <!-- Content -->
      <div class="sheet-content">
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.bottom-sheet-container {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 1000;
}

.bottom-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.overlay-visible {
  opacity: 1;
  pointer-events: auto;
}

.bottom-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: auto; /* ИЗМЕНИТЬ ДЛЯ ВЫСОТЫ BOTTOM SHEET (80vh) */
  max-height: 100%;
  background-color: #242528;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  transform: translateY(100%);
  transition: transform 0.3s ease;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  z-index: 1001;
}

.sheet-open {
  transform: translateY(0);
}

.sheet-handle {
  padding: 12px 0;
  display: flex;
  justify-content: center;
  cursor: grab;
  touch-action: none;
}

.handle-icon {
  width: 40px;
  height: 4px;
  background-color: #ccc;
  border-radius: 2px;
}

.sheet-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px 16px;
}
</style>
