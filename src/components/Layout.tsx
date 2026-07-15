import { TooltipProvider } from './ui/tooltip'
import { Sidebar } from './Sidebar'
import { Library } from './Library'
import { Reader } from './Reader'
import { useAppStore } from '../store/appStore'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { WifiOff } from 'lucide-react'

export function Layout() {
  const currentView = useAppStore((s) => s.currentView)
  const currentBookId = useAppStore((s) => s.currentBookId)
  const { isOffline } = useOnlineStatus()

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden relative">
          {isOffline && (
            <div className="absolute top-2 right-2 z-50 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-400">
              <WifiOff className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">Offline</span>
            </div>
          )}
          {currentView === 'reader' && currentBookId ? <Reader /> : <Library />}
        </main>
      </div>
    </TooltipProvider>
  )
}
