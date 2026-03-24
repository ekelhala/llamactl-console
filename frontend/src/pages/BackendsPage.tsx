import { useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  callLlamaCppProxyEndpoint,
  getLlamaCppDevices,
  getLlamaCppHelp,
  getLlamaCppUiProxy,
  getLlamaCppVersion,
  parseLlamaCppCommand,
  parseMlxCommand,
  parseVllmCommand,
} from '@/services/backendService'

type BackendsPageProps = {
  accessToken: string
}

type ParseBackend = 'llama-cpp' | 'mlx' | 'vllm'

type ProxyEndpoint =
  | 'apply-template'
  | 'completion'
  | 'detokenize'
  | 'embeddings'
  | 'infill'
  | 'metrics'
  | 'props'
  | 'reranking'
  | 'slots'
  | 'tokenize'

const proxyEndpoints: ProxyEndpoint[] = [
  'apply-template',
  'completion',
  'detokenize',
  'embeddings',
  'infill',
  'metrics',
  'props',
  'reranking',
  'slots',
  'tokenize',
]

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function BackendsPage({ accessToken }: BackendsPageProps) {
  const [devices, setDevices] = useState('')
  const [helpText, setHelpText] = useState('')
  const [backendVersion, setBackendVersion] = useState('')
  const [command, setCommand] = useState('')
  const [parseBackend, setParseBackend] = useState<ParseBackend>('llama-cpp')
  const [parsedJson, setParsedJson] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [proxyEndpoint, setProxyEndpoint] = useState<ProxyEndpoint>('slots')
  const [proxyPayloadText, setProxyPayloadText] = useState('{}')
  const [proxyResponse, setProxyResponse] = useState('')
  const [proxyUiHtml, setProxyUiHtml] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function refreshBackendInfo() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const [nextDevices, nextHelp, nextVersion] = await Promise.all([
        getLlamaCppDevices(accessToken),
        getLlamaCppHelp(accessToken),
        getLlamaCppVersion(accessToken),
      ])

      setDevices(nextDevices)
      setHelpText(nextHelp)
      setBackendVersion(nextVersion)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'failed to load backend info')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleParseCommand() {
    if (!command.trim()) {
      return
    }

    setErrorMessage('')

    try {
      const request = { command: command.trim() }
      const response =
        parseBackend === 'llama-cpp'
          ? await parseLlamaCppCommand(accessToken, request)
          : parseBackend === 'mlx'
            ? await parseMlxCommand(accessToken, request)
            : await parseVllmCommand(accessToken, request)

      setParsedJson(pretty(response))
    } catch (error) {
      setParsedJson('')
      setErrorMessage(error instanceof Error ? error.message : 'failed to parse command')
    }
  }

  async function handleProxyCall() {
    if (!instanceName.trim()) {
      return
    }

    setErrorMessage('')

    try {
      const payload = ['props', 'slots'].includes(proxyEndpoint) ? undefined : JSON.parse(proxyPayloadText || '{}')
      const response = await callLlamaCppProxyEndpoint(accessToken, instanceName.trim(), proxyEndpoint, payload)
      setProxyResponse(pretty(response))
    } catch (error) {
      setProxyResponse('')
      setErrorMessage(error instanceof Error ? error.message : 'failed proxy call')
    }
  }

  async function handleLoadUiProxy() {
    if (!instanceName.trim()) {
      return
    }

    setErrorMessage('')

    try {
      const html = await getLlamaCppUiProxy(accessToken, instanceName.trim())
      setProxyUiHtml(html.slice(0, 4000))
    } catch (error) {
      setProxyUiHtml('')
      setErrorMessage(error instanceof Error ? error.message : 'failed UI proxy call')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Backend Tools</h1>
          <p className="text-sm text-muted-foreground">Inspect backend capabilities and exercise parse/proxy endpoints.</p>
        </div>

        <Button type="button" variant="outline" onClick={() => void refreshBackendInfo()} disabled={isLoading}>
          <IconRefresh className={isLoading ? 'animate-spin' : ''} />
          Refresh llama.cpp info
        </Button>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Devices</h2>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted/20 p-2 text-xs">{devices || 'No data loaded yet.'}</pre>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Version</h2>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted/20 p-2 text-xs">{backendVersion || 'No data loaded yet.'}</pre>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Help</h2>
          <pre className="max-h-72 overflow-auto rounded-md bg-muted/20 p-2 text-xs">{helpText || 'No data loaded yet.'}</pre>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">Parse command</h2>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="parseBackend">Backend</Label>
            <select
              id="parseBackend"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={parseBackend}
              onChange={(event) => setParseBackend(event.target.value as ParseBackend)}
            >
              <option value="llama-cpp">llama-cpp</option>
              <option value="mlx">mlx</option>
              <option value="vllm">vllm</option>
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="command">Command</Label>
            <Input
              id="command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder="llama-server --model ./model.gguf --ctx-size 4096"
            />
          </div>

          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={() => void handleParseCommand()} disabled={!command.trim()}>
              Parse
            </Button>
          </div>
        </div>

        <pre className="max-h-80 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{parsedJson || 'No parse result yet.'}</pre>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">Llama.cpp proxy endpoint tester</h2>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="proxyInstance">Instance</Label>
            <Input
              id="proxyInstance"
              value={instanceName}
              onChange={(event) => setInstanceName(event.target.value)}
              placeholder="instance-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="proxyEndpoint">Endpoint</Label>
            <select
              id="proxyEndpoint"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={proxyEndpoint}
              onChange={(event) => setProxyEndpoint(event.target.value as ProxyEndpoint)}
            >
              {proxyEndpoints.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="proxyPayload">JSON payload (POST endpoints)</Label>
            <Input
              id="proxyPayload"
              value={proxyPayloadText}
              onChange={(event) => setProxyPayloadText(event.target.value)}
              placeholder='{"prompt":"hello"}'
              disabled={['props', 'slots'].includes(proxyEndpoint)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void handleProxyCall()} disabled={!instanceName.trim()}>
            Call endpoint
          </Button>
          <Button type="button" variant="outline" onClick={() => void handleLoadUiProxy()} disabled={!instanceName.trim()}>
            Load UI proxy
          </Button>
        </div>

        <pre className="max-h-80 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{proxyResponse || 'No proxy response yet.'}</pre>
        <pre className="max-h-56 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{proxyUiHtml || 'No UI proxy response yet.'}</pre>
      </div>
    </section>
  )
}
