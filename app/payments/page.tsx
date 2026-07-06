import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function PaymentsPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Payments" />
      </PageContainer>
    </AdminLayout>
  );
}