import { apiRequest } from '@/services/api'

export type ParseCommandRequest = {
  command: string
}

export type LlamaModelActionResponse = Record<string, string>

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

export async function getLlamaCppDevices(accessToken: string): Promise<string> {
  return apiRequest<string>('/v1/backends/llama-cpp/devices', {
    headers: authHeaders(accessToken),
  })
}

export async function getLlamaCppHelp(accessToken: string): Promise<string> {
  return apiRequest<string>('/v1/backends/llama-cpp/help', {
    headers: authHeaders(accessToken),
  })
}

export async function getLlamaCppVersion(accessToken: string): Promise<string> {
  return apiRequest<string>('/v1/backends/llama-cpp/version', {
    headers: authHeaders(accessToken),
  })
}

export async function parseLlamaCppCommand(accessToken: string, request: ParseCommandRequest): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/v1/backends/llama-cpp/parse-command', {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function parseMlxCommand(accessToken: string, request: ParseCommandRequest): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/v1/backends/mlx/parse-command', {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function parseVllmCommand(accessToken: string, request: ParseCommandRequest): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>('/v1/backends/vllm/parse-command', {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
}

export async function listInstanceLlamaCppModels(accessToken: string, name: string): Promise<Record<string, unknown>> {
  return apiRequest<Record<string, unknown>>(`/v1/llama-cpp/${encodeURIComponent(name)}/models`, {
    headers: authHeaders(accessToken),
  })
}

export async function loadInstanceLlamaCppModel(
  accessToken: string,
  name: string,
  model: string
): Promise<LlamaModelActionResponse> {
  return apiRequest<LlamaModelActionResponse>(
    `/v1/llama-cpp/${encodeURIComponent(name)}/models/${encodeURIComponent(model)}/load`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  )
}

export async function unloadInstanceLlamaCppModel(
  accessToken: string,
  name: string,
  model: string
): Promise<LlamaModelActionResponse> {
  return apiRequest<LlamaModelActionResponse>(
    `/v1/llama-cpp/${encodeURIComponent(name)}/models/${encodeURIComponent(model)}/unload`,
    {
      method: 'POST',
      headers: authHeaders(accessToken),
    }
  )
}

export async function getLlamaCppUiProxy(accessToken: string, name: string): Promise<string> {
  return apiRequest<string>(`/llama-cpp/${encodeURIComponent(name)}/`, {
    headers: authHeaders(accessToken),
  })
}

type LlamaCppProxyEndpoint =
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

const endpointMethod: Record<LlamaCppProxyEndpoint, 'GET' | 'POST'> = {
  'apply-template': 'POST',
  completion: 'POST',
  detokenize: 'POST',
  embeddings: 'POST',
  infill: 'POST',
  metrics: 'POST',
  props: 'GET',
  reranking: 'POST',
  slots: 'GET',
  tokenize: 'POST',
}

export async function callLlamaCppProxyEndpoint(
  accessToken: string,
  name: string,
  endpoint: LlamaCppProxyEndpoint,
  payload?: unknown
): Promise<Record<string, unknown>> {
  const method = endpointMethod[endpoint]

  return apiRequest<Record<string, unknown>>(`/llama-cpp/${encodeURIComponent(name)}/${endpoint}`, {
    method,
    headers: {
      ...authHeaders(accessToken),
      ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(method === 'POST' && payload ? { body: JSON.stringify(payload) } : {}),
  })
}
