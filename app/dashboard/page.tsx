import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Dashboard" }

export default function DashboardPage() {
  return (
    <AdminLayout title="Dashboard">
      <PageContainer>
        <PageHeader title="Dashboard" description="Today's cafe performance at a glance" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Dashboard — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}
