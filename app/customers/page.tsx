import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function CustomersPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Customers" />
      </PageContainer>
    </AdminLayout>
  );
}