import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Payments" }

export default function PaymentsPage() {
  return (
    <AdminLayout title="Payments">
      <PageContainer>
        <PageHeader title="Payments" description="Payment records and methods" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Payments — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}