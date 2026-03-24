import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconDotsVertical, IconKey, IconLock, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useApiKeys } from '@/hooks/useApiKeys'
import { type ApiKey } from '@/types/apiKey'
import { listInstances } from '@/services/instanceService'
import { PermissionMode } from '@/types/apiKey'
import { type Instance } from '@/types/instance'

type ApiKeysPageProps = {
  accessToken: string
}

function formatUnixTimestamp(value: number | null): string {
  if (!value) {
    return '-'
  }

  const millis = value > 1_000_000_000_000 ? value : value * 1000
  const date = new Date(millis)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleString()
}

export function ApiKeysPage({ accessToken }: ApiKeysPageProps) {
  const [name, setName] = useState('')
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(PermissionMode.AllowAll)
  const [selectedInstanceIds, setSelectedInstanceIds] = useState<number[]>([])
  const [expiresAtText, setExpiresAtText] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isCreatedKeyDialogOpen, setIsCreatedKeyDialogOpen] = useState(false)
  const [permissionsDialogKey, setPermissionsDialogKey] = useState<ApiKey | null>(null)
  const [deleteDialogKey, setDeleteDialogKey] = useState<ApiKey | null>(null)
  const [actionMenuKeyId, setActionMenuKeyId] = useState<number | null>(null)
  const [instances, setInstances] = useState<Instance[]>([])
  const [isLoadingInstances, setIsLoadingInstances] = useState(false)
  const [instancesError, setInstancesError] = useState('')

  const {
    keys,
    permissionsByKeyId,
    createdKey,
    isLoading,
    activeActionKey,
    errorMessage,
    loadKeys,
    createKey,
    removeKey,
    loadPermissions,
    clearCreatedKey,
  } = useApiKeys(accessToken)

  const loadAvailableInstances = useCallback(async () => {
    if (!accessToken) {
      return
    }

    setIsLoadingInstances(true)
    setInstancesError('')

    try {
      const items = await listInstances(accessToken)
      setInstances(items)
    } catch (error) {
      setInstancesError(error instanceof Error ? error.message : 'failed to load instances')
    } finally {
      setIsLoadingInstances(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadKeys()
    void loadAvailableInstances()
  }, [loadKeys, loadAvailableInstances])

  const sortedKeys = useMemo(() => {
    return [...keys].sort((a, b) => b.created_at - a.created_at)
  }, [keys])

  const sortedInstances = useMemo(() => {
    return [...instances].sort((a, b) => a.name.localeCompare(b.name))
  }, [instances])

  const actionMenuKey = useMemo(() => {
    if (actionMenuKeyId === null) {
      return null
    }

    return sortedKeys.find((item) => item.id === actionMenuKeyId) ?? null
  }, [actionMenuKeyId, sortedKeys])

  function resetCreateForm() {
    setName('')
    setPermissionMode(PermissionMode.AllowAll)
    setSelectedInstanceIds([])
    setExpiresAtText('')
  }

  function handleCreateDialogOpenChange(nextOpen: boolean) {
    setIsCreateDialogOpen(nextOpen)
    if (!nextOpen) {
      resetCreateForm()
    }
  }

  function toggleInstanceSelection(instanceId: number, checked: boolean) {
    setSelectedInstanceIds((current) => {
      if (checked) {
        if (current.includes(instanceId)) {
          return current
        }
        return [...current, instanceId]
      }

      return current.filter((id) => id !== instanceId)
    })
  }

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) {
      return
    }

    const expiresAt = expiresAtText.trim() === '' ? undefined : Number(expiresAtText)
    const request = {
      name: trimmedName,
      permission_mode: permissionMode,
      instance_ids: permissionMode === PermissionMode.PerInstance ? selectedInstanceIds : [],
      ...(Number.isFinite(expiresAt) ? { expires_at: expiresAt } : {}),
    }

    const created = await createKey(request)
    if (!created) {
      return
    }

    resetCreateForm()
    setIsCreateDialogOpen(false)
    setIsCreatedKeyDialogOpen(true)
  }

  function handleCreatedKeyDialogOpenChange(nextOpen: boolean) {
    setIsCreatedKeyDialogOpen(nextOpen)

    if (!nextOpen) {
      clearCreatedKey()
    }
  }

  async function handleRefresh() {
    await Promise.all([loadKeys(), loadAvailableInstances()])
  }

  async function openPermissionsDialog(item: ApiKey) {
    setPermissionsDialogKey(item)
    if (!permissionsByKeyId[item.id]) {
      await loadPermissions(item.id)
    }
  }

  async function handleConfirmDelete() {
    if (!deleteDialogKey) {
      return
    }

    await removeKey(deleteDialogKey.id)
    setDeleteDialogKey(null)
  }

  async function handleSheetAction(action: 'permissions' | 'delete') {
    if (!actionMenuKey) {
      return
    }

    setActionMenuKeyId(null)

    if (action === 'permissions') {
      await openPermissionsDialog(actionMenuKey)
      return
    }

    setDeleteDialogKey(actionMenuKey)
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-semibold">API Keys</h1>
          <p className="text-sm text-muted-foreground">Manage keys used to access your models.</p>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isCreateDialogOpen} onOpenChange={handleCreateDialogOpenChange}>
            <DialogTrigger asChild>
              <Button type="button" disabled={activeActionKey !== '' || isLoadingInstances}>
                <IconPlus />
                Add API key
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  Configure permissions and optional expiration for a new access key.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="api-key-name">Key name</Label>
                  <Input
                    id="api-key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Key name"
                    aria-label="Key name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key-permission-mode">Permission mode</Label>
                  <select
                    id="api-key-permission-mode"
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={permissionMode}
                    onChange={(event) => {
                      const nextMode = event.target.value as PermissionMode
                      setPermissionMode(nextMode)
                      if (nextMode !== PermissionMode.PerInstance) {
                        setSelectedInstanceIds([])
                      }
                    }}
                    aria-label="Permission mode"
                  >
                    <option value={PermissionMode.AllowAll}>allow_all</option>
                    <option value={PermissionMode.PerInstance}>per_instance</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api-key-expires-at">Expires at (unix seconds)</Label>
                  <Input
                    id="api-key-expires-at"
                    value={expiresAtText}
                    onChange={(event) => setExpiresAtText(event.target.value)}
                    placeholder="Expires at (unix seconds)"
                    aria-label="Expires at"
                  />
                </div>

                {permissionMode === PermissionMode.PerInstance ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Allowed instances</p>

                    {isLoadingInstances ? (
                      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        Loading instances...
                      </p>
                    ) : sortedInstances.length === 0 ? (
                      <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                        No instances available.
                      </p>
                    ) : (
                      <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/10 p-2">
                        {sortedInstances.map((instance) => {
                          const isChecked = selectedInstanceIds.includes(instance.id)

                          return (
                            <label
                              key={instance.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted/50"
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={(checked) => toggleInstanceSelection(instance.id, checked === true)}
                                aria-label={`Allow ${instance.name}`}
                                disabled={activeActionKey !== ''}
                              />
                              <span className="flex-1 truncate">{instance.name}</span>
                              <span className="text-xs text-muted-foreground">#{instance.id}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      {selectedInstanceIds.length === 0
                        ? 'Select one or more instances.'
                        : `${selectedInstanceIds.length} instance${selectedInstanceIds.length === 1 ? '' : 's'} selected`}
                    </p>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => handleCreateDialogOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={
                    activeActionKey !== '' ||
                    name.trim() === '' ||
                    (permissionMode === PermissionMode.PerInstance && selectedInstanceIds.length === 0)
                  }
                >
                  <IconKey />
                  {activeActionKey === 'create' ? 'Creating...' : 'Create key'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRefresh()}
            disabled={isLoading || isLoadingInstances || activeActionKey !== ''}
          >
            <IconRefresh className={isLoading || isLoadingInstances ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      ) : null}

      {instancesError ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load instances for selection: {instancesError}
        </p>
      ) : null}

      <Dialog
        open={isCreatedKeyDialogOpen && createdKey !== null}
        onOpenChange={handleCreatedKeyDialogOpenChange}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Save your API key now</DialogTitle>
            <DialogDescription>
              This key is shown only once. Save it now because you will not be able to view it again.
            </DialogDescription>
          </DialogHeader>

          {createdKey ? (
            <div className="space-y-2">
              <p className="text-sm text-foreground/90">Key name: {createdKey.name}</p>
              <p className="break-all rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-900">
                {createdKey.key}
              </p>
            </div>
          ) : null}

          <DialogFooter>
            <Button type="button" onClick={() => handleCreatedKeyDialogOpenChange(false)}>
              I have saved this key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={permissionsDialogKey !== null} onOpenChange={(open) => !open && setPermissionsDialogKey(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Key permissions</DialogTitle>
            <DialogDescription>
              {permissionsDialogKey ? `Allowed instances for ${permissionsDialogKey.name}.` : 'Allowed instances.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {!permissionsDialogKey ? null : !permissionsByKeyId[permissionsDialogKey.id] ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                Loading permissions...
              </p>
            ) : permissionsByKeyId[permissionsDialogKey.id].length === 0 ? (
              <p className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                No instance-specific permissions.
              </p>
            ) : (
              <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border bg-muted/10 p-2">
                {permissionsByKeyId[permissionsDialogKey.id].map((permission) => (
                  <div
                    key={`${permissionsDialogKey.id}:${permission.instance_id}`}
                    className="flex items-center justify-between rounded px-2 py-1 text-sm"
                  >
                    <span className="truncate">{permission.instance_name}</span>
                    <span className="text-xs text-muted-foreground">#{permission.instance_id}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Close
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogKey !== null} onOpenChange={(open) => !open && setDeleteDialogKey(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete API key</DialogTitle>
            <DialogDescription>
              {deleteDialogKey
                ? `Are you sure you want to delete ${deleteDialogKey.name}? This action cannot be undone.`
                : 'Are you sure?'}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={activeActionKey !== ''}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={activeActionKey !== ''}
            >
              <IconTrash />
              {deleteDialogKey && activeActionKey === `delete:${deleteDialogKey.id}` ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={actionMenuKey !== null} onOpenChange={(open) => !open && setActionMenuKeyId(null)}>
        <SheetContent side="right" className="w-[85vw] max-w-sm">
          <SheetHeader>
            <SheetTitle>{actionMenuKey ? `${actionMenuKey.name} actions` : 'API key actions'}</SheetTitle>
            <SheetDescription>Choose an action for this API key.</SheetDescription>
          </SheetHeader>

          {actionMenuKey ? (
            <div className="space-y-2 px-4 pb-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full justify-start"
                disabled={activeActionKey !== ''}
                onClick={() => void handleSheetAction('permissions')}
              >
                <IconLock />
                {activeActionKey === `permissions:${actionMenuKey.id}` ? 'Loading permissions...' : 'Permissions'}
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="w-full justify-start"
                disabled={activeActionKey !== ''}
                onClick={() => void handleSheetAction('delete')}
              >
                <IconTrash />
                Delete key
              </Button>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <div className="space-y-2 sm:hidden">
        {sortedKeys.length === 0 ? (
          <div className="rounded-lg border border-border bg-card px-3 py-6 text-sm text-muted-foreground">
            {isLoading ? 'Loading keys...' : 'No API keys found'}
          </div>
        ) : (
          sortedKeys.map((item) => {
            return (
              <div
                key={`mobile:key:${item.id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate font-medium text-foreground">{item.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {item.permission_mode} · Last used {formatUnixTimestamp(item.last_used_at)}
                  </p>
                </div>

                <div className="flex items-center">
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="outline"
                    disabled={activeActionKey !== ''}
                    aria-label={`Open actions for ${item.name}`}
                    onClick={() => setActionMenuKeyId(item.id)}
                  >
                    <IconDotsVertical />
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-border bg-card sm:block">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/60 text-foreground/80">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Mode</th>
              <th className="px-3 py-2 font-medium">Last used</th>
              <th className="px-3 py-2 font-medium">Expires</th>
              <th className="px-3 py-2 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedKeys.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-muted-foreground" colSpan={5}>
                  {isLoading ? 'Loading keys...' : 'No API keys found'}
                </td>
              </tr>
            ) : (
              sortedKeys.map((item) => {
                return (
                  <tr key={`key:${item.id}`} className="border-t border-border/80 align-top">
                    <td className="px-3 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-3 py-3 text-foreground/90">{item.permission_mode}</td>
                    <td className="px-3 py-3 text-foreground/90">{formatUnixTimestamp(item.last_used_at)}</td>
                    <td className="px-3 py-3 text-foreground/90">{formatUnixTimestamp(item.expires_at)}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="outline"
                          disabled={activeActionKey !== ''}
                          aria-label={`Open actions for ${item.name}`}
                          onClick={() => setActionMenuKeyId(item.id)}
                        >
                          <IconDotsVertical />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
