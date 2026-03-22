import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function ApiKeysPage() {
  return (
    <Card className="border-slate-300/70 bg-white/90 shadow-xl backdrop-blur">
      <CardHeader>
        <CardTitle>API Keys</CardTitle>
        <CardDescription>Route scaffold ready for key listing and management actions.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600">This page will be wired to /api/v1/auth/keys in the next slice.</p>
      </CardContent>
    </Card>
  )
}
