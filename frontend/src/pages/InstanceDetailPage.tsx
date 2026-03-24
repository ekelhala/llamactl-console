import { useEffect, useMemo, useState } from 'react'
import { IconArrowLeft } from '@tabler/icons-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '../components/ui/spinner'
import { ApiServiceError } from '@/services/api'
import { getInstance } from '@/services/instanceService'
import { type CreateInstanceOptions, type Instance, type InstanceStatus } from '@/types/instance'

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

function readOptionString(options: CreateInstanceOptions | undefined, keys: string[]): string {
  if (!options) {
    return ''
  }

  for (const key of keys) {
    const value = options[key]
    if (typeof value === 'string' && value.trim() !== '') {
      return value
    }
  }

  return ''
}

function readOptionNumberString(options: CreateInstanceOptions | undefined, keys: string[], fallback: string): string {
  if (!options) {
    return fallback
  }

  for (const key of keys) {
    const value = options[key]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value)
    }

    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim()
    }
  }

  return fallback
}

function readOptionBoolean(options: CreateInstanceOptions | undefined, keys: string[], fallback: boolean): boolean {
  if (!options) {
    return fallback
  }

  for (const key of keys) {
    const value = options[key]

    if (typeof value === 'boolean') {
      return value
    }

    if (typeof value === 'number') {
      return value !== 0
    }

    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (['true', '1', 'yes', 'on'].includes(normalized)) {
        return true
      }

      if (['false', '0', 'no', 'off'].includes(normalized)) {
        return false
      }
    }
  }

  return fallback
}

function settingsFromInstance(instance: Instance): InstanceSettings {
  return {
    backend: readOptionString(instance.options, ['backend', 'backend_type']),
    model: readOptionString(instance.options, ['model', 'model_name']),
    maxConcurrency: readOptionNumberString(instance.options, ['max_concurrency', 'maxConcurrency'], defaultSettings.maxConcurrency),
    contextWindow: readOptionNumberString(instance.options, ['context_window', 'contextWindow', 'num_ctx'], defaultSettings.contextWindow),
    temperature: readOptionNumberString(instance.options, ['temperature', 'temp'], defaultSettings.temperature),
    autoRestart: readOptionBoolean(instance.options, ['auto_restart', 'autoRestart', 'restart_on_failure'], defaultSettings.autoRestart),
  }
}

function normalizeStatus(status: InstanceStatus): 'running' | 'stopped' | 'transitioning' {
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

function statusDotClass(status: InstanceStatus): string {
  const kind = normalizeStatus(status)

  if (kind === 'running') {
    return 'bg-emerald-500 animate-pulse [animation-duration:2.4s]'
  }

  if (kind === 'transitioning') {
    return 'bg-amber-500'
  }

  return 'bg-slate-400'
}

export function InstanceDetailPage({ accessToken }: InstanceDetailPageProps) {
  const { name: routeName } = useParams<{ name: string }>()
  const instanceName = useMemo(() => (routeName ? decodeURIComponent(routeName) : ''), [routeName])

  const [instance, setInstance] = useState<Instance | null>(null)
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
        const fetched = await getInstance(accessToken, instanceName)

        if (!isMounted) {
          return
        }

        setInstance(fetched)
        setSettings(settingsFromInstance(fetched))
      } catch (error) {
        if (isMounted) {
          setErrorMessage(toDisplayError(error))
          setInstance(null)
          setSettings(defaultSettings)
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
          <h1 className="flex items-center gap-2 text-lg font-semibold">
            <span>{instanceName || 'Instance details'}</span>
            {instance ? (
              <span
                className={`inline-block size-2.5 rounded-full ${statusDotClass(instance.status ?? 'stopped')}`}
                aria-label={`Instance status: ${instance.status || 'stopped'}`}
                title={instance.status || 'stopped'}
              />
            ) : null}
          </h1>
          <p className="text-sm text-muted-foreground">Tune model and runtime settings for this instance.</p>
        </div>
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

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner size="sm" aria-label="Loading instance details" />
          <span>Loading instance details...</span>
        </div>
      ) : null}

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
