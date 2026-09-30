export function useAutoResize() {
  const resize = (event) => {
    const el = event.target
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  return { resize }
}