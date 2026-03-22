import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ApiKeysPage() {
  return (
    <Card className="border-slate-300/70 bg-white/90 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Manage keys used to access this workspace.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">Key management tools will appear here.</p>
      </CardContent>
    </Card>
  )
}
