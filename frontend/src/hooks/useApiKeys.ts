import { useCallback, useState } from 'react'
import { ApiServiceError } from '@/services/api'
import {
  createApiKey,
  deleteApiKey,
  getApiKeyPermissions,
  listApiKeys,
} from '@/services/apiKeyService'
import {
  type ApiKey,
  type CreateKeyRequest,
  type CreateKeyResponse,
  type KeyPermissionResponse,
} from '@/types/apiKey'

type UseApiKeysState = {
  keys: ApiKey[]
  permissionsByKeyId: Record<number, KeyPermissionResponse[]>
  createdKey: CreateKeyResponse | null
  isLoading: boolean
  activeActionKey: string
  errorMessage: string
  loadKeys: () => Promise<void>
  createKey: (request: CreateKeyRequest) => Promise<CreateKeyResponse | null>
  removeKey: (id: number) => Promise<void>
  loadPermissions: (id: number) => Promise<void>
  clearCreatedKey: () => void
}

function toDisplayError(error: unknown, fallbackMessage: string): string {
  if (error instanceof ApiServiceError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return fallbackMessage
}

export function useApiKeys(accessToken: string): UseApiKeysState {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [permissionsByKeyId, setPermissionsByKeyId] = useState<Record<number, KeyPermissionResponse[]>>({})
  const [createdKey, setCreatedKey] = useState<CreateKeyResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [activeActionKey, setActiveActionKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadKeys = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const items = await listApiKeys(accessToken)
      setKeys(items)
    } catch (error) {
      setErrorMessage(toDisplayError(error, 'failed to load api keys'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  const createKey = useCallback(
    async (request: CreateKeyRequest): Promise<CreateKeyResponse | null> => {
      if (!accessToken) {
        return null
      }

      setActiveActionKey('create')
      setErrorMessage('')

      try {
        const created = await createApiKey(accessToken, request)
        setCreatedKey(created)
        await loadKeys()
        return created
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to create api key'))
        return null
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken, loadKeys]
  )

  const removeKey = useCallback(
    async (id: number) => {
      if (!accessToken) {
        return
      }

      setActiveActionKey(`delete:${id}`)
      setErrorMessage('')

      try {
        await deleteApiKey(accessToken, id)
        setPermissionsByKeyId((current) => {
          if (!(id in current)) {
            return current
          }

          const next = { ...current }
          delete next[id]
          return next
        })
        await loadKeys()
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to delete api key'))
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken, loadKeys]
  )

  const loadPermissions = useCallback(
    async (id: number) => {
      if (!accessToken) {
        return
      }

      setActiveActionKey(`permissions:${id}`)
      setErrorMessage('')

      try {
        const permissions = await getApiKeyPermissions(accessToken, id)
        setPermissionsByKeyId((current) => ({
          ...current,
          [id]: permissions,
        }))
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to load api key permissions'))
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken]
  )

  function clearCreatedKey() {
    setCreatedKey(null)
  }

  return {
    keys,
    permissionsByKeyId,
    createdKey,
    isLoading,
    activeActionKey,
    errorMessage,
    loadKeys,
    createKey,
    removeKey,
    loadPermissions,
    clearCreatedKey,
  }
}
