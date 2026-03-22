import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRotateClockwise,
  IconTerminal2,
} from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInstances, type InstanceAction, type InstanceRow } from '@/hooks/useInstances'

type InstancesPageProps = {
  accessToken: string
}

type StatusMeta = {
  label: string
  dotClassName: string
}

const actionMeta: Record<InstanceAction, { label: string; icon: ComponentType<{ className?: string }> }> = {
  start: { label: 'Start', icon: IconPlayerPlay },
  stop: { label: 'Stop', icon: IconPlayerPause },
  restart: { label: 'Restart', icon: IconRotateClockwise },
  logs: { label: 'Logs', icon: IconTerminal2 },
}

function statusMeta(row: InstanceRow): StatusMeta {
  if (row.statusKind === 'running') {
    return { label: row.status || 'running', dotClassName: 'bg-emerald-500' }
  }

  if (row.statusKind === 'stopped') {
    return { label: row.status || 'stopped', dotClassName: 'bg-slate-400' }
  }

  if (row.statusKind === 'transitioning') {
    return { label: row.status || 'transitioning', dotClassName: 'bg-amber-500 animate-pulse' }
  }

  return { label: row.status || 'unknown', dotClassName: 'bg-sky-500' }
}

export function InstancesPage({ accessToken }: InstancesPageProps) {
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false)
  const logsViewportRef = useRef<HTMLDivElement | null>(null)

  const {
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
  } = useInstances(accessToken)

  useEffect(() => {
    void loadInstances()
  }, [loadInstances])

  useEffect(() => {
    if (!isLogsModalOpen) {
      return
    }

    const node = logsViewportRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [isLogsModalOpen, logsText])

  const logLines = useMemo(() => {
    return (logsText || '').replace(/\r\n/g, '\n').split('\n')
  }, [logsText])

  async function handleAction(instanceName: string, action: InstanceAction) {
    if (action === 'logs') {
      setIsLogsModalOpen(true)
    }

    await runAction(instanceName, action)
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold">Instances</h1>
            <p className="text-sm text-muted-foreground">View status, controls, and logs for your instances.</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void loadInstances()} disabled={isLoading}>
            <IconRefresh className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>

        {errorMessage ? (
          <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
        ) : null}

        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[760px] border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-foreground/80">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Backend</th>
                <th className="px-3 py-2 font-medium">Model</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                    {isLoading ? 'Loading instances...' : 'No instances found'}
                  </td>
                </tr>
              ) : (
                rows.map((instance) => {
                  const status = statusMeta(instance)
                  return (
                    <tr key={instance.name} className="border-t border-border/80 align-top">
                      <td className="px-3 py-3 font-medium text-foreground">{instance.name}</td>
                      <td className="px-3 py-3 text-foreground/90">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className={`size-2.5 rounded-full ${status.dotClassName}`}
                            aria-label={`Status ${status.label}`}
                            title={status.label}
                          />
                          <span>{status.label}</span>
                        </span>
                      </td>
                      <td className="px-3 py-3 text-foreground/90">{instance.backend}</td>
                      <td className="px-3 py-3 text-foreground/90">{instance.model}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1.5">
                          {instance.availableActions.map((action) => {
                            const metadata = actionMeta[action]
                            const Icon = metadata.icon
                            return (
                              <Button
                                key={`${instance.name}:${action}`}
                                size="sm"
                                type="button"
                                variant={action === 'logs' ? 'outline' : 'secondary'}
                                disabled={activeActionKey !== ''}
                                onClick={() => void handleAction(instance.name, action)}
                              >
                                <Icon />
                                {activeActionKey === `${instance.name}:${action}` ? 'Working...' : metadata.label}
                              </Button>
                            )
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Dialog open={isLogsModalOpen} onOpenChange={setIsLogsModalOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[90vh] max-w-[calc(100vw-1rem)] overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)] lg:max-w-[min(96vw,120rem)]">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{selectedLogsName ? `Logs: ${selectedLogsName}` : 'Instance Logs'}</DialogTitle>
            <DialogDescription>Recent output from the selected instance.</DialogDescription>
          </DialogHeader>

          <div className="space-y-2 px-4 pb-4 sm:px-6 sm:pb-6">
            {isLoadingLogs ? <p className="text-sm text-slate-600">Loading logs...</p> : null}
            {logsError ? (
              <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{logsError}</p>
            ) : null}
            <div
              ref={logsViewportRef}
              className="h-[calc(100dvh-9rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"
            >
              {logsText ? (
                <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-3 [webkit-overflow-scrolling:touch]">
                  <table className="w-max min-w-max border-collapse text-xs font-mono text-slate-800 dark:text-zinc-100">
                    <tbody>
                      {logLines.map((line, index) => (
                        <tr key={`${index}:${line.slice(0, 24)}`} className="align-top border-t border-transparent even:bg-slate-100/60 dark:even:bg-zinc-800/40">
                          <td className="sticky left-0 z-10 select-none border-r border-slate-200 bg-slate-100 px-2 py-1 text-right text-slate-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                            {index + 1}
                          </td>
                          <td className="px-3 py-1 whitespace-pre">{line || ' '}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-3 text-xs text-slate-600 dark:text-zinc-300">
                  No logs loaded yet. Select an instance and click Logs.
                </p>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
