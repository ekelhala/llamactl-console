import { IconLogout } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'

type AppTopbarProps = {
  displayName: string
  displayRole: string
  onSignOut: () => Promise<void>
}

const routeTitles: Record<string, string> = {
  '/instances': 'Instances',
  '/api-keys': 'API Keys',
}

export function AppTopbar({ displayName, displayRole, onSignOut }: AppTopbarProps) {
  const location = useLocation()
  const title = routeTitles[location.pathname] || 'Dashboard'

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <p className="truncate text-xs text-slate-500">{displayName}{displayRole}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => void onSignOut()}>
        <IconLogout />
        Sign Out
      </Button>
    </header>
  )
}
