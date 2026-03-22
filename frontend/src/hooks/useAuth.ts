import { useState } from 'react'
import { ApiServiceError } from '@/services/api'
import { getCurrentUser, login } from '@/services/userService'
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

      setUser(authenticatedUser)
      setStatus('authenticated')
    } catch (error) {
      setStatus('unauthenticated')
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

  function signOut() {
    setStatus('unauthenticated')
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
    signIn,
    signOut,
  }
}