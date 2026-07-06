import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function ReportsPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Reports" />
      </PageContainer>
    </AdminLayout>
  );
}