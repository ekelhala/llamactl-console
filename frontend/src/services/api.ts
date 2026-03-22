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
  try {
    const data = (await response.json()) as ErrorResponse
    if (data.error) {
      return data.error
    }
  } catch {
    // Ignore invalid or empty error payloads.
  }

  return `request failed (${response.status})`
}

export async function apiRequest<TResponse>(path: string, init?: RequestInit): Promise<TResponse> {
  const response = await fetch(buildApiUrl(path), init)

  if (!response.ok) {
    throw new ApiServiceError(await parseApiError(response), response.status)
  }

  if (response.status === 204) {
    return undefined as TResponse
  }

  return (await response.json()) as TResponse
}