import { useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LoginResponse = {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
  user?: {
    username?: string
    role?: string
  }
}

type MeResponse = {
  user?: {
    username?: string
    role?: string
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { error?: string }
    if (data.error) {
      return data.error
    }
  } catch {
    // Ignore non-JSON error responses.
  }

  return `request failed (${response.status})`
}

function App() {
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      if (!loginResponse.ok) {
        setErrorMessage(await parseErrorMessage(loginResponse))
        return
      }

      const loginData = (await loginResponse.json()) as LoginResponse

      const meResponse = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${loginData.access_token}`,
        },
      })

      if (!meResponse.ok) {
        setSuccessMessage('login succeeded, but /api/auth/me verification failed')
        return
      }

      const meData = (await meResponse.json()) as MeResponse
      const displayName = meData.user?.username || username
      const displayRole = meData.user?.role ? ` (${meData.user.role})` : ''
      setSuccessMessage(`login verified as ${displayName}${displayRole}`)
    } catch {
      setErrorMessage('network error while contacting backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(120deg,#f6f4ee_0%,#f0ebe2_45%,#e7ddd0_100%)] px-4 py-8 text-foreground">
      <section className="w-full max-w-md">
        <Card className="border-stone-300/70 bg-white/90 shadow-xl backdrop-blur">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Test login against the local proxy backend</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  disabled={isSubmitting}
                />
              </div>
              <Button className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </Button>

              {errorMessage ? (
                <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              ) : null}

              {successMessage ? (
                <p className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      </section>
    </main>
  )
}

export default App
