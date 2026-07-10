import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Self Order" }

export default function SelfOrderPage() {
  return (
    <AdminLayout title="Self Order">
      <PageContainer>
        <PageHeader title="Self Order" description="Customer self-ordering portal" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Self Order — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}