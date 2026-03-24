import { useCallback, useEffect, useState } from 'react'
import { IconRefresh, IconServer, IconStethoscope, IconVersions } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { useConfig } from '@/hooks/useConfig'
import { getHealth, getHealthLive, getHealthReady, listNodes, type NodeResponse } from '@/services/systemService'

type SystemPageProps = {
  accessToken: string
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

type HealthSnapshot = {
  health: unknown
  live: unknown
  ready: unknown
}

type HealthState = 'healthy' | 'degraded' | 'unknown'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function deriveHealthState(payload: unknown): HealthState {
  if (!isObject(payload)) {
    return 'unknown'
  }

  const status = payload.status
  if (typeof status === 'string') {
    const normalized = status.toLowerCase()
    if (normalized === 'ok' || normalized === 'healthy' || normalized === 'up') {
      return 'healthy'
    }
    if (normalized === 'degraded' || normalized === 'down' || normalized === 'error' || normalized === 'unhealthy') {
      return 'degraded'
    }
  }

  return 'unknown'
}

function statePillClassName(state: HealthState): string {
  if (state === 'healthy') {
    return 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/80 dark:bg-emerald-950/40 dark:text-emerald-300'
  }

  if (state === 'degraded') {
    return 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-900/80 dark:bg-amber-950/40 dark:text-amber-300'
  }

  return 'border-slate-300 bg-slate-100 text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300'
}

function prettyStateLabel(state: HealthState): string {
  if (state === 'healthy') {
    return 'Healthy'
  }

  if (state === 'degraded') {
    return 'Degraded'
  }

  return 'Unknown'
}

export function SystemPage({ accessToken }: SystemPageProps) {
  const { config, version, isLoading, errorMessage, loadSystemInfo } = useConfig(accessToken)

  const [nodes, setNodes] = useState<Record<string, NodeResponse>>({})
  const [health, setHealth] = useState<HealthSnapshot | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null)
  const [pageError, setPageError] = useState('')

  const refreshHealthAndNodes = useCallback(async () => {
    const [healthPayload, livePayload, readyPayload, nodesPayload] = await Promise.all([
      getHealth(),
      getHealthLive(),
      getHealthReady(),
      listNodes(accessToken),
    ])

    setHealth({
      health: healthPayload,
      live: livePayload,
      ready: readyPayload,
    })
    setNodes(nodesPayload)
  }, [accessToken])

  const refreshAll = useCallback(async () => {
    setPageError('')

    try {
      await Promise.all([loadSystemInfo(), refreshHealthAndNodes()])
      setLastUpdatedAt(new Date())
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'failed to refresh system overview')
    }
  }, [loadSystemInfo, refreshHealthAndNodes])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshAll()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [refreshAll])

  const healthItems = [
    { label: '/health', payload: health?.health },
    { label: '/health/live', payload: health?.live },
    { label: '/health/ready', payload: health?.ready },
  ]

  const nodeEntries = Object.entries(nodes)

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">System</h1>
          <p className="text-sm text-muted-foreground">Live system overview for configuration, version, health, and node status.</p>
          {lastUpdatedAt ? (
            <p className="mt-1 text-xs text-muted-foreground">Last updated: {lastUpdatedAt.toLocaleString()}</p>
          ) : null}
        </div>

        <Button type="button" variant="outline" onClick={() => void refreshAll()} disabled={isLoading}>
          <IconRefresh className={isLoading ? 'animate-spin' : ''} />
          Refresh overview
        </Button>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      {pageError ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</p>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-border/80 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-md bg-slate-100 p-1.5 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              <IconVersions className="size-4" />
            </div>
            <h2 className="text-base font-medium">Version</h2>
          </div>
          <pre className="max-h-48 overflow-auto rounded-md bg-muted/30 p-3 text-xs sm:text-sm">
            {version ? pretty(version) : 'No version data yet.'}
          </pre>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-md bg-slate-100 p-1.5 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
              <IconStethoscope className="size-4" />
            </div>
            <h2 className="text-base font-medium">Health</h2>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {healthItems.map((item) => {
              const state = deriveHealthState(item.payload)
              return (
                <article key={item.label} className="rounded-lg border border-border/70 bg-muted/10 p-3">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statePillClassName(state)}`}>
                    {prettyStateLabel(state)}
                  </p>
                </article>
              )
            })}
          </div>

          <pre className="mt-3 max-h-44 overflow-auto rounded-md bg-muted/30 p-3 text-xs">
            {health ? pretty(health) : 'No health data yet.'}
          </pre>
        </div>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <div className="rounded-md bg-slate-100 p-1.5 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
            <IconServer className="size-4" />
        </div>
          <h2 className="text-base font-medium">Nodes</h2>
          <span className="ml-auto rounded-full border border-border bg-muted/20 px-2 py-0.5 text-xs text-muted-foreground">
            {nodeEntries.length} total
          </span>
        </div>

        {nodeEntries.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {nodeEntries.map(([name, node]) => (
              <article key={name} className="rounded-lg border border-border/70 bg-muted/10 p-3">
                <p className="truncate text-sm font-medium">{name}</p>
                <p className="mt-1 break-all text-xs text-muted-foreground">{node.address || 'No address'}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No nodes data yet.</p>
        )}

        <pre className="mt-3 max-h-44 overflow-auto rounded-md bg-muted/30 p-3 text-xs">{nodeEntries.length > 0 ? pretty(nodes) : 'No nodes data yet.'}</pre>
      </div>

      <div className="rounded-xl border border-border/80 bg-card p-4">
        <h2 className="mb-3 text-base font-medium">Configuration</h2>
        <pre className="max-h-[32rem] overflow-auto rounded-md bg-muted/30 p-3 text-xs sm:text-sm">
          {config ? pretty(config) : 'No configuration data yet.'}
        </pre>
        <div className="mt-3 text-xs text-muted-foreground">
          Use this view to validate runtime settings such as server, auth, limits, and cluster nodes.
        </div>
      </div>
    </section>
  )
}
