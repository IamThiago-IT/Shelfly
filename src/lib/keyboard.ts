import { useEffect, type RefObject } from 'react'

type KeyHandler = (e: KeyboardEvent) => void

interface KeyboardShortcut {
  key: string
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
  handler: KeyHandler
  enabled?: boolean
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  element?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const target = element?.current ?? window

    const handler = (e: Event) => {
      const ke = e as KeyboardEvent
      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keyMatch = ke.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatch = shortcut.ctrl ? (ke.ctrlKey || ke.metaKey) : !(ke.ctrlKey || ke.metaKey)
        const shiftMatch = shortcut.shift ? ke.shiftKey : !ke.shiftKey
        const altMatch = shortcut.alt ? ke.altKey : !ke.altKey

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          ke.preventDefault()
          shortcut.handler(ke)
          return
        }
      }
    }

    target.addEventListener('keydown', handler)
    return () => target.removeEventListener('keydown', handler)
  }, [shortcuts, element])
}
