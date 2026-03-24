import { useCallback, useState } from 'react'
import { ApiServiceError } from '@/services/api'
import {
  cancelModelJob,
  deleteCachedModel,
  downloadModel,
  getModelJob,
  listCachedModels,
  listModelJobs,
  type DownloadModelRequest,
} from '@/services/modelService'
import { type CachedModel, type DownloadJob } from '@/types/model'

type UseModelsState = {
  cachedModels: CachedModel[]
  jobs: DownloadJob[]
  isLoadingModels: boolean
  isLoadingJobs: boolean
  activeActionKey: string
  errorMessage: string
  loadCachedModels: () => Promise<void>
  loadJobs: () => Promise<void>
  refreshAll: () => Promise<void>
  startDownload: (request: DownloadModelRequest) => Promise<DownloadJob | null>
  removeCachedModel: (repo: string, tag?: string) => Promise<void>
  refreshJob: (id: string) => Promise<void>
  cancelJob: (id: string) => Promise<void>
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

function upsertJob(items: DownloadJob[], nextJob: DownloadJob): DownloadJob[] {
  const existingIndex = items.findIndex((job) => job.id === nextJob.id)
  if (existingIndex === -1) {
    return [nextJob, ...items]
  }

  const next = [...items]
  next[existingIndex] = nextJob
  return next
}

export function useModels(accessToken: string): UseModelsState {
  const [cachedModels, setCachedModels] = useState<CachedModel[]>([])
  const [jobs, setJobs] = useState<DownloadJob[]>([])
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [isLoadingJobs, setIsLoadingJobs] = useState(false)
  const [activeActionKey, setActiveActionKey] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const loadCachedModels = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoadingModels(true)
    setErrorMessage('')

    try {
      const items = await listCachedModels(accessToken)
      setCachedModels(items)
    } catch (error) {
      setErrorMessage(toDisplayError(error, 'failed to load cached models'))
    } finally {
      setIsLoadingModels(false)
    }
  }, [accessToken])

  const loadJobs = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoadingJobs(true)
    setErrorMessage('')

    try {
      const items = await listModelJobs(accessToken)
      setJobs(items)
    } catch (error) {
      setErrorMessage(toDisplayError(error, 'failed to load model jobs'))
    } finally {
      setIsLoadingJobs(false)
    }
  }, [accessToken])

  const refreshAll = useCallback(async () => {
    await Promise.all([loadCachedModels(), loadJobs()])
  }, [loadCachedModels, loadJobs])

  const startDownload = useCallback(
    async (request: DownloadModelRequest): Promise<DownloadJob | null> => {
      if (!accessToken) {
        return null
      }

      setActiveActionKey('download')
      setErrorMessage('')

      try {
        const createdJob = await downloadModel(accessToken, request)
        setJobs((current) => upsertJob(current, createdJob))
        return createdJob
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to start model download'))
        return null
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken]
  )

  const removeCachedModel = useCallback(
    async (repo: string, tag?: string) => {
      if (!accessToken) {
        return
      }

      setActiveActionKey(`delete:${repo}:${tag || ''}`)
      setErrorMessage('')

      try {
        await deleteCachedModel(accessToken, repo, tag)
        await loadCachedModels()
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to delete cached model'))
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken, loadCachedModels]
  )

  const refreshJob = useCallback(
    async (id: string) => {
      if (!accessToken) {
        return
      }

      setActiveActionKey(`job:${id}`)
      setErrorMessage('')

      try {
        const job = await getModelJob(accessToken, id)
        setJobs((current) => upsertJob(current, job))
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to refresh model job'))
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken]
  )

  const cancelJobById = useCallback(
    async (id: string) => {
      if (!accessToken) {
        return
      }

      setActiveActionKey(`cancel:${id}`)
      setErrorMessage('')

      try {
        await cancelModelJob(accessToken, id)
        await loadJobs()
      } catch (error) {
        setErrorMessage(toDisplayError(error, 'failed to cancel model job'))
      } finally {
        setActiveActionKey('')
      }
    },
    [accessToken, loadJobs]
  )

  return {
    cachedModels,
    jobs,
    isLoadingModels,
    isLoadingJobs,
    activeActionKey,
    errorMessage,
    loadCachedModels,
    loadJobs,
    refreshAll,
    startDownload,
    removeCachedModel,
    refreshJob,
    cancelJob: cancelJobById,
  }
}
