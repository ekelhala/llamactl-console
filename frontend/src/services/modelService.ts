import { apiRequest } from '@/services/api'
import { type CachedModel, type DownloadJob } from '@/types/model'

export interface DownloadModelRequest {
  repo: string
}

type DownloadModelResponse = {
  job_id: string
  repo: string
  tag?: string
}

type ListModelJobsResponse =
  | DownloadJob[]
  | {
      jobs: DownloadJob[]
    }

type GetModelJobResponse =
  | DownloadJob
  | {
      job: DownloadJob
    }

function authHeaders(accessToken: string): HeadersInit {
  return {
    Authorization: `Bearer ${accessToken}`,
  }
}

function modelQuery(repo: string, tag?: string): string {
  const query = new URLSearchParams({ repo })
  if (tag) {
    query.set('tag', tag)
  }

  return query.toString()
}

export async function listCachedModels(accessToken: string): Promise<CachedModel[]> {
  return apiRequest<CachedModel[]>('/v1/backends/llama-cpp/models', {
    headers: authHeaders(accessToken),
  })
}

export async function deleteCachedModel(accessToken: string, repo: string, tag?: string): Promise<void> {
  await apiRequest<unknown>(`/v1/backends/llama-cpp/models?${modelQuery(repo, tag)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
}

export async function downloadModel(accessToken: string, request: DownloadModelRequest): Promise<DownloadJob> {
  const payload = await apiRequest<DownloadModelResponse>('/v1/backends/llama-cpp/models/download', {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  return {
    id: payload.job_id,
    repo: payload.repo,
    tag: payload.tag,
    status: 'queued',
  }
}

export async function listModelJobs(accessToken: string): Promise<DownloadJob[]> {
  const payload = await apiRequest<ListModelJobsResponse>('/v1/backends/llama-cpp/models/jobs', {
    headers: authHeaders(accessToken),
  })

  return Array.isArray(payload) ? payload : payload.jobs
}

export async function getModelJob(accessToken: string, id: string): Promise<DownloadJob> {
  const payload = await apiRequest<GetModelJobResponse>(
    `/v1/backends/llama-cpp/models/jobs/${encodeURIComponent(id)}`,
    {
      headers: authHeaders(accessToken),
    }
  )

  return 'id' in payload ? payload : payload.job
}

export async function cancelModelJob(accessToken: string, id: string): Promise<void> {
  await apiRequest<unknown>(`/v1/backends/llama-cpp/models/jobs/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(accessToken),
  })
}
