import { useEffect } from 'react'
import { Layout } from './components/Layout'
import { InstallPrompt } from './components/InstallPrompt'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/Toaster'
import { useAppStore } from './store/appStore'
import { initTauri, isTauri } from './lib/tauri'
import { logger } from './lib/logger'

function App() {
  const theme = useAppStore((s) => s.theme)

  useEffect(() => {
    if (isTauri()) {
      initTauri().catch((e) => logger.error('Failed to init Tauri APIs', e))
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      if (mq.matches) {
        root.classList.add('dark')
      } else {
        root.classList.remove('dark')
      }

      const handler = (e: MediaQueryListEvent) => {
        if (e.matches) root.classList.add('dark')
        else root.classList.remove('dark')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return (
    <ErrorBoundary>
      <Layout />
      {!isTauri() && <InstallPrompt />}
      <Toaster />
    </ErrorBoundary>
  )
}

export default App
