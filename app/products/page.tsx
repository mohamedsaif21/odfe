import { AdminLayout } from "@/components/layout/Admin-layout";
import { PageContainer, PageHeader } from "@/components/layout/page-container";

export default function ProductsPage() {
  return (
    <AdminLayout>
      <PageContainer>
        <PageHeader title="Products" />
      </PageContainer>
    </AdminLayout>
  );
}