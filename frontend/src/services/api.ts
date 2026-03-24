type ErrorResponse = {
  error?: string
}

export class ApiServiceError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiServiceError'
    this.status = status
  }
}

const apiBasePath = (import.meta.env.VITE_API_BASE_PATH || '/api').replace(/\/+$/, '')

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${apiBasePath}${normalizedPath}`
}

async function parseApiError(response: Response): Promise<string> {
  const fallback = `request failed (${response.status})`

  try {
    const raw = await response.text()
    if (!raw.trim()) {
      return fallback
    }

    try {
      const data = JSON.parse(raw) as ErrorResponse | string
      if (typeof data === 'string' && data.trim() !== '') {
        return data
      }

      if (typeof data === 'object' && data !== null && data.error) {
        return data.error
      }
    } catch {
      // Plain text error body.
      return raw.trim()
    }

    return raw.trim() || fallback
  } catch {
    // Ignore invalid or empty error payloads.
  }

  return fallback
}

function isJSONResponse(response: Response): boolean {
  const contentType = response.headers.get('Content-Type') || ''
  return contentType.toLowerCase().includes('application/json')
}

export async function apiRequest<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(buildApiUrl(path), init)

  if (!response.ok) {
    throw new ApiServiceError(await parseApiError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  if (isJSONResponse(response)) {
    return (await response.json()) as TResponse
  }

  return (await response.text()) as TResponse
}