import { TooltipProvider } from './ui/tooltip'
import { Sidebar } from './Sidebar'
import { Library } from './Library'
import { Reader } from './Reader'
import { useAppStore } from '../store/appStore'

export function Layout() {
  const currentView = useAppStore((s) => s.currentView)
  const currentBookId = useAppStore((s) => s.currentBookId)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex overflow-hidden bg-background">
        <Sidebar />
        <main className="flex-1 flex overflow-hidden">
          {currentView === 'reader' && currentBookId ? <Reader /> : <Library />}
        </main>
      </div>
    </TooltipProvider>
  )
}
