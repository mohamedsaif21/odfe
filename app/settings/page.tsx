import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <AdminLayout title="Settings">
      <PageContainer>
        <PageHeader title="Settings" description="Cafe configuration and preferences" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Settings — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}