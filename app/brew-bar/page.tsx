import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Brew Bar" }

export default function BrewBarPage() {
  return (
    <AdminLayout title="Brew Bar">
      <PageContainer>
        <PageHeader title="Brew Bar" description="Kitchen display — track and advance orders" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Brew Bar — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}