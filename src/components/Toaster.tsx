import { useEffect, useState } from 'react'
import { subscribeToasts, dismiss, type ToastData } from '../lib/toast'
import { cn } from '../lib/utils'

function variantClasses(v: ToastData['variant']) {
  switch (v) {
    case 'success':
      return 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-300'
    case 'error':
      return 'border-destructive/30 bg-destructive/10 text-destructive'
    default:
      return 'border-border bg-card text-card-foreground'
  }
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastData[]>([])
  useEffect(() => subscribeToasts(setToasts), [])

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 right-4 z-[100] flex w-[min(92vw,360px)] flex-col gap-2"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.variant === 'error' ? 'alert' : 'status'}
          className={cn('rounded-lg border p-3 shadow-lg backdrop-blur', variantClasses(t.variant))}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{t.title}</p>
              {t.description && <p className="mt-0.5 text-xs opacity-90">{t.description}</p>}
            </div>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
              className="rounded p-0.5 opacity-70 hover:opacity-100"
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
