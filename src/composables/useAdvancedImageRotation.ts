// composables/useAdvancedImageRotation.ts
import { ref, computed } from 'vue';

type ObjectFit = 'cover' | 'fill' | 'contain';
type RotationAngle = 0 | 90 | 180 | 270;

export function useAdvancedImageRotation(initialRotation: RotationAngle = 0) {
  const rotation = ref<RotationAngle>(initialRotation);
  const isRotating = ref(false);
  const rotationCount = ref(0);
  const forcedObjectFit = ref<ObjectFit | null>(null);

  // Определяем ориентацию
  const isVertical = computed(() => rotation.value % 180 === 0);

  // Вычисляем object-fit с возможностью принудительного управления
  const objectFitClass = computed(() => {
    if (forcedObjectFit.value) {
      return `object-${forcedObjectFit.value}`;
    }

    // Автоматический выбор: fill для вертикальной, cover для горизонтальной
    return isVertical.value ? 'object-cover' : 'object-fill';
  });

  // Классы для контейнера
  const containerClasses = computed(() => ({
    'w-full transition-all duration-500': true,
    'aspect-square': isVertical.value,
    'h-full': !isVertical.value
  }));

  // Классы для изображения
  const imageClasses = computed(() => [
    'w-full transition-all duration-500 ease-out',
    objectFitClass.value,
    `rotate-${rotation.value}`,
    isRotating.value ? 'scale-105 opacity-90' : 'scale-100 opacity-100'
  ]);

  // Функции поворота
  const rotateBy = async (degrees: number): Promise<void> => {
    if (isRotating.value) return;

    isRotating.value = true;
    await new Promise(resolve => setTimeout(resolve, 400));

    rotation.value = ((rotation.value + degrees) % 360) as RotationAngle;
    rotationCount.value += 1;
    isRotating.value = false;
  };

  const rotate90 = (): Promise<void> => rotateBy(90);

  const setRotation = (angle: RotationAngle): void => {
    if (angle !== rotation.value) {
      rotationCount.value += 1;
    }
    rotation.value = angle;
  };

  const resetRotation = (): void => {
    if (rotation.value !== 0) {
      rotationCount.value += 1;
    }
    rotation.value = 0;
  };

  // Управление object-fit
  const setObjectFit = (fit: ObjectFit | 'auto'): void => {
    if (fit === 'auto') {
      forcedObjectFit.value = null;
    } else {
      forcedObjectFit.value = fit;
    }
  };

  return {
    // Состояние
    rotation,
    isRotating,
    rotationCount,
    isVertical,
    objectFitClass,
    forcedObjectFit,

    // Классы
    containerClasses,
    imageClasses,

    // Методы
    rotate90,
    setRotation,
    resetRotation,
    setObjectFit
  };
}
