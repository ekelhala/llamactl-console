import { Navigate, Route, Routes } from 'react-router-dom'
import { AppSidebar } from '@/components/AppSidebar'
import { AppTopbar } from '@/components/AppTopbar'
import { LoginForm } from '@/components/LoginForm'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { useAuth } from '@/hooks/useAuth'
import { ApiKeysPage } from '@/pages/ApiKeysPage'
import { InstancesPage } from '@/pages/InstancesPage'

function App() {
  const { status, isSubmitting, errorMessage, user, accessToken, signIn, signOut } = useAuth()

  const isAuthenticated = status === 'authenticated'
  const displayName = user?.username || 'unknown user'
  const displayRole = user?.role ? ` (${user.role})` : ''

  if (!isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#fef3c7_0%,#f9fafb_40%,#e2e8f0_100%)] px-4 py-8 text-foreground dark:bg-[radial-gradient(circle_at_20%_20%,#3f3f46_0%,#18181b_50%,#09090b_100%)]">
        <section className="mx-auto w-full max-w-md">
          <LoginForm isSubmitting={isSubmitting} errorMessage={errorMessage} onSubmit={signIn} />
        </section>
      </main>
    )
  }

  return (
    <SidebarProvider>
      <AppSidebar displayName={displayName} displayRole={displayRole} onSignOut={signOut} />
      <SidebarInset className="bg-[radial-gradient(circle_at_15%_10%,#fff7ed_0%,#f8fafc_45%,#e2e8f0_100%)] dark:bg-[radial-gradient(circle_at_15%_10%,#3f3f46_0%,#18181b_45%,#09090b_100%)]">
        <AppTopbar />
        <div className="flex-1 p-4 md:p-6">
          <Routes>
            <Route path="/instances" element={<InstancesPage accessToken={accessToken} />} />
            <Route path="/api-keys" element={<ApiKeysPage />} />
            <Route path="*" element={<Navigate to="/instances" replace />} />
          </Routes>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
