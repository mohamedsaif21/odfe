import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Customer Display" }

export default function CustomerDisplayPage() {
  return (
    <AdminLayout title="Customer Display">
      <PageContainer>
        <PageHeader title="Customer Display" description="Second-screen billing display" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Customer Display — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}