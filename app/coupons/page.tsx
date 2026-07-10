import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Coupons" }

export default function CouponsPage() {
  return (
    <AdminLayout title="Coupons">
      <PageContainer>
        <PageHeader title="Coupons" description="Discount codes and automatic promotions" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Coupons — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}