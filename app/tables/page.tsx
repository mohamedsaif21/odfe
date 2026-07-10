import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Tables" }

export default function TablesPage() {
  return (
    <AdminLayout title="Tables">
      <PageContainer>
        <PageHeader title="Tables" description="Manage cafe tables and floor layout" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Tables — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}