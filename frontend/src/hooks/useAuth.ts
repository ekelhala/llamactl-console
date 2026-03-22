import { useState } from 'react'
import { ApiServiceError } from '@/services/api'
import { getCurrentUser, login, logout } from '@/services/userService'
import type { AuthenticatedUser } from '@/services/userService'

export type SignInInput = {
  username: string
  password: string
}

type AuthStatus = 'unauthenticated' | 'authenticated'

export function useAuth() {
  const [status, setStatus] = useState<AuthStatus>('unauthenticated')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [user, setUser] = useState<AuthenticatedUser | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [refreshToken, setRefreshToken] = useState('')

  async function signIn(credentials: SignInInput) {
    setIsSubmitting(true)
    setErrorMessage('')
    setInfoMessage('')

    try {
      const loginData = await login(credentials)
      let authenticatedUser = loginData.user || null

      try {
        const meData = await getCurrentUser(loginData.access_token)
        if (meData.user) {
          authenticatedUser = meData.user
        }
      } catch {
        setInfoMessage('login succeeded, but /api/auth/me verification failed')
      }

      if (!authenticatedUser) {
        authenticatedUser = { username: credentials.username }
      }

      setAccessToken(loginData.access_token)
      setRefreshToken(loginData.refresh_token)
      setUser(authenticatedUser)
      setStatus('authenticated')
    } catch (error) {
      setStatus('unauthenticated')
      setAccessToken('')
      setRefreshToken('')
      setUser(null)

      if (error instanceof ApiServiceError) {
        setErrorMessage(error.message)
      } else {
        setErrorMessage('network error while contacting backend')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function signOut() {
    const tokenToRevoke = refreshToken

    if (tokenToRevoke) {
      try {
        await logout({ refresh_token: tokenToRevoke })
      } catch {
        // Always clear local auth state even if backend logout fails.
      }
    }

    setStatus('unauthenticated')
    setAccessToken('')
    setRefreshToken('')
    setUser(null)
    setErrorMessage('')
    setInfoMessage('')
  }

  return {
    status,
    isSubmitting,
    errorMessage,
    infoMessage,
    user,
    accessToken,
    signIn,
    signOut,
  }
}