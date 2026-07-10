import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Products" }

export default function ProductsPage() {
  return (
    <AdminLayout title="Products">
      <PageContainer>
        <PageHeader title="Products" description="Manage your cafe menu items" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Products — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}