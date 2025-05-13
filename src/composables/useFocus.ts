import { type Ref, ref } from 'vue'

export function useFocus() {
  const elementRef: Ref<HTMLInputElement | null> = ref(null);

  const focus = () => {
    elementRef.value?.focus()
  };

  return {
    elementRef,
    focus
  };
}
