import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LoginForm } from '@/components/LoginForm'
import { useAuth } from '@/hooks/useAuth'

function App() {
  const { status, isSubmitting, errorMessage, infoMessage, user, signIn, signOut } = useAuth()

  const isAuthenticated = status === 'authenticated'
  const displayName = user?.username || 'unknown user'
  const displayRole = user?.role ? ` (${user.role})` : ''

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(120deg,#f6f4ee_0%,#f0ebe2_45%,#e7ddd0_100%)] px-4 py-8 text-foreground">
      <section className="w-full max-w-md">
        {isAuthenticated ? (
          <Card className="border-stone-300/70 bg-white/90 shadow-xl backdrop-blur">
            <CardHeader>
              <CardTitle>Signed In</CardTitle>
              <CardDescription>{`Authenticated as ${displayName}${displayRole}`}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {infoMessage ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700">
                  {infoMessage}
                </p>
              ) : null}
              <Button className="w-full" type="button" variant="outline" onClick={signOut}>
                Sign Out
              </Button>
            </CardContent>
          </Card>
        ) : (
          <LoginForm isSubmitting={isSubmitting} errorMessage={errorMessage} onSubmit={signIn} />
        )}
      </section>
    </main>
  )
}

export default App
