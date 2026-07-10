import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Categories" }

export default function CategoriesPage() {
  return (
    <AdminLayout title="Categories">
      <PageContainer>
        <PageHeader title="Categories" description="Organise menu items into sections" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Categories — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}