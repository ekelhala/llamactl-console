import { useEffect, useMemo, useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ApiServiceError } from '@/services/api'
import { listInstances, type InstanceSummary } from '@/services/instanceService'

type InstanceDetailPageProps = {
  accessToken: string
}

type InstanceSettings = {
  backend: string
  model: string
  maxConcurrency: string
  contextWindow: string
  temperature: string
  autoRestart: boolean
}

const defaultSettings: InstanceSettings = {
  backend: '',
  model: '',
  maxConcurrency: '4',
  contextWindow: '4096',
  temperature: '0.7',
  autoRestart: true,
}

function toDisplayError(error: unknown): string {
  if (error instanceof ApiServiceError) {
    return error.message
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return 'failed to load instance details'
}

function storageKey(name: string): string {
  return `instance-settings:${name}`
}

function normalizeStatus(status: string): 'running' | 'stopped' | 'transitioning' | 'unknown' {
  const value = status.trim().toLowerCase()

  if (['running', 'started', 'online', 'up'].includes(value)) {
    return 'running'
  }

  if (['stopped', 'offline', 'down', 'exited'].includes(value)) {
    return 'stopped'
  }

  if (['starting', 'stopping', 'restarting', 'pending'].includes(value)) {
    return 'transitioning'
  }

  return 'unknown'
}

function statusClass(status: string): string {
  const kind = normalizeStatus(status)

  if (kind === 'running') {
    return 'bg-emerald-100 text-emerald-800'
  }

  if (kind === 'stopped') {
    return 'bg-slate-100 text-slate-700'
  }

  if (kind === 'transitioning') {
    return 'bg-amber-100 text-amber-800'
  }

  return 'bg-sky-100 text-sky-800'
}

export function InstanceDetailPage({ accessToken }: InstanceDetailPageProps) {
  const { name: routeName } = useParams<{ name: string }>()
  const instanceName = useMemo(() => (routeName ? decodeURIComponent(routeName) : ''), [routeName])

  const [instance, setInstance] = useState<InstanceSummary | null>(null)
  const [settings, setSettings] = useState<InstanceSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [saveMessage, setSaveMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadInstance() {
      if (!instanceName || !accessToken) {
        if (isMounted) {
          setErrorMessage('instance name is missing')
          setIsLoading(false)
        }
        return
      }

      setIsLoading(true)
      setErrorMessage('')
      setSaveMessage('')

      try {
        const instances = await listInstances(accessToken)
        const matched = instances.find((item) => item.name === instanceName) ?? null

        if (!isMounted) {
          return
        }

        if (!matched) {
          setErrorMessage(`instance "${instanceName}" was not found`)
          setInstance(null)
          return
        }

        setInstance(matched)

        let restored = defaultSettings
        try {
          const stored = window.localStorage.getItem(storageKey(matched.name))
          if (stored) {
            const parsed = JSON.parse(stored) as Partial<InstanceSettings>
            restored = {
              ...defaultSettings,
              ...parsed,
            }
          }
        } catch {
          restored = defaultSettings
        }

        setSettings({
          ...restored,
          backend: restored.backend || matched.backend,
          model: restored.model || matched.model,
        })
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toDisplayError(error))
          setInstance(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadInstance()

    return () => {
      isMounted = false
    }
  }, [accessToken, instanceName])

  function updateSetting<K extends keyof InstanceSettings>(key: K, value: InstanceSettings[K]) {
    setSaveMessage('')
    setSettings((current) => ({
      ...current,
      [key]: value,
    }))
  }

  function saveSettings() {
    if (!instance) {
      return
    }

    window.localStorage.setItem(storageKey(instance.name), JSON.stringify(settings))
    setSaveMessage('Settings saved locally for this instance.')
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <Button asChild type="button" variant="ghost" size="sm" className="-ml-2">
            <Link to="/instances">
              <IconArrowLeft className="size-4" />
              Back to instances
            </Link>
          </Button>
          <h1 className="text-lg font-semibold">{instanceName || 'Instance details'}</h1>
          <p className="text-sm text-muted-foreground">Tune model and runtime settings for this instance.</p>
        </div>

        {instance ? (
          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass(instance.status)}`}>
            {instance.status || 'unknown'}
          </span>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      {instanceName ? (
        <div>
          <Button asChild type="button" variant="outline" size="sm">
            <Link to={`/instances/${encodeURIComponent(instanceName)}/logs`}>View logs</Link>
          </Button>
        </div>
      ) : null}

      {isLoading ? <p className="text-sm text-muted-foreground">Loading instance details...</p> : null}

      {!isLoading && instance ? (
        <Card>
          <CardHeader>
            <CardTitle>Instance settings</CardTitle>
            <CardDescription>Adjust values and save when you are ready.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="backend">Backend</Label>
                <Input
                  id="backend"
                  value={settings.backend}
                  onChange={(event) => updateSetting('backend', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={settings.model}
                  onChange={(event) => updateSetting('model', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxConcurrency">Max concurrency</Label>
                <Input
                  id="maxConcurrency"
                  type="number"
                  min={1}
                  value={settings.maxConcurrency}
                  onChange={(event) => updateSetting('maxConcurrency', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contextWindow">Context window</Label>
                <Input
                  id="contextWindow"
                  type="number"
                  min={256}
                  value={settings.contextWindow}
                  onChange={(event) => updateSetting('contextWindow', event.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input
                  id="temperature"
                  type="number"
                  min={0}
                  max={2}
                  step="0.05"
                  value={settings.temperature}
                  onChange={(event) => updateSetting('temperature', event.target.value)}
                />
              </div>

              <label className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={settings.autoRestart}
                  onChange={(event) => updateSetting('autoRestart', event.target.checked)}
                />
                Auto-restart on failure
              </label>
            </div>

            <div className="mt-5 flex items-center gap-3">
              <Button type="button" onClick={saveSettings}>
                Save settings
              </Button>
              {saveMessage ? <p className="text-sm text-emerald-700">{saveMessage}</p> : null}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </section>
  )
}
