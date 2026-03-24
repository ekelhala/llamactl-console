import { useCallback, useMemo, useState } from 'react'
import { ApiServiceError } from '@/services/api'
import {
  getInstanceLogs,
  listInstances,
  restartInstance,
  startInstance,
  stopInstance,
} from '@/services/instanceService'
import { type Instance, type InstanceStatus } from '@/types/instance'

export type InstanceAction = 'start' | 'stop' | 'restart' | 'logs'
export type InstanceStatusKind = 'running' | 'stopped' | 'transitioning'

export type InstanceRow = Instance & {
  statusKind: InstanceStatusKind
  availableActions: InstanceAction[]
}

type UseInstancesState = {
  rows: InstanceRow[]
  isLoading: boolean
  isLoadingLogs: boolean
  errorMessage: string
  logsError: string
  selectedLogsName: string
  logsText: string
  activeActionKey: string
  loadInstances: () => Promise<void>
  runAction: (name: string, action: InstanceAction) => Promise<void>
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

function normalizeStatus(status: InstanceStatus): InstanceStatusKind {
  if (status === 'running') {
    return 'running'
  }

  if (status === 'stopped' || status === 'failed') {
    return 'stopped'
  }

  if (status === 'restarting' || status === 'shutting_down') {
    return 'transitioning'
  }

  return 'stopped'
}

function actionsForStatus(statusKind: InstanceStatusKind): InstanceAction[] {
  if (statusKind === 'running') {
    return ['stop', 'restart', 'logs']
  }

  if (statusKind === 'stopped') {
    return ['start', 'logs']
  }

  if (statusKind === 'transitioning') {
    return ['logs']
  }

  return ['logs']
}

export function useInstances(accessToken: string): UseInstancesState {
  const [instances, setInstances] = useState<Instance[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeActionKey, setActiveActionKey] = useState('')
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [selectedLogsName, setSelectedLogsName] = useState('')
  const [logsText, setLogsText] = useState('')
  const [logsError, setLogsError] = useState('')

  const rows = useMemo<InstanceRow[]>(() => {
    return [...instances]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((instance) => {
        const statusKind = normalizeStatus(instance.status)
        return {
          ...instance,
          statusKind,
          availableActions: actionsForStatus(statusKind),
        }
      })
  }, [instances])

  const loadInstances = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    try {
      const items = await listInstances(accessToken)
      setInstances(items)
    } catch (error) {
      setErrorMessage(toDisplayError(error, 'failed to load instances'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  const runAction = useCallback(
    async (name: string, action: InstanceAction) => {
      if (!accessToken) {
        return
      }

      const actionKey = `${name}:${action}`
      setActiveActionKey(actionKey)
      setErrorMessage('')

      try {
        if (action === 'start') {
          await startInstance(accessToken, name)
        }

        if (action === 'stop') {
          await stopInstance(accessToken, name)
        }

        if (action === 'restart') {
          await restartInstance(accessToken, name)
        }

        if (action === 'logs') {
          setLogsError('')
          setIsLoadingLogs(true)
          setSelectedLogsName(name)
          const content = await getInstanceLogs(accessToken, name, 200)
          setLogsText(content || '(no log output)')
        }

        await loadInstances()
      } catch (error) {
        const fallback = action === 'logs' ? 'failed to load logs' : `failed to ${action} instance`
        const message = toDisplayError(error, fallback)

        if (action === 'logs') {
          setLogsError(message)
        } else {
          setErrorMessage(message)
        }
      } finally {
        setIsLoadingLogs(false)
        setActiveActionKey('')
      }
    },
    [accessToken, loadInstances]
  )

  return {
    rows,
    isLoading,
    isLoadingLogs,
    errorMessage,
    logsError,
    selectedLogsName,
    logsText,
    activeActionKey,
    loadInstances,
    runAction,
  }
}
