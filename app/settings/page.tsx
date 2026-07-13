"use client"

import { useCallback, useEffect, useState } from "react"
import { Save } from "lucide-react"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createClient } from "@/lib/supabase/client"
import { getCafeId } from "@/lib/services/_shared"
import type { Json, Tables } from "@/types/database"

type Setting = Tables<"settings">

export default function SettingsPage() {
  const [cafeId, setCafeId] = useState<string | null>(null)
  const [settings, setSettings] = useState<Setting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [keyName, setKeyName] = useState("self_order")
  const [jsonValue, setJsonValue] = useState('{\n  "mode": "online_ordering"\n}')
  const [selfOrderMode, setSelfOrderMode] = useState<"online_ordering" | "qr_menu">("online_ordering")

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const activeCafeId = await getCafeId(supabase)
      setCafeId(activeCafeId)
      const { data, error: settingsError } = await supabase
        .from("settings")
        .select("*")
        .eq("cafe_id", activeCafeId)
        .order("key")
      if (settingsError) throw new Error(settingsError.message)
      setSettings(data ?? [])
      const selfOrder = (data ?? []).find((setting) => setting.key === "self_order")
      const value = selfOrder?.value as Record<string, unknown> | undefined
      setSelfOrderMode(value?.mode === "qr_menu" ? "qr_menu" : "online_ordering")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function upsertSetting(key: string, value: Json) {
    if (!cafeId) return
    const supabase = createClient()
    const { error: upsertError } = await (supabase
      .from("settings")
      .upsert as unknown as (
        payload: { cafe_id: string; key: string; value: Json },
        options: { onConflict: string }
      ) => Promise<{ error: { message: string } | null }>
    )({ cafe_id: cafeId, key, value }, { onConflict: "cafe_id,key" })
    if (upsertError) throw new Error(upsertError.message)
  }

  async function saveSelfOrderMode() {
    setSaving(true)
    setError(null)
    try {
      await upsertSetting("self_order", { mode: selfOrderMode })
      setSuccess("Self-order settings saved")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save self-order settings")
    } finally {
      setSaving(false)
    }
  }

  async function saveJsonSetting() {
    setSaving(true)
    setError(null)
    try {
      const parsed = JSON.parse(jsonValue)
      await upsertSetting(keyName.trim(), parsed)
      setSuccess("Setting saved")
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid JSON or failed to save setting")
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout title="Settings">
      <PageContainer>
        <PageHeader title="Settings" description="Cafe configuration and preferences" />
        {error && <div className="mb-4"><Alert type="error" message={error} onDismiss={() => setError(null)} /></div>}
        {success && <div className="mb-4"><Alert type="success" message={success} onDismiss={() => setSuccess(null)} /></div>}

        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">Self-order mode</h2>
            <div className="flex gap-2">
              <Select value={selfOrderMode} onChange={(e) => setSelfOrderMode(e.target.value as typeof selfOrderMode)}>
                <option value="online_ordering">Online ordering</option>
                <option value="qr_menu">QR menu only</option>
              </Select>
              <Button onClick={saveSelfOrderMode} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />Save
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-cream-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold">JSON setting</h2>
            <div className="space-y-3">
              <Input value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="setting_key" />
              <Textarea value={jsonValue} onChange={(e) => setJsonValue(e.target.value)} className="font-mono text-xs" />
              <Button onClick={saveJsonSetting} disabled={saving || !keyName.trim()}>
                <Save className="mr-2 h-4 w-4" />Save JSON
              </Button>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-cream-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-cream-100 text-xs uppercase text-charcoal/60"><tr><th className="px-4 py-3">Key</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Updated</th></tr></thead>
            <tbody className="divide-y divide-cream-100">
              {loading ? <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">Loading settings...</td></tr> :
                settings.length === 0 ? <tr><td colSpan={3} className="px-4 py-10 text-center text-muted-foreground">No settings configured</td></tr> :
                settings.map((setting) => (
                  <tr key={setting.id}>
                    <td className="px-4 py-3 font-medium">{setting.key}</td>
                    <td className="px-4 py-3"><code className="rounded bg-cream-100 px-2 py-1 text-xs">{JSON.stringify(setting.value)}</code></td>
                    <td className="px-4 py-3">{new Date(setting.updated_at).toLocaleString()}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
