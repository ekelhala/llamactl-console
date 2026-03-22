import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function App() {
  return (
    <main className="min-h-screen bg-[linear-gradient(120deg,#f6f4ee_0%,#f0ebe2_45%,#e7ddd0_100%)] px-4 py-8 text-foreground md:px-8">
      <section className="mx-auto grid w-full max-w-6xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="border-stone-300/70 bg-white/80 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl tracking-tight">llamactl Console</CardTitle>
            <CardDescription>
              Vite + Bun + shadcn UI scaffold ready for the first MVP slices.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-stone-200 bg-stone-50 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Instances</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-stone-200 bg-stone-50 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Active Keys</CardDescription>
                  <CardTitle className="text-3xl">0</CardTitle>
                </CardHeader>
              </Card>
              <Card className="border-stone-200 bg-stone-50 shadow-none">
                <CardHeader className="pb-2">
                  <CardDescription>Users</CardDescription>
                  <CardTitle className="text-3xl">1</CardTitle>
                </CardHeader>
              </Card>
            </div>

            <div className="rounded-xl border border-stone-300 bg-white p-4">
              <p className="text-sm text-muted-foreground">
                Next step: connect frontend routes to proxy endpoints under /api while keeping upstream
                management credentials server-side.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-stone-300/70 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Local auth for the proxy backend</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" placeholder="admin" autoComplete="username" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" />
              </div>
              <Button className="w-full" type="submit">
                Sign In
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default App
