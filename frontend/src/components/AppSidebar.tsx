import { useEffect, useRef, useState } from 'react'
import { IconChevronUp, IconDatabaseCog, IconLogout, IconServer, IconUserCircle } from '@tabler/icons-react'
import { NavLink } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

type NavItem = {
  label: string
  to: string
  icon: typeof IconServer
}

type AppSidebarProps = {
  displayName: string
  displayRole: string
  onSignOut: () => Promise<void>
}

const navItems: NavItem[] = [
  {
    label: 'Instances',
    to: '/instances',
    icon: IconServer,
  },
  {
    label: 'API Keys',
    to: '/api-keys',
    icon: IconDatabaseCog,
  },
]

export function AppSidebar({ displayName, displayRole, onSignOut }: AppSidebarProps) {
  const [isActionsOpen, setIsActionsOpen] = useState(false)
  const actionsRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setIsActionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <Sidebar collapsible="icon" variant="sidebar">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild tooltip={item.label}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => (isActive ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '')}
                    >
                      <item.icon />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div ref={actionsRef} className="relative">
          {isActionsOpen ? (
            <div className="absolute right-0 bottom-full left-0 mb-2 rounded-md border border-sidebar-border bg-sidebar p-1 shadow-md">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                onClick={() => {
                  setIsActionsOpen(false)
                  void onSignOut()
                }}
              >
                <IconLogout className="size-4" />
                <span>Log Out</span>
              </button>
            </div>
          ) : null}

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => setIsActionsOpen((value) => !value)}
          >
            <IconUserCircle className="size-4 shrink-0" />
            <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-sidebar-foreground/70">{displayRole || 'Signed in'}</p>
            </div>
            <IconChevronUp
              className={`size-4 shrink-0 transition-transform group-data-[collapsible=icon]:hidden ${
                isActionsOpen ? '' : 'rotate-180'
              }`}
            />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
