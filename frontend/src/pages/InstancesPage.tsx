import { useEffect, useMemo, useState, type ComponentType } from 'react'
import {
  IconDotsVertical,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconRotateClockwise,
  IconTerminal2,
} from '@tabler/icons-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
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
    return { label: row.status, dotClassName: 'bg-emerald-500' }
  }

  if (row.statusKind === 'stopped') {
    return { label: row.status, dotClassName: 'bg-slate-400' }
  }

  return { label: row.status, dotClassName: 'bg-amber-500 animate-pulse' }
}

export function InstancesPage({ accessToken }: InstancesPageProps) {
  const [actionMenuInstanceName, setActionMenuInstanceName] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    rows,
    isLoading,
    errorMessage,
    activeActionKey,
    loadInstances,
    runAction,
  } = useInstances(accessToken)

  useEffect(() => {
    void loadInstances()
  }, [loadInstances])

  const actionMenuInstance = useMemo(() => {
    if (!actionMenuInstanceName) {
      return null
    }

    return rows.find((row) => row.name === actionMenuInstanceName) ?? null
  }, [actionMenuInstanceName, rows])

  async function handleAction(instanceName: string, action: InstanceAction) {
    setActionMenuInstanceName(null)

    if (action === 'logs') {
      navigate(`/instances/${encodeURIComponent(instanceName)}/logs`)
      return
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

        <div className="space-y-2 sm:hidden">
          {rows.length === 0 ? (
            <div className="rounded-lg border border-border bg-card px-3 py-6 text-sm text-muted-foreground">
              {isLoading ? 'Loading instances...' : 'No instances found'}
            </div>
          ) : (
            rows.map((instance) => {
              const status = statusMeta(instance)
              return (
                <div
                  key={`mobile:${instance.name}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <span
                      className={`size-2.5 shrink-0 rounded-full ${status.dotClassName}`}
                      aria-label={`Status ${status.label}`}
                      title={status.label}
                    />
                    <Link className="block truncate font-medium text-foreground underline-offset-2 hover:underline" to={`/instances/${encodeURIComponent(instance.name)}`}>
                      {instance.name}
                    </Link>
                  </div>

                  <div className="flex items-center">
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="outline"
                      disabled={activeActionKey !== ''}
                      aria-label={`Open actions for ${instance.name}`}
                      onClick={() => setActionMenuInstanceName(instance.name)}
                    >
                      <IconDotsVertical />
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-muted/60 text-foreground/80">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-muted-foreground" colSpan={3}>
                    {isLoading ? 'Loading instances...' : 'No instances found'}
                  </td>
                </tr>
              ) : (
                rows.map((instance) => {
                  const status = statusMeta(instance)
                  return (
                    <tr key={instance.name} className="border-t border-border/80 align-top">
                      <td className="px-3 py-3 font-medium text-foreground">
                        <Link className="underline-offset-2 hover:underline" to={`/instances/${encodeURIComponent(instance.name)}`}>
                          {instance.name}
                        </Link>
                      </td>
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
                      <td className="px-3 py-2 text-right">
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="outline"
                            disabled={activeActionKey !== ''}
                            aria-label={`Open actions for ${instance.name}`}
                            onClick={() => setActionMenuInstanceName(instance.name)}
                          >
                            <IconDotsVertical />
                          </Button>
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

      <Sheet open={actionMenuInstance !== null} onOpenChange={(open) => !open && setActionMenuInstanceName(null)}>
        <SheetContent side="right" className="w-[85vw] max-w-sm">
          <SheetHeader>
            <SheetTitle>{actionMenuInstance ? `${actionMenuInstance.name} actions` : 'Instance actions'}</SheetTitle>
            <SheetDescription>Choose an action for this instance.</SheetDescription>
          </SheetHeader>

          {actionMenuInstance ? (
            <div className="space-y-2 px-4 pb-4">
              {actionMenuInstance.availableActions.map((action) => {
                const metadata = actionMeta[action]
                const Icon = metadata.icon
                return (
                  <Button
                    key={`${actionMenuInstance.name}:menu:${action}`}
                    type="button"
                    variant={action === 'logs' ? 'outline' : 'secondary'}
                    className="w-full justify-start"
                    disabled={activeActionKey !== ''}
                    onClick={() => void handleAction(actionMenuInstance.name, action)}
                  >
                    <Icon />
                    {activeActionKey === `${actionMenuInstance.name}:${action}` ? 'Working...' : metadata.label}
                  </Button>
                )
              })}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </>
  )
}
