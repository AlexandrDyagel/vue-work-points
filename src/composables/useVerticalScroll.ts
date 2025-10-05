// composables/useVerticalScroll.ts
import { ref, onMounted, onUnmounted, type Ref } from 'vue'

interface VerticalScrollState {
  isAtTop: Ref<boolean>
  isAtBottom: Ref<boolean>
  canScrollUp: Ref<boolean>
  canScrollDown: Ref<boolean>
  scrollProgress: Ref<number>
  checkScrollState: () => void
  scrollToTop: () => void
  scrollToBottom: () => void
  scrollBy: (pixels: number) => void
}

export function useVerticalScroll(
  scrollContainerRef: Ref<HTMLElement | null>,
): VerticalScrollState {
  const isAtTop = ref(true)
  const isAtBottom = ref(false)
  const canScrollUp = ref(false)
  const canScrollDown = ref(false)
  const scrollProgress = ref(0)

  const checkScrollState = () => {
    if (!scrollContainerRef.value) return

    const container = scrollContainerRef.value
    const { scrollTop, scrollHeight, clientHeight } = container
    const scrollBottom = scrollTop + clientHeight

    isAtTop.value = scrollTop <= 0
    isAtBottom.value = scrollBottom >= scrollHeight - 1
    canScrollUp.value = scrollTop > 0
    canScrollDown.value = scrollBottom < scrollHeight - 1

    // Расчет прогресса прокрутки (0% - 100%)
    const maxScroll = scrollHeight - clientHeight
    scrollProgress.value = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
  }

  const scrollToTop = () => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const scrollToBottom = () => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollTo({
        top: scrollContainerRef.value.scrollHeight,
        behavior: 'smooth',
      })
    }
  }

  const scrollBy = (pixels: number) => {
    if (scrollContainerRef.value) {
      scrollContainerRef.value.scrollBy({ top: pixels, behavior: 'smooth' })
    }
  }

  const handleResize = () => {
    checkScrollState()
  }

  onMounted(() => {
    checkScrollState()
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', handleResize)
  })

  return {
    isAtTop,
    isAtBottom,
    canScrollUp,
    canScrollDown,
    scrollProgress,
    checkScrollState,
    scrollToTop,
    scrollToBottom,
    scrollBy,
  }
}
