import { useEffect, useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useConfig } from '@/hooks/useConfig'
import {
  getHealth,
  getHealthLive,
  getHealthReady,
  getNode,
  listNodes,
  listOpenAIModels,
  postOpenAIProxy,
} from '@/services/systemService'

type SystemPageProps = {
  accessToken: string
}

function pretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function SystemPage({ accessToken }: SystemPageProps) {
  const { config, version, isLoading, errorMessage, loadSystemInfo } = useConfig(accessToken)

  const [nodesJson, setNodesJson] = useState('')
  const [selectedNodeName, setSelectedNodeName] = useState('')
  const [nodeJson, setNodeJson] = useState('')
  const [openAIModelsJson, setOpenAIModelsJson] = useState('')
  const [openAIPath, setOpenAIPath] = useState('chat/completions')
  const [openAIPayloadText, setOpenAIPayloadText] = useState('{"model":"example","messages":[{"role":"user","content":"hello"}]}')
  const [openAIProxyResponse, setOpenAIProxyResponse] = useState('')
  const [healthJson, setHealthJson] = useState('')
  const [pageError, setPageError] = useState('')

  useEffect(() => {
    void loadSystemInfo()
  }, [loadSystemInfo])

  async function refreshNodes() {
    setPageError('')

    try {
      const nodes = await listNodes(accessToken)
      setNodesJson(pretty(nodes))
      const names = Object.keys(nodes)
      if (!selectedNodeName && names.length > 0) {
        setSelectedNodeName(names[0])
      }
    } catch (error) {
      setNodesJson('')
      setPageError(error instanceof Error ? error.message : 'failed to load nodes')
    }
  }

  async function refreshSelectedNode() {
    if (!selectedNodeName.trim()) {
      return
    }

    setPageError('')

    try {
      const node = await getNode(accessToken, selectedNodeName.trim())
      setNodeJson(pretty(node))
    } catch (error) {
      setNodeJson('')
      setPageError(error instanceof Error ? error.message : 'failed to load node')
    }
  }

  async function refreshOpenAIModels() {
    setPageError('')

    try {
      const response = await listOpenAIModels(accessToken)
      setOpenAIModelsJson(pretty(response))
    } catch (error) {
      setOpenAIModelsJson('')
      setPageError(error instanceof Error ? error.message : 'failed to load openai models')
    }
  }

  async function callOpenAIProxy() {
    setPageError('')

    try {
      const payload = JSON.parse(openAIPayloadText)
      const response = await postOpenAIProxy(accessToken, openAIPath, payload)
      setOpenAIProxyResponse(pretty(response))
    } catch (error) {
      setOpenAIProxyResponse('')
      setPageError(error instanceof Error ? error.message : 'failed openai proxy call')
    }
  }

  async function refreshHealth() {
    setPageError('')

    try {
      const [health, live, ready] = await Promise.all([
        getHealth(),
        getHealthLive(),
        getHealthReady(),
      ])

      setHealthJson(pretty({ health, live, ready }))
    } catch (error) {
      setHealthJson('')
      setPageError(error instanceof Error ? error.message : 'failed to load health endpoints')
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">System</h1>
          <p className="text-sm text-muted-foreground">Inspect config, nodes, and OpenAI-compatible endpoints.</p>
        </div>

        <Button type="button" variant="outline" onClick={() => void loadSystemInfo()} disabled={isLoading}>
          <IconRefresh className={isLoading ? 'animate-spin' : ''} />
          Refresh config/version
        </Button>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      {pageError ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{pageError}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Version</h2>
          <pre className="max-h-48 overflow-auto rounded-md bg-muted/20 p-2 text-xs">{version || 'No version data yet.'}</pre>
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <h2 className="mb-2 text-sm font-medium">Server Config</h2>
          <pre className="max-h-80 overflow-auto rounded-md bg-muted/20 p-2 text-xs">{config ? pretty(config) : 'No config data yet.'}</pre>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">Health endpoints</h2>
        <div>
          <Button type="button" onClick={() => void refreshHealth()}>
            Load /health, /health/live, /health/ready
          </Button>
        </div>
        <pre className="max-h-56 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{healthJson || 'No health response yet.'}</pre>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">Nodes</h2>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void refreshNodes()}>
            Load nodes map
          </Button>
        </div>

        <pre className="max-h-56 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{nodesJson || 'No nodes data yet.'}</pre>

        <div className="grid gap-2 md:grid-cols-3">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="nodeName">Node name</Label>
            <Input id="nodeName" value={selectedNodeName} onChange={(event) => setSelectedNodeName(event.target.value)} placeholder="local" />
          </div>

          <div className="flex items-end">
            <Button type="button" className="w-full" onClick={() => void refreshSelectedNode()} disabled={!selectedNodeName.trim()}>
              Get node
            </Button>
          </div>
        </div>

        <pre className="max-h-56 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{nodeJson || 'No node response yet.'}</pre>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-base font-medium">OpenAI-compatible API</h2>

        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => void refreshOpenAIModels()}>
            Load /v1/models
          </Button>
        </div>

        <pre className="max-h-56 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{openAIModelsJson || 'No /v1/models response yet.'}</pre>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="space-y-2 md:col-span-1">
            <Label htmlFor="openaiPath">POST /v1/&lt;path&gt;</Label>
            <Input id="openaiPath" value={openAIPath} onChange={(event) => setOpenAIPath(event.target.value)} placeholder="chat/completions" />
          </div>

          <div className="space-y-2 md:col-span-3">
            <Label htmlFor="openaiPayload">Payload JSON</Label>
            <Input id="openaiPayload" value={openAIPayloadText} onChange={(event) => setOpenAIPayloadText(event.target.value)} />
          </div>
        </div>

        <div>
          <Button type="button" onClick={() => void callOpenAIProxy()} disabled={!openAIPath.trim()}>
            Send OpenAI proxy request
          </Button>
        </div>

        <pre className="max-h-80 overflow-auto rounded-md bg-muted/20 p-3 text-xs">{openAIProxyResponse || 'No OpenAI proxy response yet.'}</pre>
      </div>
    </section>
  )
}
