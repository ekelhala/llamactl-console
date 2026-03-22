import { useLocation } from 'react-router-dom'
import { SidebarTrigger } from '@/components/ui/sidebar'

const routeTitles: Record<string, string> = {
  '/instances': 'Instances',
  '/api-keys': 'API Keys',
}

export function AppTopbar() {
  const location = useLocation()
  const title = routeTitles[location.pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
      </div>
    </header>
  )
}
