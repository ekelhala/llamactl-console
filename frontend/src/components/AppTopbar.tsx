import { IconMoonStars, IconSun } from '@tabler/icons-react'
import { useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useTheme } from '@/hooks/useTheme'

const routeTitles: Record<string, string> = {
  '/instances': 'Instances',
  '/api-keys': 'API Keys',
}

export function AppTopbar() {
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()
  const title = location.pathname.endsWith('/logs')
    ? 'Instance Logs'
    : location.pathname.startsWith('/instances/')
      ? 'Instance Settings'
      : (routeTitles[location.pathname] || 'Dashboard')
  const isDark = theme === 'dark'

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-950/80">
      <SidebarTrigger />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">{title}</p>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={toggleTheme}>
        {isDark ? <IconSun className="size-4" /> : <IconMoonStars className="size-4" />}
        {isDark ? 'Light' : 'Dark'}
      </Button>
    </header>
  )
}
