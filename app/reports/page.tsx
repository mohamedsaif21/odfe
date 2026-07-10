import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Reports" }

export default function ReportsPage() {
  return (
    <AdminLayout title="Reports">
      <PageContainer>
        <PageHeader title="Reports" description="Revenue and performance analytics" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Reports — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}