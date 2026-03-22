import { IconDatabaseCog, IconServer } from '@tabler/icons-react'
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

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon" variant="inset">
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

      <SidebarFooter>
        <p className="px-2 text-xs text-sidebar-foreground/70">MVP milestone 2</p>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
