import { useEffect, useMemo, useState } from 'react'
import { IconDotsVertical, IconDownload, IconRefresh, IconTrash, IconX } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useModels } from '@/hooks/useModels'

type ModelsPageProps = {
  accessToken: string
}

type CachedModelView = {
  key: string
  label: string
  repo: string
  tag?: string
}

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = value
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  const digits = size >= 100 ? 0 : size >= 10 ? 1 : 2
  return `${size.toFixed(digits)} ${units[unitIndex]}`
}

function getJobProgress(job: { progress?: { bytes_downloaded?: number; total_bytes?: number } }): {
  percent: number
  downloaded: number | null
  total: number | null
} | null {
  const downloaded = job.progress?.bytes_downloaded
  const total = job.progress?.total_bytes

  if (typeof downloaded !== 'number' || !Number.isFinite(downloaded) || downloaded < 0) {
    return null
  }

  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0) {
    return {
      percent: 0,
      downloaded,
      total: null,
    }
  }

  return {
    percent: Math.max(0, Math.min(100, (downloaded / total) * 100)),
    downloaded,
    total,
  }
}

function asPrettyJson(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

function toCachedModelView(model: unknown, index: number): CachedModelView {
  if (typeof model === 'string') {
    const [repo, tag] = model.includes(':') ? model.split(':', 2) : [model, '']
    return {
      key: `cached:${model}:${index}`,
      label: model,
      repo,
      tag: tag || undefined,
    }
  }

  if (model && typeof model === 'object') {
    const maybeRepo = Reflect.get(model, 'repo')
    const maybeTag = Reflect.get(model, 'tag')
    const maybeName = Reflect.get(model, 'name')
    const maybeModel = Reflect.get(model, 'model')
    const maybeId = Reflect.get(model, 'id')

    const repo =
      typeof maybeRepo === 'string' && maybeRepo.trim() !== ''
        ? maybeRepo
        : typeof maybeName === 'string' && maybeName.trim() !== ''
          ? maybeName
          : typeof maybeModel === 'string' && maybeModel.trim() !== ''
            ? maybeModel
            : ''

    const tag = typeof maybeTag === 'string' && maybeTag.trim() !== '' ? maybeTag : undefined
    const label = repo ? `${repo}${tag ? `:${tag}` : ''}` : asPrettyJson(model)
    const idPart = typeof maybeId === 'string' && maybeId.trim() !== '' ? maybeId : label

    return {
      key: `cached:${idPart}:${index}`,
      label,
      repo,
      tag,
    }
  }

  const label = String(model)
  return {
    key: `cached:${label}:${index}`,
    label,
    repo: label,
  }
}

export function ModelsPage({ accessToken }: ModelsPageProps) {
  const {
    cachedModels,
    jobs,
    isLoadingModels,
    isLoadingJobs,
    activeActionKey,
    errorMessage,
    loadJobs,
    refreshAll,
    startDownload,
    removeCachedModel,
    cancelJob,
  } = useModels(accessToken)

  const [repo, setRepo] = useState('')
  const [activeTab, setActiveTab] = useState<'cached' | 'jobs'>('cached')
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false)
  const [actionMenuModel, setActionMenuModel] = useState<CachedModelView | null>(null)
  const [pendingDeleteModel, setPendingDeleteModel] = useState<CachedModelView | null>(null)
  const [isInProgressSectionOpen, setIsInProgressSectionOpen] = useState(true)
  const [isCompletedSectionOpen, setIsCompletedSectionOpen] = useState(false)

  useEffect(() => {
    void refreshAll()
  }, [refreshAll])

  useEffect(() => {
    if (activeTab !== 'jobs') {
      return
    }

    void loadJobs()

    const intervalId = window.setInterval(() => {
      void loadJobs()
    }, 5000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [activeTab, loadJobs])

  async function handleDownload() {
    const trimmedRepo = repo.trim()
    if (!trimmedRepo) {
      return
    }

    try {
      await startDownload({ repo: trimmedRepo })
      setRepo('')
      setIsDownloadModalOpen(false)
    } catch {
      // Error state is surfaced by useModels.
    }
  }

  async function handleDeleteCachedModel(model: CachedModelView) {
    if (!model.repo.trim()) {
      return
    }

    await removeCachedModel(model.repo, model.tag)
  }

  async function handleConfirmDeleteCachedModel() {
    if (!pendingDeleteModel) {
      return
    }

    await handleDeleteCachedModel(pendingDeleteModel)
    setPendingDeleteModel(null)
  }

  function handleOpenDeleteDialogFromActionMenu() {
    if (!actionMenuModel) {
      return
    }

    setActionMenuModel(null)
    setPendingDeleteModel(actionMenuModel)
  }

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
  }, [jobs])

  const inProgressJobs = useMemo(() => {
    const inProgressStatuses = new Set(['queued', 'downloading', 'running', 'in_progress'])
    return sortedJobs.filter((job) => inProgressStatuses.has(job.status.toLowerCase()))
  }, [sortedJobs])

  const completedJobs = useMemo(() => {
    const inProgressStatuses = new Set(['queued', 'downloading', 'running', 'in_progress'])
    return sortedJobs.filter((job) => !inProgressStatuses.has(job.status.toLowerCase()))
  }, [sortedJobs])

  const cachedModelViews = useMemo(() => {
    return cachedModels.map((model, index) => toCachedModelView(model as unknown, index))
  }, [cachedModels])

  return (
    <section className="space-y-4 pb-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-lg font-semibold">Models</h1>
            <p className="text-sm text-muted-foreground">Manage cached models and active download jobs.</p>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Dialog open={isDownloadModalOpen} onOpenChange={setIsDownloadModalOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="w-full sm:w-auto" disabled={activeActionKey !== ''}>
                  <IconDownload />
                  Download model
                </Button>
              </DialogTrigger>

              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Download model</DialogTitle>
                  <DialogDescription>Enter the model repository in owner/model format to create a new download job.</DialogDescription>
                </DialogHeader>

                <div className="space-y-2">
                  <Label htmlFor="downloadRepo">Repository</Label>
                  <Input
                    id="downloadRepo"
                    value={repo}
                    onChange={(event) => setRepo(event.target.value)}
                    placeholder="owner/model"
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button
                    type="button"
                    onClick={() => void handleDownload()}
                    disabled={!repo.trim() || activeActionKey !== ''}
                  >
                    <IconDownload />
                    {activeActionKey === 'download' ? 'Starting...' : 'Start download'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => void refreshAll()}
              disabled={isLoadingModels || isLoadingJobs}
            >
              <IconRefresh className={isLoadingModels || isLoadingJobs ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="rounded-lg border border-border bg-card p-3 sm:p-4">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'cached' | 'jobs')} className="space-y-3">
          <TabsList className="grid h-auto w-full grid-cols-2">
            <TabsTrigger value="cached" className="py-1.5">Cached Models</TabsTrigger>
            <TabsTrigger value="jobs" className="py-1.5">Download Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="cached">
            <div className="space-y-2 sm:hidden">
              {cachedModelViews.length === 0 ? (
                <div className="rounded-lg border border-border bg-card px-3 py-6 text-sm text-muted-foreground">
                  {isLoadingModels ? 'Loading cache...' : 'No cached models found.'}
                </div>
              ) : (
                cachedModelViews.map((model) => (
                  <div
                    key={`mobile:${model.key}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{model.label}</span>

                    <div className="flex items-center">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="outline"
                        aria-label={`Open actions for ${model.label}`}
                        disabled={activeActionKey !== '' || !model.repo.trim()}
                        onClick={() => setActionMenuModel(model)}
                      >
                        <IconDotsVertical />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="hidden max-h-[28rem] overflow-auto sm:block">
              {cachedModelViews.length === 0 ? (
                <p className="px-2 py-3 text-sm text-muted-foreground">{isLoadingModels ? 'Loading cache...' : 'No cached models found.'}</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {cachedModelViews.map((model) => (
                    <li key={model.key} className="flex flex-col gap-2 px-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="min-w-0 flex-1 truncate text-sm">{model.label}</span>

                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          aria-label={`Open actions for ${model.label}`}
                          disabled={activeActionKey !== '' || !model.repo.trim()}
                          onClick={() => setActionMenuModel(model)}
                        >
                          <IconDotsVertical />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            {sortedJobs.length === 0 ? (
              <div className="rounded-lg border border-border bg-card px-3 py-6 text-sm text-muted-foreground">
                {isLoadingJobs ? 'Loading jobs...' : 'No jobs found.'}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-md border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
                    onClick={() => setIsInProgressSectionOpen((current) => !current)}
                  >
                    <span>In Progress ({inProgressJobs.length})</span>
                    <span className="text-muted-foreground">{isInProgressSectionOpen ? 'Hide' : 'Show'}</span>
                  </button>

                  {isInProgressSectionOpen ? (
                    <>
                      <div className="space-y-2 border-t border-border p-2 sm:hidden">
                        {inProgressJobs.length === 0 ? (
                          <div className="rounded-md border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
                            No in-progress jobs.
                          </div>
                        ) : (
                          inProgressJobs.map((job) => (
                            <div key={`mobile:inprogress:${job.id}`} className="space-y-2 rounded-lg border border-border bg-card px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{job.repo}</p>
                                  <p className="truncate text-xs text-muted-foreground">{job.id}</p>
                                </div>
                                <span className="w-fit rounded-full border border-border px-2 py-0.5 text-xs">{job.status}</span>
                              </div>

                              {(() => {
                                const progress = getJobProgress(job)
                                if (!progress) {
                                  return null
                                }

                                return (
                                  <div className="space-y-1.5">
                                    {progress.total !== null ? (
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{formatBytes(progress.downloaded ?? 0)} / {formatBytes(progress.total)}</span>
                                        <span>{Math.round(progress.percent)}%</span>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Downloaded {formatBytes(progress.downloaded ?? 0)}</p>
                                    )}

                                    {progress.total !== null ? (
                                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
                                      </div>
                                    ) : null}

                                    {job.progress?.current_file ? (
                                      <p className="truncate text-xs text-muted-foreground">File: {job.progress.current_file}</p>
                                    ) : null}
                                  </div>
                                )
                              })()}

                              {job.error ? <p className="text-xs text-red-700">{job.error}</p> : null}
                              <div className="flex justify-start">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full"
                                  onClick={() => void cancelJob(job.id)}
                                  disabled={activeActionKey !== '' || !['queued', 'downloading', 'running', 'in_progress'].includes(job.status)}
                                >
                                  <IconX />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="hidden max-h-[20rem] overflow-auto border-t border-border p-2 sm:block">
                        {inProgressJobs.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">No in-progress jobs.</p>
                        ) : (
                          <ul className="divide-y divide-border/60">
                            {inProgressJobs.map((job) => (
                              <li key={`desktop:inprogress:${job.id}`} className="space-y-2 px-2 py-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{job.repo}</p>
                                    <p className="text-xs text-muted-foreground">{job.id}</p>
                                  </div>
                                  <span className="w-fit rounded-full border border-border px-2 py-0.5 text-xs">{job.status}</span>
                                </div>

                                {(() => {
                                  const progress = getJobProgress(job)
                                  if (!progress) {
                                    return null
                                  }

                                  return (
                                    <div className="space-y-1.5">
                                      {progress.total !== null ? (
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{formatBytes(progress.downloaded ?? 0)} / {formatBytes(progress.total)}</span>
                                          <span>{Math.round(progress.percent)}%</span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Downloaded {formatBytes(progress.downloaded ?? 0)}</p>
                                      )}

                                      {progress.total !== null ? (
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                          <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
                                        </div>
                                      ) : null}

                                      {job.progress?.current_file ? (
                                        <p className="truncate text-xs text-muted-foreground">File: {job.progress.current_file}</p>
                                      ) : null}
                                    </div>
                                  )
                                })()}

                                {job.error ? <p className="text-xs text-red-700">{job.error}</p> : null}
                                <div className="flex justify-start sm:justify-end">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-full sm:w-auto"
                                    onClick={() => void cancelJob(job.id)}
                                    disabled={activeActionKey !== '' || !['queued', 'downloading', 'running', 'in_progress'].includes(job.status)}
                                  >
                                    <IconX />
                                    Cancel
                                  </Button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="rounded-md border border-border">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium"
                    onClick={() => setIsCompletedSectionOpen((current) => !current)}
                  >
                    <span>Completed ({completedJobs.length})</span>
                    <span className="text-muted-foreground">{isCompletedSectionOpen ? 'Hide' : 'Show'}</span>
                  </button>

                  {isCompletedSectionOpen ? (
                    <>
                      <div className="space-y-2 border-t border-border p-2 sm:hidden">
                        {completedJobs.length === 0 ? (
                          <div className="rounded-md border border-border bg-card px-3 py-4 text-sm text-muted-foreground">
                            No completed jobs.
                          </div>
                        ) : (
                          completedJobs.map((job) => (
                            <div key={`mobile:completed:${job.id}`} className="space-y-2 rounded-lg border border-border bg-card px-3 py-2">
                              <div className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">{job.repo}</p>
                                  <p className="truncate text-xs text-muted-foreground">{job.id}</p>
                                </div>
                                <span className="w-fit rounded-full border border-border px-2 py-0.5 text-xs">{job.status}</span>
                              </div>

                              {(() => {
                                const progress = getJobProgress(job)
                                if (!progress) {
                                  return null
                                }

                                return (
                                  <div className="space-y-1.5">
                                    {progress.total !== null ? (
                                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                                        <span>{formatBytes(progress.downloaded ?? 0)} / {formatBytes(progress.total)}</span>
                                        <span>{Math.round(progress.percent)}%</span>
                                      </div>
                                    ) : (
                                      <p className="text-xs text-muted-foreground">Downloaded {formatBytes(progress.downloaded ?? 0)}</p>
                                    )}

                                    {progress.total !== null ? (
                                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                        <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
                                      </div>
                                    ) : null}

                                    {job.progress?.current_file ? (
                                      <p className="truncate text-xs text-muted-foreground">File: {job.progress.current_file}</p>
                                    ) : null}
                                  </div>
                                )
                              })()}

                              {job.error ? <p className="text-xs text-red-700">{job.error}</p> : null}
                            </div>
                          ))
                        )}
                      </div>

                      <div className="hidden max-h-[20rem] overflow-auto border-t border-border p-2 sm:block">
                        {completedJobs.length === 0 ? (
                          <p className="px-2 py-3 text-sm text-muted-foreground">No completed jobs.</p>
                        ) : (
                          <ul className="divide-y divide-border/60">
                            {completedJobs.map((job) => (
                              <li key={`desktop:completed:${job.id}`} className="space-y-2 px-2 py-2">
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{job.repo}</p>
                                    <p className="text-xs text-muted-foreground">{job.id}</p>
                                  </div>
                                  <span className="w-fit rounded-full border border-border px-2 py-0.5 text-xs">{job.status}</span>
                                </div>

                                {(() => {
                                  const progress = getJobProgress(job)
                                  if (!progress) {
                                    return null
                                  }

                                  return (
                                    <div className="space-y-1.5">
                                      {progress.total !== null ? (
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                          <span>{formatBytes(progress.downloaded ?? 0)} / {formatBytes(progress.total)}</span>
                                          <span>{Math.round(progress.percent)}%</span>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground">Downloaded {formatBytes(progress.downloaded ?? 0)}</p>
                                      )}

                                      {progress.total !== null ? (
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                                          <div className="h-full bg-emerald-500 transition-[width] duration-300" style={{ width: `${progress.percent}%` }} />
                                        </div>
                                      ) : null}

                                      {job.progress?.current_file ? (
                                        <p className="truncate text-xs text-muted-foreground">File: {job.progress.current_file}</p>
                                      ) : null}
                                    </div>
                                  )
                                })()}

                                {job.error ? <p className="text-xs text-red-700">{job.error}</p> : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={Boolean(pendingDeleteModel)} onOpenChange={(open) => !open && setPendingDeleteModel(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete cached model?</DialogTitle>
            <DialogDescription>
              This will remove
              {' '}
              <span className="font-medium text-foreground">{pendingDeleteModel?.label ?? 'this model'}</span>
              {' '}
              from cache.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDeleteCachedModel()}
              disabled={activeActionKey !== '' || !pendingDeleteModel?.repo.trim()}
            >
              <IconTrash />
              Delete model
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={actionMenuModel !== null} onOpenChange={(open) => !open && setActionMenuModel(null)}>
        <SheetContent side="right" className="w-[85vw] max-w-sm">
          <SheetHeader>
            <SheetTitle>{actionMenuModel ? `${actionMenuModel.label} actions` : 'Model actions'}</SheetTitle>
            <SheetDescription>Choose an action for this cached model.</SheetDescription>
          </SheetHeader>

          {actionMenuModel ? (
            <div className="space-y-2 px-4 pb-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start text-red-700 hover:text-red-700"
                disabled={activeActionKey !== '' || !actionMenuModel.repo.trim()}
                onClick={handleOpenDeleteDialogFromActionMenu}
              >
                <IconTrash />
                Delete
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </section>
  )
}
