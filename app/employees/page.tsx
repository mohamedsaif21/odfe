import type { Metadata } from "next"
import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export const metadata: Metadata = { title: "Employees" }

export default function EmployeesPage() {
  return (
    <AdminLayout title="Employees">
      <PageContainer>
        <PageHeader title="Employees" description="Staff accounts and role management" />
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
          <p className="text-sm text-muted-foreground">Employees — full feature coming in the build plan</p>
        </div>
      </PageContainer>
    </AdminLayout>
  )
}