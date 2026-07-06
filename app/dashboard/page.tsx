import { AdminLayout } from "@/components/layout/Admin-layout"
import { PageContainer, PageHeader } from "@/components/layout/page-container"

export default function DashboardPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Dashboard" />
        {/* TODO: Fetch KPI data from Supabase (orders, payments, active tables). */}
      </PageContainer>
    </AdminLayout>
  )
}
