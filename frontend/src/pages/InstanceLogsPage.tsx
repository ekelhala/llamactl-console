import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconArrowLeft, IconRefresh } from '@tabler/icons-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ApiServiceError } from '@/services/api'
import { getInstanceLogs } from '@/services/instanceService'

type InstanceLogsPageProps = {
  accessToken: string
}

function toDisplayError(error: unknown): string {
  if (error instanceof ApiServiceError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return 'failed to load logs'
}

export function InstanceLogsPage({ accessToken }: InstanceLogsPageProps) {
  const { name: routeName } = useParams<{ name: string }>()
  const instanceName = useMemo(() => (routeName ? decodeURIComponent(routeName) : ''), [routeName])

  const [isLoading, setIsLoading] = useState(false)
  const [logsError, setLogsError] = useState('')
  const [logsText, setLogsText] = useState('')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const logsViewportRef = useRef<HTMLDivElement | null>(null)

  const logLines = useMemo(() => {
    return (logsText || '').replace(/\r\n/g, '\n').split('\n')
  }, [logsText])

  const loadLogs = useCallback(async () => {
    if (!instanceName || !accessToken) {
      setLogsError('instance name is missing')
      return
    }

    setIsLoading(true)
    setLogsError('')

    try {
      const content = await getInstanceLogs(accessToken, instanceName, 500)
      setLogsText(content || '(no log output)')
    } catch (error) {
      setLogsError(toDisplayError(error))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, instanceName])

  useEffect(() => {
    void loadLogs()
  }, [loadLogs])

  useEffect(() => {
    if (!autoRefresh || !instanceName || !accessToken) {
      return
    }

    const id = window.setInterval(() => {
      void loadLogs()
    }, 5000)

    return () => window.clearInterval(id)
  }, [accessToken, autoRefresh, instanceName, loadLogs])

  useEffect(() => {
    const node = logsViewportRef.current
    if (node) {
      node.scrollTop = node.scrollHeight
    }
  }, [logsText])

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild type="button" variant="ghost" size="sm" className="-ml-2">
            <Link to={`/instances/${encodeURIComponent(instanceName)}`}>
              <IconArrowLeft className="size-4" />
              Back to instance
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">Logs: {instanceName || 'instance'}</h1>
          <p className="text-sm text-muted-foreground">Live output and recent history for this instance.</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={autoRefresh ? 'secondary' : 'outline'}
            onClick={() => setAutoRefresh((current) => !current)}
          >
            {autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
          </Button>

          <Button type="button" variant="outline" onClick={() => void loadLogs()} disabled={isLoading}>
            <IconRefresh className={isLoading ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {logsError ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{logsError}</p>
      ) : null}

      <div
        ref={logsViewportRef}
        className="h-[calc(100dvh-13rem)] overflow-y-auto overflow-x-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {logsText ? (
          <div className="overflow-x-auto overscroll-x-contain touch-pan-x pb-3 [webkit-overflow-scrolling:touch]">
            <table className="w-max min-w-max border-collapse text-xs font-mono text-slate-800 dark:text-zinc-100">
              <tbody>
                {logLines.map((line, index) => (
                  <tr
                    key={`${index}:${line.slice(0, 24)}`}
                    className="align-top border-t border-transparent even:bg-slate-100/60 dark:even:bg-zinc-800/40"
                  >
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
          <p className="p-3 text-xs text-slate-600 dark:text-zinc-300">No log output yet.</p>
        )}
      </div>
    </section>
  )
}
