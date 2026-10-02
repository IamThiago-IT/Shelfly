export interface ToastData {
  id: number
  title: string
  description?: string
  variant: 'success' | 'error' | 'info'
}

type Listener = (toasts: ToastData[]) => void

let toasts: ToastData[] = []
let listeners = new Set<Listener>()
let nextId = 1

function emit() {
  for (const l of listeners) l([...toasts])
}

function push(title: string, variant: ToastData['variant'], description?: string) {
  const id = nextId++
  toasts = [...toasts, { id, title, description, variant }]
  emit()
  setTimeout(() => dismiss(id), 4500)
}

export function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

export const toast = {
  success: (title: string, description?: string) => push(title, 'success', description),
  error: (title: string, description?: string) => push(title, 'error', description),
  info: (title: string, description?: string) => push(title, 'info', description),
}

export function subscribeToasts(listener: Listener): () => void {
  listeners.add(listener)
  listener([...toasts])
  return () => {
    listeners.delete(listener)
  }
}
