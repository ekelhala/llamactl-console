import { useCallback, useState } from 'react'
import { ApiServiceError } from '@/services/api'
import { getConfig, getVersion, type VersionInfo } from '@/services/configService'
import { type AppConfig } from '@/types/config'

type UseConfigState = {
  config: AppConfig | null
  version: VersionInfo | null
  isLoading: boolean
  errorMessage: string
  loadSystemInfo: () => Promise<void>
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

export function useConfig(accessToken: string): UseConfigState {
  const [config, setConfig] = useState<AppConfig | null>(null)
  const [version, setVersion] = useState<VersionInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const loadSystemInfo = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const [configPayload, versionPayload] = await Promise.all([
        getConfig(accessToken),
        getVersion(accessToken),
      ])

      setConfig(configPayload)
      setVersion(versionPayload)
    } catch (error) {
      setErrorMessage(toDisplayError(error, 'failed to load system config'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  return {
    config,
    version,
    isLoading,
    errorMessage,
    loadSystemInfo,
  }
}
