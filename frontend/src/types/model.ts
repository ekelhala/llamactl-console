export interface DownloadJob {
  id: string
  repo: string
  tag?: string
  status: string
  progress?: {
    bytes_downloaded?: number
    total_bytes?: number
    current_file?: string
  }
  error?: string
  created_at?: number
  completed_at?: number
}

export type CachedModel = string

export type ModelRow =
  | { type: 'downloading'; job: DownloadJob }
  | { type: 'cached'; model: CachedModel }