import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Customers" }

export default function CustomersPage() {
  return (
    <AdminLayout title="Customers">
      <PageContainer>
        <PageHeader title="Customers" description="Customer directory and loyalty points" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Customers — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}