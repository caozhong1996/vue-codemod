import { onBeforeMount, onUnmounted } from 'vue'

export function onWindowResize (callback: (this: Window, ev: UIEvent) => unknown): void {
  onBeforeMount(() => {
    window.addEventListener('resize', callback)
  })
  onUnmounted(() => {
    window.removeEventListener('resize', callback)
  })
}
