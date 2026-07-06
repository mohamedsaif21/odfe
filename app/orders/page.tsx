import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function OrdersPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Orders" />
      </PageContainer>
    </AdminLayout>
  );
}