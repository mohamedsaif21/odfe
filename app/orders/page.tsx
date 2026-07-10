import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Orders" }

export default function OrdersPage() {
  return (
    <AdminLayout title="Orders">
      <PageContainer>
        <PageHeader title="Orders" description="All cafe orders and their current status" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Orders — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}